import type {
  MobilityArea,
  MovementPattern,
  TrainingGoal,
  TrainingHistoryItem,
  TrainingPlanType,
  UserFeedback,
  UserProfile,
  WorkoutSplitType,
} from '@/lib/training/types';

export const planLabels: Record<TrainingPlanType, string> = {
  push_pull_legs: 'Push Pull Legs',
  upper_lower: 'Upper Lower',
  full_body: 'Full Body',
  mma_bjj_athletic: 'MMA/BJJ Athletic',
  mobility_only: 'Mobility Only',
};

export const workoutTypeLabels: Record<WorkoutSplitType, string> = {
  pull: 'Pull',
  push: 'Push',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  mma_bjj: 'MMA/BJJ Athletic',
  mobility_only: 'Mobility-Only',
  recovery: 'Recovery',
  rest: 'Rest',
};

const planSequences: Record<TrainingPlanType, WorkoutSplitType[]> = {
  push_pull_legs: ['pull', 'push', 'legs'],
  upper_lower: ['upper', 'lower'],
  full_body: ['full_body', 'mobility_only'],
  mma_bjj_athletic: ['mma_bjj', 'pull', 'push', 'legs', 'mobility_only'],
  mobility_only: ['mobility_only', 'recovery'],
};

const hardWorkoutTypes = new Set<WorkoutSplitType>(['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'mma_bjj']);

export type WorkoutRecommendation = {
  workoutType: WorkoutSplitType;
  planLabel: string;
  reason: string;
  missedDays: number;
};

export function recommendWorkoutType(profile: UserProfile, history: TrainingHistoryItem[], feedback: UserFeedback[] = []): WorkoutRecommendation {
  const sequence = planSequences[profile.trainingPlan] ?? planSequences.push_pull_legs;
  const planLabel = planLabels[profile.trainingPlan] ?? planLabels.push_pull_legs;
  const missedDays = getMissedDays(history);
  const lastCompleted = history.find((entry) => entry.workoutType);
  const lastTrainingType = history.find((entry) => entry.workoutType && !['recovery', 'rest'].includes(entry.workoutType))?.workoutType;
  const recoveryOverride = getRecoveryOverride(profile, history, feedback);
  const nextFromSplit = nextInSequence(sequence, lastTrainingType);
  const workoutType = recoveryOverride ?? avoidImmediateRepeat(nextFromSplit, lastCompleted?.workoutType, sequence);

  let reason = lastTrainingType
    ? `Last completed workout was ${workoutTypeLabels[lastTrainingType]}, so ${planLabel} continues with ${workoutTypeLabels[workoutType]}.`
    : `${planLabel} starts with ${workoutTypeLabels[workoutType]}.`;

  if (missedDays > 0) {
    reason += ` ${missedDays} missed day${missedDays === 1 ? '' : 's'} detected; the split did not skip ahead.`;
  }

  if (recoveryOverride) {
    reason += ' Readiness, soreness, or recent feedback shifted today toward recovery.';
  }

  return { workoutType, planLabel, reason, missedDays };
}

export function patternsForWorkoutType(type: WorkoutSplitType, goal: TrainingGoal, combatSchedule: UserProfile['combatSchedule']): MovementPattern[] {
  if (type === 'pull') return ['pull', 'carry', 'core', 'hinge', 'conditioning'];
  if (type === 'push') return ['push', 'core', 'conditioning', 'squat', 'rotation'];
  if (type === 'legs') return ['squat', 'hinge', 'lunge', 'carry', 'core'];
  if (type === 'upper') return ['push', 'pull', 'core', 'carry', 'rotation', 'conditioning'];
  if (type === 'lower') return ['squat', 'hinge', 'lunge', 'carry', 'conditioning', 'core'];
  if (type === 'full_body') return ['squat', 'push', 'pull', 'hinge', 'core', 'carry', 'conditioning'];
  if (type === 'mma_bjj') return ['power', 'rotation', 'pull', 'hinge', 'core', 'conditioning', 'carry'];
  if (type === 'mobility_only') return ['core', 'rotation', 'squat', 'hinge'];
  if (type === 'recovery' || type === 'rest') return ['core', 'mobility', 'conditioning'];

  const combatLoad = combatSchedule.mma + combatSchedule.bjj + combatSchedule.wrestling + combatSchedule.striking;
  if (goal === 'strength') return ['squat', 'hinge', 'push', 'pull', 'core', 'carry', 'conditioning'];
  if (goal === 'muscle') return ['push', 'pull', 'squat', 'hinge', 'core', 'carry', 'conditioning'];
  if (goal === 'fat_loss') return ['conditioning', 'squat', 'push', 'pull', 'hinge', 'core', 'carry'];
  if (goal === 'endurance') return ['conditioning', 'carry', 'core', 'squat', 'pull', 'push'];
  if (goal === 'mobility') return ['core', 'squat', 'hinge', 'rotation', 'push', 'pull'];
  if (goal === 'mma_bjj' || combatLoad > 1) return ['power', 'rotation', 'pull', 'hinge', 'core', 'conditioning', 'push', 'squat'];
  return ['power', 'squat', 'hinge', 'push', 'pull', 'carry', 'rotation', 'conditioning'];
}

export function mobilityAreasFromWorkoutType(type?: WorkoutSplitType): MobilityArea[] {
  if (type === 'pull') return ['shoulders', 'thoracic_spine', 'wrists', 'lower_back'];
  if (type === 'push') return ['shoulders', 'wrists', 'thoracic_spine'];
  if (type === 'legs' || type === 'lower') return ['hips', 'hamstrings', 'ankles', 'hip_flexors', 'adductors'];
  if (type === 'upper') return ['shoulders', 'thoracic_spine', 'wrists'];
  if (type === 'full_body') return ['hips', 'shoulders', 'thoracic_spine', 'hamstrings'];
  if (type === 'mma_bjj') return ['hips', 'wrists', 'thoracic_spine', 'adductors', 'rotation'];
  return ['hips', 'thoracic_spine', 'hamstrings'];
}

export function getMissedDays(history: TrainingHistoryItem[], today = new Date()) {
  const lastCompleted = history.find((entry) => entry.completedAt);
  if (!lastCompleted) return 0;
  const last = startOfDay(new Date(lastCompleted.completedAt));
  const now = startOfDay(today);
  return Math.max(0, Math.round((now.getTime() - last.getTime()) / 86400000) - 1);
}

function nextInSequence(sequence: WorkoutSplitType[], lastType?: WorkoutSplitType) {
  if (!lastType) return sequence[0];
  const index = sequence.indexOf(lastType);
  return index === -1 ? sequence[0] : sequence[(index + 1) % sequence.length];
}

function avoidImmediateRepeat(nextType: WorkoutSplitType, lastType: WorkoutSplitType | undefined, sequence: WorkoutSplitType[]) {
  if (!lastType || nextType !== lastType || sequence.length < 2) return nextType;
  if (nextType === 'full_body' || nextType === 'mobility_only') return nextType;
  return sequence[(sequence.indexOf(nextType) + 1) % sequence.length];
}

function getRecoveryOverride(profile: UserProfile, history: TrainingHistoryItem[], feedback: UserFeedback[]) {
  const recentHardSessions = history.slice(0, 4).filter((entry) => entry.workoutType && hardWorkoutTypes.has(entry.workoutType) && entry.rpe >= 8).length;
  const recentPain = feedback.slice(0, 2).some((entry) => entry.pain || entry.formQuality === 'poor');
  const lastType = history[0]?.workoutType;

  if (profile.readinessLevel <= 25 || profile.sorenessLevel >= 9) {
    return lastType === 'recovery' ? 'rest' : 'recovery';
  }

  if (profile.readinessLevel <= 45 || profile.sorenessLevel >= 8 || recentPain) {
    return 'recovery';
  }

  if (profile.readinessLevel <= 55 || profile.sorenessLevel >= 7 || recentHardSessions >= 3) {
    return 'mobility_only';
  }

  return null;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
