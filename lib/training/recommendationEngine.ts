import { exerciseLibrary } from '@/lib/data/exercises';
import { stretchLibrary } from '@/lib/data/mobility';
import { calibrationTests, scoringAreas } from '@/lib/training/calibration';
import { mobilityAreasFromWorkoutType, patternsForWorkoutType, recommendWorkoutType, workoutTypeLabels } from '@/lib/training/scheduler';
import type {
  CalibrationResult,
  EquipmentProfile,
  ExerciseLibraryItem,
  ExercisePhase,
  MobilityArea,
  MobilityHistoryItem,
  MobilityScore,
  MobilitySession,
  MobilitySessionMode,
  MobilitySessionStep,
  MovementPattern,
  StretchLibraryItem,
  TrainingGoal,
  TrainingHistoryItem,
  UserFeedback,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from '@/lib/training/types';

export type GenerateWorkoutInput = {
  profile: UserProfile;
  mobilityScores: MobilityScore[];
  history: TrainingHistoryItem[];
  feedback: UserFeedback[];
  library?: ExerciseLibraryItem[];
  generationIndex?: number;
  workoutTypeOverride?: WorkoutSession['workoutType'];
};

export type GenerateMobilityInput = {
  profile: UserProfile;
  mobilityScores: MobilityScore[];
  mode: MobilitySessionMode;
  timeAvailable: number;
  feedback: UserFeedback[];
  history?: TrainingHistoryItem[];
  mobilityHistory?: MobilityHistoryItem[];
  library?: StretchLibraryItem[];
  generationIndex?: number;
};

const patternDefaults: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'core', 'carry', 'rotation', 'conditioning'];
const combatSports = ['mma', 'bjj', 'wrestling'];

type GoalPolicy = {
  allowedGoalTags: TrainingGoal[];
  allowConditioning: boolean;
  allowMmaExercises: boolean;
  allowMmaMobility: boolean;
  maxMmaExercises: number;
};

const goalLabels: Record<TrainingGoal, string> = {
  strength: 'Strength',
  muscle: 'Muscle',
  fat_loss: 'Fat loss',
  athleticism: 'Athleticism',
  mma_bjj: 'MMA/BJJ support',
  mobility: 'Mobility',
  recovery: 'Recovery',
  conditioning: 'Conditioning',
  endurance: 'Endurance',
};

const areaAliases: Record<MobilityArea, string[]> = {
  hips: ['hips', 'hip'],
  ankles: ['ankles', 'ankle', 'calves'],
  hamstrings: ['hamstrings', 'posterior chain'],
  shoulders: ['shoulders', 'shoulder'],
  thoracic_spine: ['thoracic_spine', 'thoracic spine', 'upper back'],
  neck: ['neck'],
  wrists: ['wrists', 'wrist', 'forearms'],
  lower_back: ['lower_back', 'lower back', 'back'],
  adductors: ['adductors', 'groin'],
  hip_flexors: ['hip_flexors', 'hip flexors', 'quads'],
  rotation: ['rotation', 'obliques'],
  knees: ['knees', 'knee', 'quads'],
  elbows: ['elbows', 'elbow', 'triceps', 'biceps'],
  glutes: ['glutes', 'glute'],
  quads: ['quads', 'quad'],
  calves: ['calves', 'calf'],
};

export function defaultEquipmentProfile(): EquipmentProfile {
  return {
    bodyweight: true,
    dumbbells: true,
    gym: false,
    planetFitness: false,
    bands: true,
    pullupBar: false,
    machines: false,
    cables: false,
    barbell: false,
    kettlebells: false,
    medicineBall: false,
    foamRoller: false,
    bench: true,
  };
}

export function equipmentProfileToList(profile: EquipmentProfile): string[] {
  const selected = Object.entries(profile).filter(([, enabled]) => enabled).map(([key]) => key);
  const aliases: Record<string, string[]> = {
    bodyweight: ['bodyweight'],
    dumbbells: ['dumbbell', 'adjustable dumbbells'],
    gym: ['gym equipment', 'machine', 'cable', 'bench', 'bar', 'smith machine', 'sled', 'treadmill', 'stationary bike', 'rowing machine', 'assault bike', 'battle rope'],
    planetFitness: ['planet fitness', 'machine', 'cable', 'smith machine'],
    bands: ['resistance band', 'band'],
    pullupBar: ['pull-up bar'],
    machines: ['machine'],
    cables: ['cable'],
    barbell: ['barbell', 'bar'],
    kettlebells: ['kettlebell'],
    medicineBall: ['medicine ball'],
    foamRoller: ['foam roller'],
    bench: ['bench'],
  };
  return Array.from(new Set(selected.flatMap((item) => aliases[item] ?? [item])));
}

export function calculateMobilityScores(result: CalibrationResult): MobilityScore[] {
  const now = result.completedAt;
  const testByArea = new Map<MobilityArea, number[]>();

  calibrationTests.forEach((test) => {
    const score = result.testScores[test.id] ?? 70;
    const current = testByArea.get(test.area) ?? [];
    testByArea.set(test.area, [...current, score]);
  });

  const deepSquat = result.testScores.deep_squat ?? 70;
  const hipRotation = result.testScores.hip_rotation ?? 70;
  const ankle = result.testScores.ankle_knee_to_wall ?? 70;
  const hamstring = result.testScores.hamstring_reach ?? 70;
  const thoracic = result.testScores.thoracic_rotation ?? 70;
  const shoulder = result.testScores.shoulder_overhead_reach ?? 70;
  const wrist = result.testScores.wrist_extension ?? 70;

  const derived: Partial<Record<MobilityArea, number>> = {
    hips: average([deepSquat, hipRotation]),
    ankles: ankle,
    hamstrings: hamstring,
    shoulders: shoulder,
    thoracic_spine: thoracic,
    neck: average([thoracic, shoulder]),
    wrists: wrist,
    lower_back: average([deepSquat, hamstring, thoracic]),
    adductors: average([deepSquat, hipRotation]),
    hip_flexors: average([deepSquat, hipRotation]),
    rotation: average([hipRotation, thoracic]),
  };

  return scoringAreas.map((area) => ({
    area,
    score: clamp(Math.round(average([...(testByArea.get(area) ?? []), derived[area] ?? 70])), 1, 100),
    updatedAt: now,
    source: 'calibration',
  }));
}

export function updateScoresFromFeedback(scores: MobilityScore[], feedback: UserFeedback): MobilityScore[] {
  const now = feedback.createdAt;
  return scores.map((score) => {
    const touched = feedback.painAreas.includes(score.area);
    let adjustment = 0;

    if (feedback.sessionType === 'mobility' && feedback.completed && !feedback.pain && feedback.rpe <= 7) adjustment += 2;
    if (feedback.sessionType === 'workout' && feedback.rpe >= 9) adjustment -= 1;
    if (feedback.pain && touched) adjustment -= 8;
    if (feedback.formQuality === 'poor' && touched) adjustment -= 4;

    return {
      ...score,
      score: clamp(score.score + adjustment, 1, 100),
      updatedAt: adjustment ? now : score.updatedAt,
      source: adjustment ? 'feedback' : score.source,
    };
  });
}

export function generateWorkoutPlan(input: GenerateWorkoutInput): WorkoutSession {
  const library = input.library?.length ? input.library : exerciseLibrary;
  const safeEquipment = input.profile.equipment.length ? input.profile.equipment : ['bodyweight'];
  const generationIndex = Math.max(0, input.generationIndex ?? 0);
  const recommendation = recommendWorkoutType(input.profile, input.history, input.feedback);
  if (input.workoutTypeOverride) {
    recommendation.workoutType = input.workoutTypeOverride;
    recommendation.reason = `Generated a requested ${workoutTypeLabels[input.workoutTypeOverride]} session while preserving equipment, recovery, and progression rules.`;
  }
  const overtrained = preventOvertraining(input.history);
  const difficulty = adjustDifficulty(input.profile, input.feedback);
  const recentFeedback = input.feedback.slice(0, 3);
  const painAreas = Array.from(new Set([...input.profile.painAreas, ...recentFeedback.flatMap((item) => item.painAreas)]));
  const injuryText = (input.profile.injuryLimitations ?? []).join(' ').toLowerCase();
  const policy = getGoalPolicy(input.profile);
  const scheduledPatterns = patternsForWorkoutType(recommendation.workoutType, input.profile.goal, input.profile.combatSchedule);
  const targetPatterns = policy.allowConditioning
    ? scheduledPatterns
    : scheduledPatterns.filter((pattern) => pattern !== 'conditioning');
  const readinessPenalty = input.profile.readinessLevel < 55 || input.profile.sorenessLevel > 7;
  const recoveryDay = recommendation.workoutType === 'recovery' || recommendation.workoutType === 'mobility_only';
  const restDay = recommendation.workoutType === 'rest';
  const durationMinutes = normalizeDuration(input.profile.workoutLength);
  const count = restDay ? 0 : recoveryDay ? Math.min(5, workoutExerciseCount(durationMinutes)) : workoutExerciseCount(durationMinutes);
  const intensity = getWorkoutIntensity(input.profile, recommendation.workoutType, input.feedback);
  // Eligibility is a hard gate. Scoring and regeneration can only work inside this goal/split-safe pool.
  const eligibleLibrary = library
    .filter((item) => hasEquipment(item.equipment, safeEquipment))
    .filter((item) => isExerciseEligible(item, input.profile, recommendation.workoutType, difficulty, painAreas, injuryText, policy));
  const scored = eligibleLibrary
    .map((item) => ({
      item,
      score: scoreExercise(item, {
        goal: input.profile.goal,
        targetPatterns,
        painAreas,
        overtrained,
        difficulty,
        readinessPenalty,
        history: input.history,
        injuryText,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

  const chosen: { item: ExerciseLibraryItem; phase: ExercisePhase }[] = [];
  const phases = restDay ? [] : workoutPhasePlan(count, recoveryDay, policy.allowConditioning);

  // Regeneration rotates through the best-scoring candidates inside each required phase instead of randomizing the plan.
  phases.forEach((phase, index) => {
    const phaseIndex = phases.slice(0, index).filter((item) => item === phase).length;
    const wanted = wantedPatternForPhase(phase, targetPatterns, phaseIndex, recommendation.workoutType);
    const mmaCount = chosen.filter((picked) => picked.item.isMmaSpecific).length;
    const pool = scored
      .filter(({ item }) => !chosen.some((picked) => picked.item.id === item.id))
      .filter(({ item }) => !item.isMmaSpecific || mmaCount < policy.maxMmaExercises);
    const preferred = pool.filter(({ item }) => phaseMatches(item, phase, wanted));
    const fallback = pool.filter(({ item }) => fallbackPhaseMatches(item, phase, wanted));
    const candidates = (preferred.length ? preferred : fallback).slice(0, 6);
    const picked = candidates.length ? candidates[(generationIndex + index) % candidates.length].item : undefined;
    if (picked) chosen.push({ item: prepareExerciseForEquipment(picked, safeEquipment), phase });
  });

  const exercises = chosen.map(({ item, phase }): WorkoutExercise =>
    prescribeExercise(item, phase, input.profile, difficulty, recentFeedback, input.history.length, recoveryDay));

  const mobilitySteps = generateMobilityPlan({
    profile: input.profile,
    mobilityScores: input.mobilityScores,
    mode: recoveryDay || restDay ? 'recovery_day' : 'post_workout',
    timeAvailable: recoveryDay || restDay ? input.profile.mobilityMinutes : Math.min(8, Math.max(4, Math.round(input.profile.workoutLength * 0.15))),
    feedback: input.feedback,
    history: input.history,
    mobilityHistory: [],
    generationIndex,
  }).steps.slice(0, 3);

  const patternBalance = summarizePatterns(exercises.map((item) => item.item));
  const lowered = difficulty === 'beginner' || readinessPenalty || painAreas.length > 0;

  return {
    id: `workout-${Date.now()}`,
    title: `${workoutTypeLabels[recommendation.workoutType]} ${goalLabels[input.profile.goal]} session`,
    focus: targetPatterns.slice(0, 4).join(' / '),
    workoutType: recommendation.workoutType,
    durationMinutes: restDay ? 0 : recoveryDay ? Math.min(durationMinutes, 30) : durationMinutes,
    intensity,
    readinessAdjustment: readinessPenalty
      ? 'Volume and intensity reduced because soreness/readiness is not ideal.'
      : 'Normal adaptive volume based on current readiness.',
    recommendationReason: recommendation.reason,
    missedDays: recommendation.missedDays,
    planLabel: recommendation.planLabel,
    safetyNote: lowered
      ? 'Pain or low readiness detected: use clean reps, stop sharp pain, and swap anything that feels wrong.'
      : 'No max effort required today. Keep 1-3 reps in reserve unless a coach tells you otherwise.',
    limitedMatchMessage: exercises.length < count
      ? `Limited matching exercises for this goal, split, equipment, and recovery level. The session was reduced to ${exercises.length} safe matches.`
      : '',
    patternBalance,
    exercises,
    mobilitySteps,
    generationIndex,
  };
}

export function generateMobilityPlan(input: GenerateMobilityInput): MobilitySession {
  const library = input.library?.length ? input.library : stretchLibrary;
  const time = normalizeDuration(input.timeAvailable);
  const generationIndex = Math.max(0, input.generationIndex ?? 0);
  const targetAreas = chooseMobilityTargets(input.profile, input.mobilityScores, input.mode, input.feedback, input.history ?? []);
  const completedMobilityCount = input.mobilityHistory?.length ?? 0;
  const stepCount = mobilityStepCount(time);
  const progressionBonus = completedMobilityCount >= 10 ? 15 : completedMobilityCount >= 4 ? 8 : 0;
  const seconds = clamp(35 + Math.round(time / 2) + progressionBonus, 35, 90);
  const sets = completedMobilityCount >= 12 && time >= 30 ? 2 : 1;
  const phases = mobilityPhasePlan(input.mode, stepCount, input.profile.equipment);
  const used = new Set<string>();
  const recentDrillIds = new Set((input.mobilityHistory ?? []).slice(0, 3).flatMap((entry) => entry.drillIds));
  const injuryText = (input.profile.injuryLimitations ?? []).join(' ').toLowerCase();
  const policy = getGoalPolicy(input.profile);
  const eligibleLibrary = library
    .filter((item) => hasEquipment(item.equipment, input.profile.equipment))
    .filter((item) => !(input.profile.experienceLevel === 'beginner' && item.difficulty === 'advanced'))
    .filter((item) => !isStretchBlockedByInjury(item, injuryText))
    .filter((item) => !item.isMmaSpecific || policy.allowMmaMobility);

  // Recent drills receive a repeat penalty, while tight or sore target areas can still justify a needed repeat.
  const steps = phases.map((phase, index): MobilitySessionStep | null => {
    const available = eligibleLibrary
      .filter((item) => !used.has(item.id))
      .filter((item) => phase === 'breathing' ? item.phase === 'breathing' : item.phase === phase);
    const fallback = eligibleLibrary
      .filter((item) => !used.has(item.id))
      .filter((item) => mobilityPhaseMatches(item, phase));
    const pool = (available.length ? available : fallback)
      .map((item) => ({
        item,
        score: scoreStretch(item, phase, targetAreas, input.profile, input.feedback, index, recentDrillIds),
      }))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

    const candidates = pool.slice(0, 7);
    const picked = candidates.length ? candidates[(generationIndex + index) % candidates.length].item : undefined;
    if (!picked) return null;
    used.add(picked.id);

    return {
      item: prepareStretchForEquipment(picked, input.profile.equipment),
      phase,
      seconds: phase === 'breathing' ? Math.max(60, seconds) : seconds,
      sets,
      reps: phase === 'dynamic' ? (completedMobilityCount >= 8 ? '8 per side' : '6 per side') : undefined,
      reason: `${labelAreaList(intersectAreas(picked.bodyAreas, targetAreas)) || 'general reset'} for ${input.mode.replace('_', ' ')}`,
    };
  }).filter(Boolean) as MobilitySessionStep[];

  return {
    id: `mobility-${Date.now()}`,
    title: `${input.mode === 'pre_workout' ? 'Pre-training' : input.mode === 'post_workout' ? 'Post-training' : 'Recovery'} mobility`,
    mode: input.mode,
    durationMinutes: time,
    targetAreas,
    scoreSummary: summarizeScoreTargets(input.mobilityScores, targetAreas),
    steps,
    recommendationReason: `Targets ${labelAreaList(targetAreas.slice(0, 4))} from tight areas, scores, and recent workouts${policy.allowMmaMobility ? ', with MMA/BJJ needs included' : ''}.`,
    progressionNote: completedMobilityCount >= 10
      ? 'Progression: longer holds, extra sets, and harder active variations where control is strong.'
      : completedMobilityCount >= 4
        ? 'Progression: small hold increase on familiar drills.'
        : 'Progression: base holds until the positions feel smooth.',
    generationIndex,
  };
}

export function chooseExerciseSubstitutions(
  exercise: ExerciseLibraryItem,
  equipment: string[],
  painAreas: MobilityArea[],
  library: ExerciseLibraryItem[] = exerciseLibrary,
) {
  return library
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) =>
      exercise.substitutions.includes(candidate.id)
      || exercise.substitutions.includes(candidate.name)
      || candidate.movementPattern === exercise.movementPattern
      || candidate.musclesWorked.some((muscle) => exercise.musclesWorked.includes(muscle)),
    )
    .filter((candidate) => hasEquipment(candidate.equipment, equipment))
    .filter((candidate) => !candidate.avoidWithPain?.some((area) => painAreas.includes(area)))
    .sort((left, right) => substitutionScore(right, exercise) - substitutionScore(left, exercise))
    .slice(0, 6)
    .map((candidate) => prepareExerciseForEquipment(candidate, equipment));
}

export function preventOvertraining(history: TrainingHistoryItem[]) {
  const recent = history.slice(0, 6);
  const muscles = new Set<string>();
  const patterns = new Set<MovementPattern>();

  recent.forEach((session, index) => {
    const penaltyWindow = index < 3 || hoursSince(session.completedAt) < 54;
    if (!penaltyWindow) return;
    session.muscles.forEach((muscle) => muscles.add(muscle.toLowerCase()));
    session.movementPatterns.forEach((pattern) => patterns.add(pattern));
  });

  return { muscles, patterns };
}

export function adjustDifficulty(profile: UserProfile, feedback: UserFeedback[]) {
  const latest = feedback.slice(0, 2);
  const pain = latest.some((item) => item.pain || item.formQuality === 'poor');
  const easy = latest.length >= 2 && latest.every((item) => item.completed && !item.pain && item.rpe <= 6);

  if (pain || profile.readinessLevel < 45 || profile.sorenessLevel >= 8) return 'beginner';
  if (easy && (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'competitive')) return 'advanced';
  if (profile.experienceLevel === 'beginner') return 'beginner';
  if (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'competitive') return 'advanced';
  return 'intermediate';
}

function getGoalPolicy(profile: UserProfile): GoalPolicy {
  const combatPlan = profile.trainingPlan === 'hybrid' || profile.trainingPlan === 'mma_bjj_athletic';

  if (profile.goal === 'recovery') {
    return {
      allowedGoalTags: ['recovery', 'mobility'],
      allowConditioning: false,
      allowMmaExercises: false,
      allowMmaMobility: false,
      maxMmaExercises: 0,
    };
  }

  if (profile.goal === 'mobility') {
    return {
      allowedGoalTags: ['mobility', 'recovery'],
      allowConditioning: false,
      allowMmaExercises: combatPlan,
      allowMmaMobility: combatPlan,
      maxMmaExercises: combatPlan ? 2 : 0,
    };
  }

  if (profile.goal === 'mma_bjj') {
    return {
      allowedGoalTags: ['mma_bjj', 'athleticism', 'strength', 'conditioning', 'mobility'],
      allowConditioning: true,
      allowMmaExercises: true,
      allowMmaMobility: true,
      maxMmaExercises: 3,
    };
  }

  if (profile.goal === 'athleticism') {
    return {
      allowedGoalTags: ['athleticism', 'strength', 'conditioning'],
      allowConditioning: true,
      allowMmaExercises: true,
      allowMmaMobility: true,
      maxMmaExercises: 2,
    };
  }

  if (profile.goal === 'conditioning') {
    return {
      allowedGoalTags: ['conditioning', 'endurance', 'fat_loss', 'athleticism'],
      allowConditioning: true,
      allowMmaExercises: true,
      allowMmaMobility: false,
      maxMmaExercises: 2,
    };
  }

  if (profile.goal === 'fat_loss') {
    return {
      allowedGoalTags: combatPlan
        ? ['fat_loss', 'conditioning', 'athleticism', 'mma_bjj']
        : ['fat_loss', 'conditioning'],
      allowConditioning: true,
      allowMmaExercises: combatPlan,
      allowMmaMobility: combatPlan,
      maxMmaExercises: combatPlan ? 2 : 0,
    };
  }

  if (profile.goal === 'endurance') {
    return {
      allowedGoalTags: combatPlan
        ? ['endurance', 'conditioning', 'fat_loss', 'athleticism', 'mma_bjj']
        : ['endurance', 'conditioning', 'fat_loss'],
      allowConditioning: true,
      allowMmaExercises: combatPlan,
      allowMmaMobility: combatPlan,
      maxMmaExercises: combatPlan ? 2 : 0,
    };
  }

  const primaryGoal: TrainingGoal = profile.goal === 'muscle' ? 'muscle' : 'strength';
  return {
    allowedGoalTags: combatPlan
      ? [primaryGoal, 'strength', 'athleticism', 'conditioning', 'mma_bjj']
      : [primaryGoal],
    allowConditioning: combatPlan,
    allowMmaExercises: combatPlan,
    allowMmaMobility: combatPlan,
    maxMmaExercises: combatPlan ? 3 : 0,
  };
}

function isExerciseEligible(
  item: ExerciseLibraryItem,
  profile: UserProfile,
  workoutType: WorkoutSession['workoutType'],
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  painAreas: MobilityArea[],
  injuryText: string,
  policy: GoalPolicy,
) {
  if (workoutType === 'rest') return false;
  if (difficulty === 'beginner' && item.difficulty === 'advanced') return false;
  if (isBlockedByInjury(item, painAreas, injuryText)) return false;
  if (item.isMmaSpecific && !policy.allowMmaExercises) return false;
  if (item.isConditioning && !policy.allowConditioning && !item.goalTags.includes('recovery')) return false;

  const recoveryLimited = profile.sorenessLevel >= 8 || profile.readinessLevel < 50;
  if (recoveryLimited && item.intensity === 'hard') return false;

  const recoverySession = workoutType === 'recovery' || workoutType === 'mobility_only' || profile.goal === 'recovery';
  if (recoverySession) {
    const recoveryMovement = ['core', 'mobility'].includes(item.movementPattern)
      || (item.isConditioning && item.goalTags.includes('recovery'));
    const recoveryTag = item.goalTags.some((goal) => goal === 'recovery' || goal === 'mobility');
    return item.intensity === 'easy'
      && !item.isMmaSpecific
      && !item.isMainLift
      && (recoveryMovement || recoveryTag);
  }

  if (profile.goal === 'mobility') {
    const mobilitySafe = item.goalTags.includes('mobility') || ['core', 'mobility'].includes(item.movementPattern);
    return mobilitySafe && item.intensity !== 'hard' && !item.isConditioning;
  }

  if (!item.goalTags.some((goal) => policy.allowedGoalTags.includes(goal))) return false;

  if (workoutType === 'mma_bjj' || workoutType === 'full_body') return true;
  if (item.workoutTypes.includes('core') || item.movementPattern === 'mobility') return true;
  if (policy.allowConditioning && ['conditioning', 'power'].includes(item.movementPattern)) return true;

  const splitType = workoutType === 'legs' ? 'legs' : workoutType;
  return item.workoutTypes.includes(splitType as ExerciseLibraryItem['workoutTypes'][number]);
}

function scoreExercise(
  item: ExerciseLibraryItem,
  context: {
    goal: TrainingGoal;
    targetPatterns: MovementPattern[];
    painAreas: MobilityArea[];
    overtrained: ReturnType<typeof preventOvertraining>;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    readinessPenalty: boolean;
      history: TrainingHistoryItem[];
      injuryText: string;
  },
) {
  let score = 20;
  if (item.goalTags.includes(context.goal)) score += 35;
  if (context.targetPatterns.includes(item.movementPattern)) score += 28;
  if (context.goal === 'mma_bjj' && item.sportTags.some((tag) => combatSports.includes(tag))) score += 24;
  if (context.goal === 'mma_bjj' && item.isMmaSpecific) score += 30;
  if (context.goal === 'endurance' && item.movementPattern === 'conditioning') score += 22;
  if (context.goal === 'athleticism' && ['power', 'carry', 'rotation', 'conditioning'].includes(item.movementPattern)) score += 18;
  if (item.difficulty === context.difficulty) score += 12;
  if (context.difficulty === 'beginner' && item.difficulty === 'advanced') score -= 38;
  if (context.readinessPenalty && ['advanced', 'conditioning', 'power'].includes(item.difficulty === 'advanced' ? 'advanced' : item.movementPattern)) score -= 22;
  if (item.avoidWithPain?.some((area) => context.painAreas.includes(area))) score -= 55;
  if (context.overtrained.patterns.has(item.movementPattern)) score -= 14;
  if (item.musclesWorked.some((muscle) => context.overtrained.muscles.has(muscle.toLowerCase()))) score -= 18;
  score -= context.history.slice(0, 4).filter((session) => session.movementPatterns.includes(item.movementPattern)).length * 3;
  if (context.history.slice(0, 3).some((session) => session.exerciseIds?.includes(item.id))) score -= 42;
  if (context.injuryText && item.injuryWarnings.some((warning) => context.injuryText.split(/\s+/).some((word) => word.length > 4 && warning.toLowerCase().includes(word)))) score -= 80;
  return score;
}

function scoreStretch(
  item: StretchLibraryItem,
  phase: StretchLibraryItem['phase'],
  targetAreas: MobilityArea[],
  profile: UserProfile,
  feedback: UserFeedback[],
  index: number,
  recentDrillIds: Set<string>,
) {
  let score = item.phase === phase ? 40 : 8;
  score += intersectAreas(item.bodyAreas, targetAreas).length * 30;
  if (profile.goal === 'mma_bjj' && item.sportTags.some((tag) => combatSports.includes(tag))) score += 12;
  if ([...profile.painAreas, ...(profile.tightAreas ?? [])].some((area) => item.bodyAreas.includes(area))) score += 10;
  if (feedback.slice(-3).some((itemFeedback) => itemFeedback.pain && intersectAreas(item.bodyAreas, itemFeedback.painAreas).length)) {
    score += phase === 'breathing' || phase === 'static' ? 12 : -8;
  }
  if (recentDrillIds.has(item.id)) {
    const neededRepeat = profile.sorenessLevel >= 8 || profile.painAreas.some((area) => item.bodyAreas.includes(area));
    score -= neededRepeat ? 12 : 48;
  }
  score -= index;
  return score;
}

function choosePatternPlan(goal: TrainingGoal, combatSchedule: UserProfile['combatSchedule']): MovementPattern[] {
  const combatLoad = combatSchedule.mma + combatSchedule.bjj + combatSchedule.wrestling + combatSchedule.striking;
  if (goal === 'strength') return ['squat', 'hinge', 'push', 'pull', 'core', 'carry'];
  if (goal === 'muscle') return ['push', 'pull', 'squat', 'hinge', 'core', 'carry'];
  if (goal === 'fat_loss') return ['conditioning', 'squat', 'push', 'pull', 'hinge', 'core', 'carry'];
  if (goal === 'conditioning') return ['conditioning', 'carry', 'core', 'squat', 'hinge', 'push', 'pull'];
  if (goal === 'endurance') return ['conditioning', 'carry', 'core', 'squat', 'pull', 'push'];
  if (goal === 'mobility') return ['core', 'squat', 'hinge', 'rotation', 'push', 'pull'];
  if (goal === 'mma_bjj' || combatLoad > 1) return ['power', 'rotation', 'pull', 'hinge', 'core', 'conditioning', 'push', 'squat'];
  return ['power', 'squat', 'hinge', 'push', 'pull', 'carry', 'rotation', 'conditioning'];
}

function wantedPatternForPhase(
  phase: ExercisePhase,
  patterns: MovementPattern[],
  index: number,
  workoutType: WorkoutSession['workoutType'],
): MovementPattern[] {
  const mainBySplit: Partial<Record<WorkoutSession['workoutType'], MovementPattern[]>> = {
    push: ['push'],
    pull: ['pull'],
    legs: ['squat', 'hinge', 'lunge'],
    upper: ['push', 'pull'],
    lower: ['squat', 'hinge', 'lunge'],
    full_body: ['squat', 'push', 'pull', 'hinge', 'lunge'],
    mma_bjj: ['power', 'pull', 'hinge', 'rotation'],
    mobility_only: ['core', 'mobility'],
    recovery: ['core', 'mobility'],
  };
  const mainPatterns = mainBySplit[workoutType]
    ?? patterns.filter((pattern) => !['conditioning', 'core', 'mobility'].includes(pattern));
  const safeMainPatterns: MovementPattern[] = mainPatterns.length ? mainPatterns : ['core'];

  if (phase === 'warmup') return Array.from(new Set<MovementPattern>([safeMainPatterns[index % safeMainPatterns.length], 'core', 'mobility']));
  if (phase === 'main') return [safeMainPatterns[index % safeMainPatterns.length]];
  if (phase === 'accessory') {
    const accessoryPatterns = Array.from(new Set<MovementPattern>([
      ...patterns.filter((pattern) => ['core', 'carry', 'rotation'].includes(pattern)),
      ...safeMainPatterns,
    ]));
    return [accessoryPatterns[index % accessoryPatterns.length]];
  }
  if (phase === 'conditioning') return ['conditioning', 'carry', 'rotation', 'power'];
  if (phase === 'cooldown' || phase === 'mobility') return ['core', 'mobility'];
  return [patterns[index % patterns.length]];
}

function phaseMatches(item: ExerciseLibraryItem, phase: ExercisePhase, wanted: MovementPattern[]) {
  if (phase === 'warmup') {
    return item.intensity === 'easy'
      && !item.isConditioning
      && wanted.includes(item.movementPattern);
  }
  if (phase === 'main') {
    return wanted.includes(item.movementPattern)
      && (item.isMainLift || item.movementPattern === 'power');
  }
  if (phase === 'accessory') {
    return wanted.includes(item.movementPattern)
      && (item.isAccessory || ['core', 'carry', 'rotation'].includes(item.movementPattern));
  }
  if (phase === 'conditioning') return item.isConditioning || item.movementPattern === 'conditioning';
  if (phase === 'cooldown' || phase === 'mobility') {
    return item.intensity === 'easy' && ['core', 'mobility'].includes(item.movementPattern);
  }
  return false;
}

function fallbackPhaseMatches(item: ExerciseLibraryItem, phase: ExercisePhase, wanted: MovementPattern[]) {
  if (phase === 'warmup') return item.intensity === 'easy' && !item.isConditioning;
  if (phase === 'main') return item.isMainLift || (wanted.includes(item.movementPattern) && item.movementPattern === 'power');
  if (phase === 'accessory') {
    return item.isAccessory
      || ['core', 'carry', 'rotation'].includes(item.movementPattern)
      || (!item.isMainLift && !item.isConditioning);
  }
  if (phase === 'conditioning') return item.isConditioning || ['conditioning', 'carry', 'power'].includes(item.movementPattern);
  if (phase === 'cooldown' || phase === 'mobility') {
    return item.intensity === 'easy'
      && !item.isConditioning
      && (item.isAccessory || ['core', 'mobility'].includes(item.movementPattern));
  }
  return false;
}

function prescribeExercise(
  item: ExerciseLibraryItem,
  phase: ExercisePhase,
  profile: UserProfile,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  feedback: UserFeedback[],
  completedWorkoutCount: number,
  recoveryDay: boolean,
): WorkoutExercise {
  // Successful completed sessions gradually add volume or reduce rest; pain and poor recovery immediately regress it.
  const latest = feedback.slice(0, 2);
  const lowered = difficulty === 'beginner' || profile.readinessLevel < 55 || profile.sorenessLevel >= 8 || latest.some((entry) => entry.pain);
  const progressed = completedWorkoutCount >= 3 && latest.length >= 2 && latest.every((entry) => entry.completed && !entry.pain && entry.rpe <= 7);
  const mainLift = phase === 'main';
  const conditioning = phase === 'conditioning' || item.isConditioning;
  const warmupOrCooldown = ['warmup', 'cooldown', 'mobility'].includes(phase);
  const hybridStrength = profile.trainingPlan === 'hybrid' && ['strength', 'muscle'].includes(profile.goal);

  let sets = lowered ? 2 : 3;
  let reps: string | undefined = '8-12';
  let timeSeconds: number | undefined;
  let restSeconds = lowered ? 75 : 60;

  if (recoveryDay || profile.goal === 'recovery' || profile.goal === 'mobility') {
    sets = lowered ? 1 : 2;
    reps = conditioning ? undefined : '6-10 controlled';
    timeSeconds = conditioning ? (lowered ? 20 : 30) : undefined;
    restSeconds = 45;
  } else if (hybridStrength) {
    sets = mainLift ? (progressed ? 5 : 4) : 3;
    reps = conditioning ? undefined : mainLift ? '4-8' : '8-12';
    timeSeconds = conditioning ? (lowered ? 25 : progressed ? 50 : 40) : undefined;
    restSeconds = conditioning ? (progressed ? 35 : 45) : mainLift ? (progressed ? 105 : 120) : 60;
  } else if (profile.goal === 'strength') {
    sets = mainLift ? (lowered ? 3 : progressed ? 5 : 4) : 3;
    reps = mainLift ? (item.movementPattern === 'power' ? '3-5' : '3-6') : '6-12';
    restSeconds = mainLift ? (lowered ? 90 : progressed ? 150 : 120) : 75;
  } else if (profile.goal === 'muscle') {
    sets = lowered ? 3 : progressed ? 4 : 3;
    reps = '8-15';
    restSeconds = mainLift ? 90 : 60;
  } else if (profile.goal === 'fat_loss') {
    sets = lowered ? 2 : progressed ? 4 : 3;
    reps = conditioning ? undefined : '12-20';
    timeSeconds = conditioning ? (lowered ? 25 : progressed ? 50 : 40) : undefined;
    restSeconds = conditioning ? (lowered ? 45 : progressed ? 20 : 30) : 40;
  } else if (profile.goal === 'conditioning' || profile.goal === 'endurance') {
    sets = lowered ? 2 : progressed ? 4 : 3;
    reps = conditioning ? undefined : '10-15';
    timeSeconds = conditioning ? (lowered ? 30 : progressed ? 60 : 45) : undefined;
    restSeconds = conditioning ? (lowered ? 60 : progressed ? 25 : 40) : 45;
  } else {
    sets = lowered ? 2 : progressed && mainLift ? 4 : 3;
    reps = conditioning ? undefined : item.movementPattern === 'power' ? '3-5' : mainLift ? '5-10' : '8-15';
    timeSeconds = conditioning ? (lowered ? 25 : progressed ? 50 : 40) : undefined;
    restSeconds = conditioning ? (lowered ? 75 : progressed ? 35 : 45) : mainLift ? (progressed ? 90 : 105) : 60;
  }

  if (warmupOrCooldown && !recoveryDay) {
    sets = lowered ? 1 : 2;
    reps = item.movementPattern === 'mobility' ? undefined : '6-10 controlled';
    timeSeconds = item.movementPattern === 'mobility' ? (lowered ? 25 : 40) : undefined;
    restSeconds = Math.min(restSeconds, 45);
  }

  return {
    item,
    phase,
    sets,
    reps,
    timeSeconds,
    restSeconds,
    rpeTarget: lowered ? 'RPE 5-6' : progressed ? 'RPE 7-8' : 'RPE 6-7',
    reason: reasonForExercise(item, profile),
    progression: progressed
      ? 'Progression: add a set, add 1-2 reps, or choose the next harder variation if form stays clean.'
      : lowered
        ? 'Adjustment: reduce load/range and use an easier substitution if pain or form breaks down.'
        : 'Progression: repeat this target until it feels smooth, then add reps or load.',
  };
}

function chooseMobilityTargets(
  profile: UserProfile,
  scores: MobilityScore[],
  mode: MobilitySessionMode,
  feedback: UserFeedback[],
  history: TrainingHistoryItem[] = [],
) {
  const painTargets = profile.painAreas.filter((area) => scoringAreas.includes(area));
  const tightTargets = (profile.tightAreas ?? []).filter((area) => scoringAreas.includes(area));
  const feedbackPain = feedback.slice(0, 3).flatMap((item) => item.painAreas).filter((area) => scoringAreas.includes(area));
  const weak = [...scores].sort((a, b) => a.score - b.score).slice(0, mode === 'recovery_day' ? 4 : 3).map((item) => item.area);
  const recentWorkoutAreas = mobilityAreasFromWorkoutType(history.find((entry) => entry.workoutType)?.workoutType);
  const sportNeeds: MobilityArea[] = profile.goal === 'mma_bjj'
    ? ['hips', 'thoracic_spine', 'ankles', 'shoulders', 'adductors', 'rotation']
    : ['hips', 'hamstrings', 'shoulders', 'thoracic_spine'];

  return Array.from(new Set([...painTargets, ...tightTargets, ...feedbackPain, ...recentWorkoutAreas, ...weak, ...sportNeeds])).slice(0, 7);
}

function mobilityPhasePlan(mode: MobilitySessionMode, count: number, equipment: string[]) {
  const phases: StretchLibraryItem['phase'][] = [];
  if (mode === 'recovery_day') phases.push('breathing');
  phases.push('dynamic');
  if (count >= 6) phases.push('dynamic');
  if (equipment.map(normalizeEquipment).includes('foam roller') && count >= 8) phases.push('foam_roll');
  while (phases.length < count - 2) phases.push(mode === 'pre_workout' ? 'main' : phases.length % 3 === 0 ? 'static' : 'main');
  phases.push(mode === 'pre_workout' ? 'static' : 'static');
  phases.push('breathing');
  return phases.slice(0, count);
}

function mobilityPhaseMatches(item: StretchLibraryItem, phase: StretchLibraryItem['phase']) {
  if (phase === 'breathing') return item.phase === 'breathing';
  if (phase === 'foam_roll') return item.phase === 'foam_roll' || item.phase === 'main';
  if (phase === 'dynamic') return item.phase === 'dynamic' || item.phase === 'main';
  if (phase === 'main') return item.phase === 'main' || item.phase === 'dynamic' || item.phase === 'static';
  return item.phase === 'static' || item.phase === 'main';
}

function reasonForExercise(item: ExerciseLibraryItem, profile: UserProfile) {
  const goal = goalLabels[profile.goal].toLowerCase();
  if (profile.painAreas.some((area) => item.avoidWithPain?.includes(area))) return 'Selected only if pain-free; swap immediately if it irritates your current pain area.';
  if (profile.goal === 'mma_bjj' && item.sportTags.some((tag) => combatSports.includes(tag))) return `Supports ${goal} with ${item.movementPattern} carryover.`;
  return `Matches ${goal}, available equipment, and ${item.movementPattern} balance.`;
}

function summarizePatterns(items: ExerciseLibraryItem[]) {
  const summary = Object.fromEntries(patternDefaults.map((pattern) => [pattern, 0])) as Record<MovementPattern, number>;
  items.forEach((item) => {
    summary[item.movementPattern] = (summary[item.movementPattern] ?? 0) + 1;
  });
  return summary;
}

function summarizeScoreTargets(scores: MobilityScore[], targets: MobilityArea[]) {
  const selected = scores.filter((score) => targets.includes(score.area)).sort((a, b) => a.score - b.score).slice(0, 3);
  if (!selected.length) return 'No calibration yet, using sport needs and default recovery priorities.';
  return `Weakest: ${selected.map((score) => `${formatArea(score.area)} ${score.score}`).join(', ')}`;
}

function hasEquipment(required: string[], selected: string[]) {
  const req = required.map(normalizeEquipment);
  const own = selected.map(normalizeEquipment);
  if (!req.length || req.includes('bodyweight')) return true;
  return req.some((item) => own.includes(item));
}

function normalizeDuration(value: number) {
  const choices = [10, 20, 30, 45, 60];
  return choices.reduce((closest, option) => Math.abs(option - value) < Math.abs(closest - value) ? option : closest, choices[0]);
}

function workoutExerciseCount(minutes: number) {
  if (minutes <= 10) return 4;
  if (minutes <= 20) return 6;
  if (minutes <= 30) return 8;
  if (minutes <= 45) return 10;
  return 12;
}

function mobilityStepCount(minutes: number) {
  if (minutes <= 10) return 5;
  if (minutes <= 20) return 8;
  if (minutes <= 30) return 10;
  if (minutes <= 45) return 12;
  return 15;
}

function workoutPhasePlan(count: number, recoveryDay: boolean, allowConditioning: boolean): ExercisePhase[] {
  if (recoveryDay) return (['warmup', 'mobility', 'mobility', 'cooldown', 'cooldown'] as ExercisePhase[]).slice(0, count);
  if (count <= 4) return allowConditioning
    ? ['warmup', 'main', 'conditioning', 'cooldown']
    : ['warmup', 'main', 'accessory', 'cooldown'];
  if (count <= 6) return allowConditioning
    ? ['warmup', 'main', 'main', 'accessory', 'conditioning', 'cooldown']
    : ['warmup', 'main', 'main', 'accessory', 'accessory', 'cooldown'];
  if (count <= 8) return allowConditioning
    ? ['warmup', 'warmup', 'main', 'main', 'accessory', 'accessory', 'conditioning', 'cooldown']
    : ['warmup', 'warmup', 'main', 'main', 'main', 'accessory', 'accessory', 'cooldown'];
  if (count <= 10) return allowConditioning
    ? ['warmup', 'warmup', 'main', 'main', 'main', 'accessory', 'accessory', 'conditioning', 'cooldown', 'mobility']
    : ['warmup', 'warmup', 'main', 'main', 'main', 'main', 'accessory', 'accessory', 'cooldown', 'mobility'];
  return allowConditioning
    ? ['warmup', 'warmup', 'main', 'main', 'main', 'main', 'accessory', 'accessory', 'accessory', 'conditioning', 'cooldown', 'mobility']
    : ['warmup', 'warmup', 'main', 'main', 'main', 'main', 'main', 'accessory', 'accessory', 'accessory', 'cooldown', 'mobility'];
}

function getWorkoutIntensity(profile: UserProfile, workoutType: WorkoutSession['workoutType'], feedback: UserFeedback[]) {
  if (['rest', 'recovery', 'mobility_only'].includes(workoutType) || profile.sorenessLevel >= 8 || profile.readinessLevel < 50 || feedback.slice(0, 2).some((entry) => entry.pain)) return 'easy' as const;
  if (profile.readinessLevel >= 78 && profile.sorenessLevel <= 3 && profile.experienceLevel !== 'beginner') return 'hard' as const;
  return 'medium' as const;
}

function isBlockedByInjury(item: ExerciseLibraryItem, painAreas: MobilityArea[], injuryText: string) {
  if (item.avoidWithPain?.some((area) => painAreas.includes(area))) return true;
  if (!injuryText) return false;
  const keywords = [...(item.avoidWithPain ?? []).map(formatArea), ...item.musclesWorked, ...item.injuryWarnings].join(' ').toLowerCase();
  return injuryText.split(/[^a-z]+/).some((word) => word.length > 3 && keywords.includes(word));
}

function isStretchBlockedByInjury(item: StretchLibraryItem, injuryText: string) {
  if (!injuryText || !item.injuryWarnings.length) return false;
  const warning = item.injuryWarnings.join(' ').toLowerCase();
  return injuryText.split(/[^a-z]+/).some((word) => word.length > 4 && warning.includes(word));
}

function prepareExerciseForEquipment(item: ExerciseLibraryItem, selected: string[]) {
  const owned = selected.map(normalizeEquipment);
  const equipment = item.equipment.filter((value) => normalizeEquipment(value) === 'bodyweight' || owned.includes(normalizeEquipment(value)));
  return { ...item, equipment: equipment.length ? equipment : item.equipment.slice(0, 1) };
}

function prepareStretchForEquipment(item: StretchLibraryItem, selected: string[]) {
  const owned = selected.map(normalizeEquipment);
  const equipment = item.equipment.filter((value) => normalizeEquipment(value) === 'bodyweight' || owned.includes(normalizeEquipment(value)));
  return { ...item, equipment: equipment.length ? equipment : item.equipment.slice(0, 1) };
}

function substitutionScore(candidate: ExerciseLibraryItem, original: ExerciseLibraryItem) {
  let score = 0;
  if (original.substitutions.includes(candidate.id)) score += 50;
  if (candidate.movementPattern === original.movementPattern) score += 30;
  score += candidate.musclesWorked.filter((muscle) => original.musclesWorked.includes(muscle)).length * 8;
  if (candidate.difficulty === original.difficulty) score += 12;
  if (candidate.goalTags.some((goal) => original.goalTags.includes(goal))) score += 8;
  return score;
}

function normalizeEquipment(value: string) {
  const item = value.toLowerCase().replaceAll('-', ' ').trim();
  if (item.includes('full gym') || item.includes('gym equipment')) return 'gym equipment';
  if (item.includes('planet')) return 'planet fitness';
  if (item.includes('dumbbell')) return 'dumbbell';
  if (item.includes('kettlebell')) return 'kettlebell';
  if (item.includes('band')) return 'resistance band';
  if (item.includes('pull')) return 'pull-up bar';
  if (item.includes('cable')) return 'cable';
  if (item.includes('machine')) return 'machine';
  if (item.includes('smith')) return 'smith machine';
  if (item.includes('bench')) return 'bench';
  if (item.includes('foam')) return 'foam roller';
  return item;
}

function intersectAreas(left: MobilityArea[], right: MobilityArea[]) {
  return left.filter((area) => right.includes(area) || right.some((target) => areaAliases[target]?.some((alias) => areaAliases[area]?.includes(alias))));
}

function labelAreaList(areas: MobilityArea[]) {
  return areas.map(formatArea).join(', ');
}

function formatArea(area: MobilityArea) {
  return area.replaceAll('_', ' ');
}

function hoursSince(date: string) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 36e5);
}

function average(values: number[]) {
  if (!values.length) return 70;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
