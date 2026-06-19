export const forgeFitPersistenceAudit = {
  databaseWorking: true,
  exercisesLoadedFromSupabase: true,
  mobilityDrillsLoadedFromSupabase: true,
  currentProblem: 'Important user preferences are not all persisted by the current UI yet.',
  fixedDatabaseSide: [
    'Created public.user_fitness_preferences',
    'Added RLS policies for authenticated users with active access',
    'Added fields for goal, duration, recovery score, program, split, focus, equipment, mobility scores, routine type, mobility time, mobility equipment, and custom days',
  ],
  stillNeedsFrontendPatch: [
    'Load user_fitness_preferences after sign in',
    'Upsert settings when the user changes goals, equipment, custom split, GOWOD scores, or mobility settings',
    'Show clear save status in the UI',
    'Relax equipment matching so alternatives like dumbbell OR kettlebell do not hide exercises',
    'Normalize muscle labels like lats, upper back, rear delts, calves, and full body',
  ],
};
