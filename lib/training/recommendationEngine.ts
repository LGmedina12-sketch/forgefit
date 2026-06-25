import { exerciseLibrary } from '@/lib/data/exercises';
import { stretchLibrary } from '@/lib/data/mobility';
import { calibrationTests, scoringAreas } from '@/lib/training/calibration';
import type {
  CalibrationResult,
  EquipmentProfile,
  ExerciseLibraryItem,
  ExercisePhase,
  MobilityArea,
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
};

export type GenerateMobilityInput = {
  profile: UserProfile;
  mobilityScores: MobilityScore[];
  mode: MobilitySessionMode;
  timeAvailable: number;
  feedback: UserFeedback[];
  library?: StretchLibraryItem[];
};

const patternDefaults: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'core', 'carry', 'rotation', 'conditioning'];
const combatSports = ['mma', 'bjj', 'wrestling'];

const goalLabels: Record<TrainingGoal, string> = {
  strength: 'Strength',
  muscle: 'Muscle',
  fat_loss: 'Fat loss',
  athleticism: 'Athleticism',
  mma_bjj: 'MMA/BJJ support',
  mobility: 'Mobility',
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
    gym: ['machine', 'cable', 'bench', 'bar', 'smith machine'],
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
  const overtrained = preventOvertraining(input.history);
  const difficulty = adjustDifficulty(input.profile, input.feedback);
  const recentFeedback = input.feedback.slice(-3);
  const painAreas = Array.from(new Set([...input.profile.painAreas, ...recentFeedback.flatMap((item) => item.painAreas)]));
  const targetPatterns = choosePatternPlan(input.profile.goal, input.profile.combatSchedule);
  const readinessPenalty = input.profile.readinessLevel < 55 || input.profile.sorenessLevel > 7;
  const count = input.profile.workoutLength <= 30 ? 5 : input.profile.workoutLength <= 45 ? 7 : 9;
  const scored = library
    .filter((item) => hasEquipment(item.equipment, safeEquipment))
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
      }),
    }))
    .filter((entry) => entry.score > -50)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

  const chosen: ExerciseLibraryItem[] = [];
  const phases: ExercisePhase[] = count <= 5
    ? ['warmup', 'main', 'accessory', 'conditioning', 'cooldown']
    : (['warmup', 'warmup', 'main', 'main', 'accessory', 'accessory', 'conditioning', 'cooldown', 'mobility'] as ExercisePhase[]).slice(0, count);

  phases.forEach((phase, index) => {
    const wanted = wantedPatternForPhase(phase, targetPatterns, index);
    const pool = scored.filter(({ item }) => !chosen.some((picked) => picked.id === item.id));
    const preferred = pool.filter(({ item }) => phaseMatches(item, phase, wanted));
    const picked = (preferred[0] ?? pool[0])?.item;
    if (picked) chosen.push(picked);
  });

  const exercises = chosen.map((item, index): WorkoutExercise => {
    const phase = phases[index] ?? 'accessory';
    return prescribeExercise(item, phase, input.profile, difficulty, recentFeedback);
  });

  const mobilitySteps = generateMobilityPlan({
    profile: input.profile,
    mobilityScores: input.mobilityScores,
    mode: 'post_workout',
    timeAvailable: Math.min(8, Math.max(4, Math.round(input.profile.workoutLength * 0.15))),
    feedback: input.feedback,
  }).steps.slice(0, 3);

  const patternBalance = summarizePatterns(exercises.map((item) => item.item));
  const lowered = difficulty === 'beginner' || readinessPenalty || painAreas.length > 0;

  return {
    id: `workout-${Date.now()}`,
    title: `${goalLabels[input.profile.goal]} session`,
    focus: targetPatterns.slice(0, 4).join(' / '),
    durationMinutes: input.profile.workoutLength,
    readinessAdjustment: readinessPenalty
      ? 'Volume and intensity reduced because soreness/readiness is not ideal.'
      : 'Normal adaptive volume based on current readiness.',
    safetyNote: lowered
      ? 'Pain or low readiness detected: use clean reps, stop sharp pain, and swap anything that feels wrong.'
      : 'No max effort required today. Keep 1-3 reps in reserve unless a coach tells you otherwise.',
    patternBalance,
    exercises,
    mobilitySteps,
  };
}

export function generateMobilityPlan(input: GenerateMobilityInput): MobilitySession {
  const library = input.library?.length ? input.library : stretchLibrary;
  const time = clamp(input.timeAvailable, 4, 20);
  const targetAreas = chooseMobilityTargets(input.profile, input.mobilityScores, input.mode, input.feedback);
  const stepCount = time <= 6 ? 4 : time <= 10 ? 5 : time <= 14 ? 7 : 9;
  const seconds = Math.max(35, Math.round((time * 60) / stepCount));
  const phases = mobilityPhasePlan(input.mode, stepCount, input.profile.equipment);
  const used = new Set<string>();

  const steps = phases.map((phase, index): MobilitySessionStep | null => {
    const pool = library
      .filter((item) => !used.has(item.id))
      .filter((item) => hasEquipment(item.equipment, input.profile.equipment))
      .map((item) => ({
        item,
        score: scoreStretch(item, phase, targetAreas, input.profile, input.feedback, index),
      }))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

    const picked = pool[0]?.item;
    if (!picked) return null;
    used.add(picked.id);

    return {
      item: picked,
      phase,
      seconds: phase === 'breathing' ? Math.max(60, seconds) : seconds,
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
  };
}

export function chooseExerciseSubstitutions(
  exercise: ExerciseLibraryItem,
  equipment: string[],
  painAreas: MobilityArea[],
  library: ExerciseLibraryItem[] = exerciseLibrary,
) {
  return library
    .filter((candidate) => exercise.substitutions.includes(candidate.id) || exercise.substitutions.includes(candidate.name))
    .filter((candidate) => hasEquipment(candidate.equipment, equipment))
    .filter((candidate) => !candidate.avoidWithPain?.some((area) => painAreas.includes(area)))
    .slice(0, 4);
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
  const latest = feedback.slice(-2);
  const pain = latest.some((item) => item.pain || item.formQuality === 'poor');
  const easy = latest.length >= 2 && latest.every((item) => item.completed && !item.pain && item.rpe <= 6);

  if (pain || profile.readinessLevel < 45 || profile.sorenessLevel >= 8) return 'beginner';
  if (easy && (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'competitive')) return 'advanced';
  if (profile.experienceLevel === 'beginner') return 'beginner';
  if (profile.experienceLevel === 'advanced' || profile.experienceLevel === 'competitive') return 'advanced';
  return 'intermediate';
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
  },
) {
  let score = 20;
  if (item.goalTags.includes(context.goal)) score += 35;
  if (context.targetPatterns.includes(item.movementPattern)) score += 28;
  if (context.goal === 'mma_bjj' && item.sportTags.some((tag) => combatSports.includes(tag))) score += 24;
  if (context.goal === 'endurance' && item.movementPattern === 'conditioning') score += 22;
  if (context.goal === 'athleticism' && ['power', 'carry', 'rotation', 'conditioning'].includes(item.movementPattern)) score += 18;
  if (item.difficulty === context.difficulty) score += 12;
  if (context.difficulty === 'beginner' && item.difficulty === 'advanced') score -= 38;
  if (context.readinessPenalty && ['advanced', 'conditioning', 'power'].includes(item.difficulty === 'advanced' ? 'advanced' : item.movementPattern)) score -= 22;
  if (item.avoidWithPain?.some((area) => context.painAreas.includes(area))) score -= 55;
  if (context.overtrained.patterns.has(item.movementPattern)) score -= 14;
  if (item.musclesWorked.some((muscle) => context.overtrained.muscles.has(muscle.toLowerCase()))) score -= 18;
  score -= context.history.slice(0, 4).filter((session) => session.movementPatterns.includes(item.movementPattern)).length * 3;
  return score;
}

function scoreStretch(
  item: StretchLibraryItem,
  phase: StretchLibraryItem['phase'],
  targetAreas: MobilityArea[],
  profile: UserProfile,
  feedback: UserFeedback[],
  index: number,
) {
  let score = item.phase === phase ? 40 : 8;
  score += intersectAreas(item.bodyAreas, targetAreas).length * 30;
  if (profile.goal === 'mma_bjj' && item.sportTags.some((tag) => combatSports.includes(tag))) score += 12;
  if (profile.painAreas.some((area) => item.bodyAreas.includes(area))) score += 10;
  if (feedback.slice(-3).some((itemFeedback) => itemFeedback.pain && intersectAreas(item.bodyAreas, itemFeedback.painAreas).length)) {
    score += phase === 'breathing' || phase === 'static' ? 12 : -8;
  }
  score -= index;
  return score;
}

function choosePatternPlan(goal: TrainingGoal, combatSchedule: UserProfile['combatSchedule']): MovementPattern[] {
  const combatLoad = combatSchedule.mma + combatSchedule.bjj + combatSchedule.wrestling + combatSchedule.striking;
  if (goal === 'strength') return ['squat', 'hinge', 'push', 'pull', 'core', 'carry', 'conditioning'];
  if (goal === 'muscle') return ['push', 'pull', 'squat', 'hinge', 'core', 'carry', 'conditioning'];
  if (goal === 'fat_loss') return ['conditioning', 'squat', 'push', 'pull', 'hinge', 'core', 'carry'];
  if (goal === 'endurance') return ['conditioning', 'carry', 'core', 'squat', 'pull', 'push'];
  if (goal === 'mobility') return ['core', 'squat', 'hinge', 'rotation', 'push', 'pull'];
  if (goal === 'mma_bjj' || combatLoad > 1) return ['power', 'rotation', 'pull', 'hinge', 'core', 'conditioning', 'push', 'squat'];
  return ['power', 'squat', 'hinge', 'push', 'pull', 'carry', 'rotation', 'conditioning'];
}

function wantedPatternForPhase(phase: ExercisePhase, patterns: MovementPattern[], index: number): MovementPattern[] {
  if (phase === 'warmup') return ['core', 'squat', 'hinge', 'mobility', 'conditioning'];
  if (phase === 'main') return patterns.slice(0, 4);
  if (phase === 'accessory') return patterns.slice(2, 7);
  if (phase === 'conditioning') return ['conditioning', 'carry', 'rotation', 'power'];
  if (phase === 'cooldown' || phase === 'mobility') return ['core', 'mobility'];
  return [patterns[index % patterns.length]];
}

function phaseMatches(item: ExerciseLibraryItem, phase: ExercisePhase, wanted: MovementPattern[]) {
  if (phase === 'warmup') return item.difficulty !== 'advanced' && wanted.includes(item.movementPattern);
  if (phase === 'conditioning') return ['conditioning', 'carry', 'power'].includes(item.movementPattern);
  if (phase === 'cooldown' || phase === 'mobility') return item.movementPattern === 'core' || item.difficulty === 'beginner';
  return wanted.includes(item.movementPattern);
}

function prescribeExercise(
  item: ExerciseLibraryItem,
  phase: ExercisePhase,
  profile: UserProfile,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  feedback: UserFeedback[],
): WorkoutExercise {
  const lowered = difficulty === 'beginner' || profile.readinessLevel < 55 || profile.sorenessLevel >= 8 || feedback.slice(-2).some((entry) => entry.pain);
  const progressed = feedback.slice(-2).length >= 2 && feedback.slice(-2).every((entry) => entry.completed && !entry.pain && entry.rpe <= 6);
  const mainLift = phase === 'main';
  const conditioning = phase === 'conditioning' || item.movementPattern === 'conditioning';

  const sets = conditioning ? undefined : lowered ? 2 : progressed && mainLift ? 5 : mainLift ? 4 : 3;
  const reps = conditioning
    ? undefined
    : item.movementPattern === 'power'
      ? '3-5'
      : profile.goal === 'strength' && mainLift
        ? '4-6'
        : profile.goal === 'muscle'
          ? '8-12'
          : '8-15';

  return {
    item,
    phase,
    sets,
    reps,
    timeSeconds: conditioning ? (lowered ? 25 : progressed ? 50 : 40) : undefined,
    restSeconds: conditioning ? (lowered ? 75 : 45) : mainLift ? 120 : 60,
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
) {
  const painTargets = profile.painAreas.filter((area) => scoringAreas.includes(area));
  const feedbackPain = feedback.slice(-3).flatMap((item) => item.painAreas).filter((area) => scoringAreas.includes(area));
  const weak = [...scores].sort((a, b) => a.score - b.score).slice(0, mode === 'recovery_day' ? 4 : 3).map((item) => item.area);
  const sportNeeds: MobilityArea[] = profile.goal === 'mma_bjj'
    ? ['hips', 'thoracic_spine', 'ankles', 'shoulders', 'adductors', 'rotation']
    : ['hips', 'hamstrings', 'shoulders', 'thoracic_spine'];

  return Array.from(new Set([...painTargets, ...feedbackPain, ...weak, ...sportNeeds])).slice(0, 6);
}

function mobilityPhasePlan(mode: MobilitySessionMode, count: number, equipment: string[]) {
  const base = mode === 'pre_workout'
    ? ['dynamic', 'dynamic', 'main', 'main', 'static', 'breathing']
    : mode === 'post_workout'
      ? ['dynamic', 'main', 'static', 'static', 'breathing']
      : ['dynamic', 'main', 'main', 'static', 'static', 'breathing'];
  const withFoam = equipment.includes('foam roller') ? [...base.slice(0, 2), 'foam_roll', ...base.slice(2)] : base;
  return Array.from({ length: count }, (_, index) => withFoam[index] ?? withFoam[withFoam.length - 1]) as StretchLibraryItem['phase'][];
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

function normalizeEquipment(value: string) {
  const item = value.toLowerCase().replaceAll('-', ' ').trim();
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
