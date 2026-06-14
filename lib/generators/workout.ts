import { exercises, type Exercise } from '@/lib/data/exercises';

export type GeneratorInput = {
  goal: string;
  equipment: string[];
  durationMinutes: number;
  musclePriorities: string[];
  recoveryScore: number;
  recentExerciseNames: string[];
};

function scoreExercise(exercise: Exercise, input: GeneratorInput) {
  let score = 0;
  const hasEquipment = exercise.equipment.some((item) => input.equipment.includes(item));
  if (!hasEquipment) return -999;
  score += 10;
  score += exercise.muscles.filter((muscle) => input.musclePriorities.includes(muscle)).length * 4;
  if (input.goal.toLowerCase().includes('mma') && ['power', 'conditioning', 'core'].includes(exercise.category)) score += 3;
  if (input.goal.toLowerCase().includes('strength') && exercise.category === 'strength') score += 3;
  if (input.goal.toLowerCase().includes('muscle') && exercise.category === 'hypertrophy') score += 3;
  if (input.recentExerciseNames.includes(exercise.name)) score -= 6;
  if (input.recoveryScore < 60 && exercise.difficulty === 'advanced') score -= 5;
  return score;
}

export function generateWorkout(input: GeneratorInput) {
  const exerciseCount = input.durationMinutes <= 30 ? 4 : input.durationMinutes <= 45 ? 5 : 6;
  const selected = exercises
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, input) }))
    .filter((item) => item.score > -100)
    .sort((a, b) => b.score - a.score)
    .slice(0, exerciseCount)
    .map(({ exercise }, index) => ({
      ...exercise,
      sets: input.recoveryScore < 55 ? 2 : index === 0 ? 4 : 3,
      reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : '8-12',
      restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' ? 120 : 75,
    }));

  return {
    title: `${input.goal || 'Forge'} Session`,
    durationMinutes: input.durationMinutes,
    recoveryAdjustment: input.recoveryScore < 60 ? 'Reduced volume because recovery is low.' : 'Normal training volume.',
    exercises: selected,
  };
}
