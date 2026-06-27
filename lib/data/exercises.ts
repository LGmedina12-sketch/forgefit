import type { ExerciseLibraryItem, MediaFields, TrainingGoal, VideoType } from '@/lib/training/types';

type ExerciseSeed = Omit<ExerciseLibraryItem, keyof MediaFields | 'description' | 'easierAlternative' | 'harderAlternative' | 'injuryWarnings' | 'intensity' | 'workoutTypes' | 'isMainLift' | 'isAccessory' | 'isConditioning' | 'isMmaSpecific'> & {
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoType?: VideoType;
  easierAlternative?: string;
  harderAlternative?: string;
  injuryWarnings?: string[];
  intensity?: ExerciseLibraryItem['intensity'];
  workoutTypes?: ExerciseLibraryItem['workoutTypes'];
  isMainLift?: boolean;
  isAccessory?: boolean;
  isConditioning?: boolean;
  isMmaSpecific?: boolean;
};

const exerciseVideos: Record<string, string> = {
  'push-up': 'https://www.youtube.com/watch?v=WDIpL0pjun0',
  'band-pull-apart': 'https://www.youtube.com/watch?v=bYsgk9SrJ48',
  'bodyweight-squat': 'https://www.youtube.com/watch?v=DlS-GAF8Edg',
  'goblet-squat': 'https://www.youtube.com/watch?v=DlS-GAF8Edg',
};

const baseGoals: TrainingGoal[] = ['strength', 'muscle', 'fat_loss', 'athleticism'];

const accessoryIds = new Set([
  'tricep-extension', 'lateral-raise', 'front-raise', 'face-pull', 'rear-delt-fly', 'hammer-curl', 'bicep-curl',
  'dead-hang', 'scapular-pull-up', 'band-pull-apart', 'calf-raise', 'wall-sit', 'plank', 'side-plank', 'dead-bug', 'hollow-hold',
  'leg-raise', 'hanging-knee-raise', 'russian-twist', 'bird-dog', 'pallof-press', 'ab-wheel', 'neck-isometric',
]);

const mmaSpecificIds = new Set([
  'sprawl-to-shot', 'sprawl', 'shrimping', 'technical-stand-up', 'shot-entry', 'penetration-step', 'hip-escape',
  'bridge-and-roll', 'shadow-boxing', 'footwork-drill', 'sprawl-to-push-up', 'combat-base-transition',
]);

function exercise(item: ExerciseSeed): ExerciseLibraryItem {
  const videoUrl = item.videoUrl ?? exerciseVideos[item.id] ?? '';
  const videoType = item.videoType ?? (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? 'youtube' : 'external');
  const isConditioning = item.isConditioning ?? item.movementPattern === 'conditioning';

  return {
    ...item,
    description: item.description ?? `${item.category} pattern for ${item.musclesWorked.slice(0, 3).join(', ')} using ${item.equipment.slice(0, 2).join(' or ')}.`,
    videoUrl,
    thumbnailUrl: item.thumbnailUrl ?? '',
    videoType,
    videoAvailable: Boolean(videoUrl),
    goalTags: Array.from(new Set([...item.goalTags, ...(isConditioning ? ['conditioning' as const] : [])])),
    easierAlternative: item.easierAlternative ?? item.substitutions[0] ?? '',
    harderAlternative: item.harderAlternative ?? item.substitutions[1] ?? '',
    injuryWarnings: item.injuryWarnings ?? (item.avoidWithPain?.length ? [`Avoid or modify with ${item.avoidWithPain.join(', ')} pain.`] : []),
    intensity: item.intensity ?? inferIntensity(item),
    workoutTypes: item.workoutTypes ?? inferWorkoutTypes(item.movementPattern),
    isMainLift: item.isMainLift ?? inferMainLift(item),
    isAccessory: item.isAccessory ?? accessoryIds.has(item.id),
    isConditioning,
    isMmaSpecific: item.isMmaSpecific ?? mmaSpecificIds.has(item.id),
  };
}

function inferIntensity(item: ExerciseSeed): ExerciseLibraryItem['intensity'] {
  if (item.difficulty === 'advanced' || ['conditioning', 'power'].includes(item.movementPattern)) return 'hard';
  if (item.difficulty === 'beginner') return 'easy';
  return 'medium';
}

function inferMainLift(item: ExerciseSeed) {
  if (accessoryIds.has(item.id) || ['conditioning', 'power', 'core', 'carry', 'rotation', 'mobility', 'neck'].includes(item.movementPattern)) return false;
  return item.category.includes('strength') || item.category.includes('hypertrophy') || item.category.includes('posterior') || ['push', 'pull', 'squat', 'hinge', 'lunge'].includes(item.movementPattern);
}

function inferWorkoutTypes(pattern: ExerciseLibraryItem['movementPattern']): ExerciseLibraryItem['workoutTypes'] {
  if (pattern === 'push') return ['push', 'upper', 'full_body'];
  if (pattern === 'pull') return ['pull', 'upper', 'full_body'];
  if (['squat', 'hinge', 'lunge'].includes(pattern)) return ['legs', 'lower', 'full_body'];
  if (pattern === 'conditioning' || pattern === 'power') return ['conditioning', 'full_body'];
  if (pattern === 'mobility') return ['mobility'];
  return ['core', 'full_body'];
}

const baseExerciseLibrary: ExerciseLibraryItem[] = [
  exercise({
    id: 'push-up',
    name: 'Push-Up',
    category: 'upper strength',
    movementPattern: 'push',
    coachingCues: ['Brace ribs down', 'Elbows about 45 degrees', 'Move chest and hips together'],
    commonMistakes: ['Sagging hips', 'Flaring elbows', 'Cutting the bottom range short'],
    musclesWorked: ['chest', 'triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    goalTags: baseGoals,
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['shoulders', 'wrists'],
    substitutions: ['incline-push-up', 'dumbbell-floor-press', 'machine-chest-press'],
  }),
  exercise({
    id: 'incline-push-up',
    name: 'Incline Push-Up',
    category: 'upper strength',
    movementPattern: 'push',
    coachingCues: ['Use a bench or Smith bar', 'Keep a straight plank', 'Pause lightly at the bottom'],
    commonMistakes: ['Letting the head reach first', 'Shrugging', 'Moving too fast'],
    musclesWorked: ['chest', 'triceps', 'shoulders', 'core'],
    equipment: ['bodyweight', 'bench', 'smith machine'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'fat_loss'],
    sportTags: ['mma', 'bjj'],
    avoidWithPain: ['wrists'],
    substitutions: ['push-up', 'machine-chest-press'],
  }),
  exercise({
    id: 'pull-up',
    name: 'Pull-Up',
    category: 'upper strength',
    movementPattern: 'pull',
    coachingCues: ['Start from active shoulders', 'Pull elbows toward ribs', 'Control the lowering'],
    commonMistakes: ['Kipping every rep', 'Cranking the neck', 'Half reps'],
    musclesWorked: ['lats', 'upper back', 'biceps', 'forearms', 'core'],
    equipment: ['pull-up bar'],
    difficulty: 'advanced',
    goalTags: ['strength', 'muscle', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['shoulders', 'elbows'],
    substitutions: ['assisted-pull-up', 'lat-pulldown', 'inverted-row'],
  }),
  exercise({
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'upper hypertrophy',
    movementPattern: 'pull',
    coachingCues: ['Chest tall', 'Drive elbows down', 'Let shoulder blades rise under control'],
    commonMistakes: ['Pulling behind the neck', 'Leaning too far back', 'Using momentum'],
    musclesWorked: ['lats', 'upper back', 'biceps'],
    equipment: ['machine', 'cable', 'planet fitness'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'fat_loss'],
    sportTags: ['mma', 'bjj'],
    avoidWithPain: ['shoulders'],
    substitutions: ['assisted-pull-up', 'band-pulldown', 'inverted-row'],
  }),
  exercise({
    id: 'inverted-row',
    name: 'Inverted Row',
    category: 'upper strength',
    movementPattern: 'pull',
    coachingCues: ['Body stays long', 'Pull chest to bar', 'Squeeze shoulder blades'],
    commonMistakes: ['Dropping hips', 'Shrugging', 'Turning it into a curl'],
    musclesWorked: ['upper back', 'lats', 'biceps', 'rear delts'],
    equipment: ['smith machine', 'bar', 'rings', 'suspension trainer'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['dumbbell-row', 'lat-pulldown'],
  }),
  exercise({
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    category: 'upper hypertrophy',
    movementPattern: 'pull',
    coachingCues: ['Brace on bench', 'Row elbow to hip', 'Pause without twisting'],
    commonMistakes: ['Torso rotation', 'Rushing the eccentric', 'Curling the weight'],
    musclesWorked: ['upper back', 'lats', 'biceps', 'rear delts'],
    equipment: ['dumbbell', 'bench'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'fat_loss'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['cable-row', 'inverted-row'],
  }),
  exercise({
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    category: 'upper hypertrophy',
    movementPattern: 'push',
    coachingCues: ['Set handles mid-chest', 'Shoulders down', 'Press without locking hard'],
    commonMistakes: ['Seat too low', 'Shoulders rolling forward', 'Bouncing the stack'],
    musclesWorked: ['chest', 'triceps', 'shoulders'],
    equipment: ['machine', 'planet fitness'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'fat_loss'],
    sportTags: ['mma', 'bjj'],
    avoidWithPain: ['shoulders'],
    substitutions: ['push-up', 'dumbbell-floor-press'],
  }),
  exercise({
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    category: 'upper strength',
    movementPattern: 'push',
    coachingCues: ['Ribs down', 'Press slightly back', 'Finish with biceps near ears'],
    commonMistakes: ['Overarching lower back', 'Banging dumbbells', 'Pressing forward'],
    musclesWorked: ['shoulders', 'triceps', 'core'],
    equipment: ['dumbbell'],
    difficulty: 'intermediate',
    goalTags: ['strength', 'muscle', 'athleticism'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['shoulders', 'lower_back'],
    substitutions: ['landmine-press', 'machine-shoulder-press'],
  }),
  exercise({
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'lower strength',
    movementPattern: 'squat',
    coachingCues: ['Elbows inside knees', 'Stay tall', 'Push the floor apart'],
    commonMistakes: ['Heels lifting', 'Knees collapsing', 'Rounding at the bottom'],
    musclesWorked: ['quads', 'glutes', 'core', 'adductors'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    goalTags: baseGoals,
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['knees', 'lower_back'],
    substitutions: ['bodyweight-squat', 'leg-press', 'box-squat'],
  }),
  exercise({
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    category: 'lower strength',
    movementPattern: 'squat',
    coachingCues: ['Tripod foot', 'Knees track toes', 'Stand tall through hips'],
    commonMistakes: ['Collapsing arches', 'Butt wink under fatigue', 'Chest falling'],
    musclesWorked: ['quads', 'glutes', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    goalTags: ['strength', 'fat_loss', 'athleticism', 'mobility'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['goblet-squat', 'box-squat', 'leg-press'],
  }),
  exercise({
    id: 'leg-press',
    name: 'Leg Press',
    category: 'lower hypertrophy',
    movementPattern: 'squat',
    coachingCues: ['Feet mid-platform', 'Control depth', 'Keep low back on pad'],
    commonMistakes: ['Locking knees hard', 'Too much depth for hips', 'Letting knees cave'],
    musclesWorked: ['quads', 'glutes', 'hamstrings'],
    equipment: ['machine', 'planet fitness'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'fat_loss'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['knees', 'lower_back'],
    substitutions: ['goblet-squat', 'split-squat'],
  }),
  exercise({
    id: 'reverse-lunge',
    name: 'Reverse Lunge',
    category: 'lower strength',
    movementPattern: 'lunge',
    coachingCues: ['Step back softly', 'Front foot stays planted', 'Drive up through front leg'],
    commonMistakes: ['Pushing off the back foot', 'Narrow stance', 'Losing torso position'],
    musclesWorked: ['quads', 'glutes', 'hamstrings', 'core'],
    equipment: ['bodyweight', 'dumbbell'],
    difficulty: 'intermediate',
    goalTags: baseGoals,
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['knees'],
    substitutions: ['split-squat', 'step-up', 'leg-press'],
  }),
  exercise({
    id: 'dumbbell-rdl',
    name: 'Dumbbell Romanian Deadlift',
    category: 'posterior chain',
    movementPattern: 'hinge',
    coachingCues: ['Hips back', 'Soft knees', 'Dumbbells close to legs'],
    commonMistakes: ['Squatting the hinge', 'Rounding lower back', 'Reaching too low'],
    musclesWorked: ['hamstrings', 'glutes', 'back', 'core'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['lower_back', 'hamstrings'],
    substitutions: ['hip-thrust', 'cable-pull-through', 'glute-bridge'],
  }),
  exercise({
    id: 'hip-thrust',
    name: 'Hip Thrust',
    category: 'posterior chain',
    movementPattern: 'hinge',
    coachingCues: ['Chin tucked', 'Ribs down', 'Lock out with glutes'],
    commonMistakes: ['Overarching at top', 'Feet too far away', 'Neck thrown back'],
    musclesWorked: ['glutes', 'hamstrings', 'core'],
    equipment: ['bench', 'dumbbell', 'barbell', 'machine'],
    difficulty: 'beginner',
    goalTags: ['strength', 'muscle', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['lower_back'],
    substitutions: ['glute-bridge', 'dumbbell-rdl'],
  }),
  exercise({
    id: 'plank',
    name: 'Plank',
    category: 'core',
    movementPattern: 'core',
    coachingCues: ['Elbows under shoulders', 'Squeeze glutes', 'Breathe behind the shield'],
    commonMistakes: ['Hips sagging', 'Holding breath', 'Shoulders shrugged'],
    musclesWorked: ['core', 'shoulders', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    goalTags: ['strength', 'fat_loss', 'mma_bjj', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['dead-bug', 'hollow-hold'],
  }),
  exercise({
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'core',
    movementPattern: 'core',
    coachingCues: ['Low back heavy', 'Reach long', 'Move slowly'],
    commonMistakes: ['Ribs flaring', 'Speeding up', 'Losing floor contact'],
    musclesWorked: ['core', 'hip flexors'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    goalTags: ['strength', 'mobility', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['plank', 'hollow-hold'],
  }),
  exercise({
    id: 'hollow-hold',
    name: 'Hollow Hold',
    category: 'core',
    movementPattern: 'core',
    coachingCues: ['Low back pressed down', 'Reach long', 'Scale legs higher if needed'],
    commonMistakes: ['Back arching', 'Neck tension', 'Holding too hard a version'],
    musclesWorked: ['core', 'hip flexors'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    goalTags: ['strength', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['dead-bug', 'plank'],
  }),
  exercise({
    id: 'pallof-press',
    name: 'Pallof Press',
    category: 'rotational core',
    movementPattern: 'rotation',
    coachingCues: ['Tall posture', 'Press straight out', 'Resist rotation'],
    commonMistakes: ['Leaning away', 'Rushing reps', 'Letting hips turn'],
    musclesWorked: ['core', 'obliques', 'glutes'],
    equipment: ['resistance band', 'cable'],
    difficulty: 'beginner',
    goalTags: ['strength', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['side-plank', 'band-rotation'],
  }),
  exercise({
    id: 'medicine-ball-rotational-throw',
    name: 'Medicine Ball Rotational Throw',
    category: 'power',
    movementPattern: 'rotation',
    coachingCues: ['Load hip', 'Turn through the floor', 'Throw with snap'],
    commonMistakes: ['Only using arms', 'No hip turn', 'Throwing when tired'],
    musclesWorked: ['core', 'obliques', 'glutes', 'shoulders'],
    equipment: ['medicine ball', 'wall'],
    difficulty: 'advanced',
    goalTags: ['athleticism', 'mma_bjj', 'strength'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['shoulders', 'lower_back'],
    substitutions: ['pallof-press', 'band-rotation'],
  }),
  exercise({
    id: 'farmers-carry',
    name: 'Farmer Carry',
    category: 'carry',
    movementPattern: 'carry',
    coachingCues: ['Tall ribs stacked over pelvis', 'Crush the handles', 'Walk quietly'],
    commonMistakes: ['Leaning back', 'Shrugging', 'Taking sloppy turns'],
    musclesWorked: ['forearms', 'traps', 'core', 'glutes'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    goalTags: ['strength', 'fat_loss', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['suitcase-carry', 'sled-push'],
  }),
  exercise({
    id: 'neck-isometric',
    name: 'Neck Isometric Holds',
    category: 'neck',
    movementPattern: 'neck',
    coachingCues: ['Gentle pressure', 'Long neck', 'Hold without jaw tension'],
    commonMistakes: ['Max effort pushing', 'Holding breath', 'Cranking range'],
    musclesWorked: ['neck'],
    equipment: ['bodyweight', 'towel'],
    difficulty: 'beginner',
    goalTags: ['mma_bjj', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['neck'],
    substitutions: ['trap-raise', 'dead-bug'],
  }),
  exercise({
    id: 'bear-crawl',
    name: 'Bear Crawl',
    category: 'conditioning',
    movementPattern: 'conditioning',
    coachingCues: ['Knees hover low', 'Opposite hand and foot', 'Quiet controlled steps'],
    commonMistakes: ['Hips too high', 'Rushing', 'Shoulders collapsing'],
    musclesWorked: ['shoulders', 'core', 'quads', 'wrists'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    goalTags: ['fat_loss', 'athleticism', 'mma_bjj', 'endurance'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['wrists', 'shoulders'],
    substitutions: ['mountain-climber', 'sled-push'],
  }),
  exercise({
    id: 'sprawl-to-shot',
    name: 'Sprawl to Shot Drill',
    category: 'MMA conditioning',
    movementPattern: 'conditioning',
    coachingCues: ['Hips heavy on sprawl', 'Recover stance', 'Step in cleanly'],
    commonMistakes: ['Landing loose', 'Standing upright between reps', 'Letting knees cave'],
    musclesWorked: ['full body', 'core', 'hips', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'advanced',
    goalTags: ['mma_bjj', 'athleticism', 'endurance', 'fat_loss'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['wrists', 'shoulders', 'lower_back'],
    substitutions: ['squat-thrust', 'bear-crawl'],
  }),
  exercise({
    id: 'battle-rope-waves',
    name: 'Battle Rope Waves',
    category: 'conditioning',
    movementPattern: 'conditioning',
    coachingCues: ['Athletic stance', 'Ribs down', 'Snap through arms without shrugging'],
    commonMistakes: ['Standing too tall', 'Holding breath', 'Letting shoulders burn out early'],
    musclesWorked: ['shoulders', 'arms', 'core', 'legs'],
    equipment: ['battle rope'],
    difficulty: 'intermediate',
    goalTags: ['fat_loss', 'endurance', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['shoulders'],
    substitutions: ['jump-rope', 'air-bike-interval'],
  }),
  exercise({
    id: 'jump-rope',
    name: 'Jump Rope Intervals',
    category: 'conditioning',
    movementPattern: 'conditioning',
    coachingCues: ['Tall posture', 'Small quiet jumps', 'Wrists turn the rope'],
    commonMistakes: ['Jumping too high', 'Arms too wide', 'Losing rhythm under fatigue'],
    musclesWorked: ['calves', 'shoulders', 'core'],
    equipment: ['jump rope'],
    difficulty: 'beginner',
    goalTags: ['fat_loss', 'endurance', 'athleticism', 'mma_bjj'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    avoidWithPain: ['ankles'],
    substitutions: ['marching-high-knees', 'air-bike-interval'],
  }),
  exercise({
    id: 'box-jump',
    name: 'Box Jump',
    category: 'power',
    movementPattern: 'power',
    coachingCues: ['Load hips', 'Land softly', 'Step down before next rep'],
    commonMistakes: ['Using too high a box', 'Landing stiff', 'Jumping down tired'],
    musclesWorked: ['quads', 'glutes', 'calves', 'core'],
    equipment: ['box'],
    difficulty: 'intermediate',
    goalTags: ['athleticism', 'mma_bjj', 'strength'],
    sportTags: ['mma', 'wrestling'],
    avoidWithPain: ['ankles', 'knees'],
    substitutions: ['squat-jump', 'step-up'],
  }),
  exercise({
    id: 'air-bike-interval',
    name: 'Air Bike Interval',
    category: 'conditioning',
    movementPattern: 'conditioning',
    coachingCues: ['Smooth ramp up', 'Drive arms and legs', 'Recover nasal breathing if possible'],
    commonMistakes: ['Starting too hard', 'Sloppy posture', 'Skipping recovery'],
    musclesWorked: ['full body', 'legs', 'arms', 'core'],
    equipment: ['machine', 'air bike'],
    difficulty: 'intermediate',
    goalTags: ['fat_loss', 'endurance', 'mma_bjj', 'athleticism'],
    sportTags: ['mma', 'bjj', 'wrestling'],
    substitutions: ['jump-rope', 'battle-rope-waves', 'incline-treadmill-walk'],
  }),
];

type QuickExercise = {
  id: string;
  name: string;
  pattern: ExerciseLibraryItem['movementPattern'];
  muscles: string[];
  equipment?: string[];
  difficulty?: ExerciseLibraryItem['difficulty'];
  category?: string;
  goals?: TrainingGoal[];
  sport?: string[];
  avoid?: ExerciseLibraryItem['avoidWithPain'];
  easier?: string;
  harder?: string;
  intensity?: ExerciseLibraryItem['intensity'];
  workoutTypes?: ExerciseLibraryItem['workoutTypes'];
  main?: boolean;
  accessory?: boolean;
  conditioning?: boolean;
  mmaSpecific?: boolean;
};

function quickExercise(seed: QuickExercise): ExerciseLibraryItem {
  const equipment = seed.equipment ?? ['bodyweight'];
  const substitutions = [seed.easier, seed.harder].filter(Boolean) as string[];
  return exercise({
    id: seed.id,
    name: seed.name,
    category: seed.category ?? (seed.pattern === 'conditioning' ? 'conditioning' : seed.pattern === 'power' ? 'athletic power' : 'strength'),
    movementPattern: seed.pattern,
    coachingCues: [`Set a stable ${seed.pattern} position`, 'Move through a controlled pain-free range', 'Stop the set when form changes'],
    commonMistakes: ['Rushing the movement', 'Losing a braced position', 'Using a variation that is too difficult'],
    musclesWorked: seed.muscles,
    equipment,
    difficulty: seed.difficulty ?? 'beginner',
    goalTags: seed.goals ?? baseGoals,
    sportTags: seed.sport ?? [],
    avoidWithPain: seed.avoid,
    substitutions,
    easierAlternative: seed.easier ?? '',
    harderAlternative: seed.harder ?? '',
    intensity: seed.intensity,
    workoutTypes: seed.workoutTypes,
    isMainLift: seed.main,
    isAccessory: seed.accessory,
    isConditioning: seed.conditioning,
    isMmaSpecific: seed.mmaSpecific,
  });
}

const requestedExerciseLibrary: ExerciseLibraryItem[] = [
  quickExercise({ id: 'weighted-push-up', name: 'Weighted Push-Up', pattern: 'push', muscles: ['chest', 'triceps', 'shoulders', 'core'], equipment: ['dumbbell', 'gym equipment'], difficulty: 'intermediate', goals: ['strength', 'muscle'], easier: 'push-up', harder: 'dumbbell-bench-press', main: true, avoid: ['shoulders', 'wrists'] }),
  quickExercise({ id: 'decline-push-up', name: 'Decline Push-Up', pattern: 'push', muscles: ['chest', 'triceps', 'shoulders', 'core'], difficulty: 'intermediate', easier: 'push-up', harder: 'explosive-push-up', avoid: ['shoulders', 'wrists'] }),
  quickExercise({ id: 'diamond-push-up', name: 'Diamond Push-Up', pattern: 'push', muscles: ['triceps', 'chest', 'shoulders'], difficulty: 'intermediate', easier: 'push-up', harder: 'decline-push-up', avoid: ['wrists', 'elbows'] }),
  quickExercise({ id: 'explosive-push-up', name: 'Explosive Push-Up', pattern: 'power', muscles: ['chest', 'triceps', 'shoulders', 'core'], difficulty: 'advanced', goals: ['athleticism', 'mma_bjj', 'strength'], sport: ['mma', 'bjj', 'wrestling'], easier: 'push-up', avoid: ['shoulders', 'wrists'] }),
  quickExercise({ id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', pattern: 'push', muscles: ['chest', 'triceps', 'shoulders'], equipment: ['dumbbell', 'bench'], difficulty: 'intermediate', easier: 'dumbbell-floor-press', harder: 'dumbbell-bench-press', avoid: ['shoulders'] }),
  quickExercise({ id: 'dumbbell-floor-press', name: 'Dumbbell Floor Press', pattern: 'push', muscles: ['chest', 'triceps', 'shoulders'], equipment: ['dumbbell'], easier: 'incline-push-up', harder: 'dumbbell-bench-press', avoid: ['shoulders'] }),
  quickExercise({ id: 'pike-push-up', name: 'Pike Push-Up', pattern: 'push', muscles: ['shoulders', 'triceps', 'core'], difficulty: 'intermediate', easier: 'incline-push-up', harder: 'dumbbell-shoulder-press', avoid: ['shoulders', 'wrists'] }),
  quickExercise({ id: 'dips', name: 'Dips', pattern: 'push', muscles: ['triceps', 'chest', 'shoulders'], equipment: ['dip bars'], difficulty: 'advanced', easier: 'diamond-push-up', harder: 'dips', avoid: ['shoulders', 'elbows'] }),
  quickExercise({ id: 'tricep-extension', name: 'Tricep Extension', pattern: 'push', muscles: ['triceps'], equipment: ['dumbbell', 'resistance band', 'cable'], easier: 'diamond-push-up', harder: 'dips', avoid: ['elbows', 'shoulders'] }),
  quickExercise({ id: 'lateral-raise', name: 'Lateral Raise', pattern: 'push', muscles: ['side delts', 'shoulders'], equipment: ['dumbbell', 'resistance band', 'cable'], easier: 'band-pull-apart', harder: 'dumbbell-shoulder-press', avoid: ['shoulders'] }),
  quickExercise({ id: 'front-raise', name: 'Front Raise', pattern: 'push', muscles: ['front delts', 'shoulders'], equipment: ['dumbbell', 'resistance band'], easier: 'incline-push-up', harder: 'dumbbell-shoulder-press', avoid: ['shoulders'] }),
  quickExercise({ id: 'medicine-ball-chest-pass', name: 'Medicine Ball Chest Pass', pattern: 'power', muscles: ['chest', 'triceps', 'shoulders'], equipment: ['medicine ball', 'wall'], difficulty: 'intermediate', goals: ['athleticism', 'mma_bjj', 'strength'], sport: ['mma', 'wrestling'], easier: 'push-up', harder: 'explosive-push-up', avoid: ['shoulders'] }),
  quickExercise({ id: 'chin-up', name: 'Chin-Up', pattern: 'pull', muscles: ['lats', 'biceps', 'upper back'], equipment: ['pull-up bar'], difficulty: 'advanced', easier: 'assisted-pull-up', harder: 'pull-up', avoid: ['shoulders', 'elbows'] }),
  quickExercise({ id: 'assisted-pull-up', name: 'Assisted Pull-Up', pattern: 'pull', muscles: ['lats', 'biceps', 'upper back'], equipment: ['pull-up bar', 'resistance band'], easier: 'band-row', harder: 'pull-up', avoid: ['shoulders', 'elbows'] }),
  quickExercise({ id: 'band-row', name: 'Band Row', pattern: 'pull', muscles: ['upper back', 'lats', 'biceps'], equipment: ['resistance band'], easier: 'towel-row', harder: 'dumbbell-row' }),
  quickExercise({ id: 'face-pull', name: 'Face Pull', pattern: 'pull', muscles: ['rear delts', 'upper back', 'rotator cuff'], equipment: ['resistance band', 'cable'], easier: 'band-pull-apart', harder: 'rear-delt-fly', avoid: ['shoulders'] }),
  quickExercise({ id: 'rear-delt-fly', name: 'Rear Delt Fly', pattern: 'pull', muscles: ['rear delts', 'upper back'], equipment: ['dumbbell', 'resistance band'], easier: 'band-pull-apart', harder: 'face-pull', avoid: ['shoulders'] }),
  quickExercise({ id: 'hammer-curl', name: 'Hammer Curl', pattern: 'pull', muscles: ['biceps', 'forearms'], equipment: ['dumbbell', 'resistance band'], easier: 'bicep-curl', harder: 'chin-up', avoid: ['elbows'] }),
  quickExercise({ id: 'bicep-curl', name: 'Bicep Curl', pattern: 'pull', muscles: ['biceps'], equipment: ['dumbbell', 'resistance band', 'cable'], easier: 'band-row', harder: 'hammer-curl', avoid: ['elbows'] }),
  quickExercise({ id: 'dead-hang', name: 'Dead Hang', pattern: 'pull', muscles: ['forearms', 'lats', 'shoulders'], equipment: ['pull-up bar'], easier: 'scapular-pull-up', harder: 'pull-up', avoid: ['shoulders', 'elbows'] }),
  quickExercise({ id: 'scapular-pull-up', name: 'Scapular Pull-Up', pattern: 'pull', muscles: ['lower traps', 'lats', 'shoulders'], equipment: ['pull-up bar'], easier: 'band-pull-apart', harder: 'assisted-pull-up', avoid: ['shoulders'] }),
  quickExercise({ id: 'towel-row', name: 'Towel Row', pattern: 'pull', muscles: ['upper back', 'biceps', 'forearms'], equipment: ['towel', 'bodyweight'], easier: 'band-row', harder: 'inverted-row' }),
  quickExercise({ id: 'band-pull-apart', name: 'Band Pull-Apart', pattern: 'pull', muscles: ['upper back', 'rear delts'], equipment: ['resistance band'], easier: 'scapular-pull-up', harder: 'face-pull' }),
  quickExercise({ id: 'forward-lunge', name: 'Forward Lunge', pattern: 'lunge', muscles: ['quads', 'glutes', 'hamstrings'], easier: 'reverse-lunge', harder: 'bulgarian-split-squat', avoid: ['knees'] }),
  quickExercise({ id: 'split-squat', name: 'Split Squat', pattern: 'lunge', muscles: ['quads', 'glutes', 'hamstrings'], easier: 'reverse-lunge', harder: 'bulgarian-split-squat', main: true, avoid: ['knees'] }),
  quickExercise({ id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', pattern: 'lunge', muscles: ['quads', 'glutes', 'hamstrings'], equipment: ['bodyweight', 'dumbbell', 'bench'], difficulty: 'advanced', easier: 'reverse-lunge', harder: 'bulgarian-split-squat', avoid: ['knees'] }),
  quickExercise({ id: 'step-up', name: 'Step-Up', pattern: 'lunge', muscles: ['quads', 'glutes', 'hamstrings'], equipment: ['box', 'bench', 'bodyweight'], easier: 'reverse-lunge', harder: 'bulgarian-split-squat', avoid: ['knees'] }),
  quickExercise({ id: 'glute-bridge', name: 'Glute Bridge', pattern: 'hinge', muscles: ['glutes', 'hamstrings', 'core'], easier: 'bodyweight-squat', harder: 'hip-thrust', avoid: ['lower_back'] }),
  quickExercise({ id: 'calf-raise', name: 'Calf Raise', pattern: 'squat', muscles: ['calves', 'ankles'], equipment: ['bodyweight', 'dumbbell'], easier: 'calf-raise', harder: 'jump-squat', avoid: ['ankles'] }),
  quickExercise({ id: 'wall-sit', name: 'Wall Sit', pattern: 'squat', muscles: ['quads', 'glutes', 'core'], easier: 'bodyweight-squat', harder: 'goblet-squat', avoid: ['knees'] }),
  quickExercise({ id: 'jump-squat', name: 'Jump Squat', pattern: 'power', muscles: ['quads', 'glutes', 'calves'], difficulty: 'intermediate', goals: ['athleticism', 'mma_bjj', 'fat_loss'], sport: ['mma', 'bjj', 'wrestling'], easier: 'bodyweight-squat', harder: 'broad-jump', avoid: ['knees', 'ankles'] }),
  quickExercise({ id: 'broad-jump', name: 'Broad Jump', pattern: 'power', muscles: ['glutes', 'quads', 'hamstrings', 'calves'], difficulty: 'intermediate', goals: ['athleticism', 'mma_bjj'], sport: ['mma', 'wrestling'], easier: 'jump-squat', harder: 'box-jump', avoid: ['knees', 'ankles', 'lower_back'] }),
  quickExercise({ id: 'lateral-bound', name: 'Lateral Bound', pattern: 'power', muscles: ['glutes', 'quads', 'adductors', 'calves'], difficulty: 'intermediate', goals: ['athleticism', 'mma_bjj'], sport: ['mma', 'wrestling'], easier: 'bodyweight-squat', harder: 'broad-jump', avoid: ['knees', 'ankles'] }),
  quickExercise({ id: 'sled-push', name: 'Sled Push', pattern: 'conditioning', muscles: ['quads', 'glutes', 'calves', 'core'], equipment: ['sled', 'gym equipment'], difficulty: 'intermediate', goals: ['strength', 'athleticism', 'mma_bjj', 'fat_loss'], sport: ['mma', 'bjj', 'wrestling'], easier: 'incline-treadmill-walk', harder: 'sled-push', avoid: ['knees'] }),
  quickExercise({ id: 'side-plank', name: 'Side Plank', pattern: 'core', muscles: ['obliques', 'shoulders', 'glutes'], easier: 'dead-bug', harder: 'pallof-press', avoid: ['shoulders'] }),
  quickExercise({ id: 'leg-raise', name: 'Leg Raise', pattern: 'core', muscles: ['core', 'hip flexors'], difficulty: 'intermediate', easier: 'dead-bug', harder: 'hanging-knee-raise', avoid: ['lower_back'] }),
  quickExercise({ id: 'hanging-knee-raise', name: 'Hanging Knee Raise', pattern: 'core', muscles: ['core', 'hip flexors', 'forearms'], equipment: ['pull-up bar'], difficulty: 'intermediate', easier: 'leg-raise', harder: 'hollow-hold', avoid: ['shoulders', 'lower_back'] }),
  quickExercise({ id: 'russian-twist', name: 'Russian Twist', pattern: 'rotation', muscles: ['obliques', 'core'], equipment: ['bodyweight', 'dumbbell', 'medicine ball'], difficulty: 'intermediate', easier: 'dead-bug', harder: 'pallof-press', avoid: ['lower_back'] }),
  quickExercise({ id: 'mountain-climber', name: 'Mountain Climber', pattern: 'conditioning', muscles: ['core', 'shoulders', 'hip flexors'], goals: ['fat_loss', 'endurance', 'mma_bjj', 'athleticism'], sport: ['mma', 'bjj', 'wrestling'], easier: 'bear-crawl', harder: 'burpee', avoid: ['wrists', 'shoulders'] }),
  quickExercise({ id: 'bird-dog', name: 'Bird Dog', pattern: 'core', muscles: ['core', 'glutes', 'back'], easier: 'dead-bug', harder: 'bear-crawl', avoid: ['wrists'] }),
  quickExercise({ id: 'ab-wheel', name: 'Ab Wheel Rollout', pattern: 'core', muscles: ['core', 'lats', 'shoulders'], equipment: ['ab wheel'], difficulty: 'advanced', easier: 'plank', harder: 'ab-wheel', avoid: ['shoulders', 'lower_back'] }),
  quickExercise({ id: 'sprawl', name: 'Sprawl', pattern: 'conditioning', muscles: ['full body', 'hips', 'shoulders', 'core'], difficulty: 'intermediate', goals: ['mma_bjj', 'athleticism', 'fat_loss'], sport: ['mma', 'wrestling'], easier: 'squat-thrust', harder: 'sprawl-to-push-up', avoid: ['wrists', 'shoulders', 'lower_back'] }),
  quickExercise({ id: 'shrimping', name: 'Shrimping', pattern: 'conditioning', muscles: ['hips', 'core', 'glutes'], goals: ['mma_bjj', 'mobility', 'athleticism'], sport: ['bjj', 'mma'], easier: 'hip-escape', harder: 'technical-stand-up' }),
  quickExercise({ id: 'technical-stand-up', name: 'Technical Stand-Up', pattern: 'power', muscles: ['hips', 'core', 'shoulders', 'legs'], difficulty: 'intermediate', goals: ['mma_bjj', 'athleticism'], sport: ['bjj', 'mma'], easier: 'combat-base-transition', harder: 'technical-stand-up', avoid: ['wrists', 'shoulders', 'knees'] }),
  quickExercise({ id: 'shot-entry', name: 'Shot Entry', pattern: 'power', muscles: ['quads', 'glutes', 'core'], difficulty: 'intermediate', goals: ['mma_bjj', 'athleticism'], sport: ['mma', 'wrestling'], easier: 'penetration-step', harder: 'sprawl-to-shot', avoid: ['knees'] }),
  quickExercise({ id: 'penetration-step', name: 'Penetration Step', pattern: 'lunge', muscles: ['quads', 'glutes', 'core'], goals: ['mma_bjj', 'athleticism'], sport: ['mma', 'wrestling'], easier: 'reverse-lunge', harder: 'shot-entry', avoid: ['knees'] }),
  quickExercise({ id: 'hip-escape', name: 'Hip Escape', pattern: 'core', muscles: ['hips', 'obliques', 'glutes'], goals: ['mma_bjj', 'mobility'], sport: ['bjj', 'mma'], easier: 'glute-bridge', harder: 'shrimping' }),
  quickExercise({ id: 'bridge-and-roll', name: 'Bridge and Roll', pattern: 'power', muscles: ['glutes', 'core', 'back'], goals: ['mma_bjj', 'athleticism'], sport: ['bjj', 'mma'], easier: 'glute-bridge', harder: 'bridge-and-roll', avoid: ['neck', 'lower_back'] }),
  quickExercise({ id: 'shadow-boxing', name: 'Shadow Boxing Rounds', pattern: 'conditioning', muscles: ['full body', 'shoulders', 'core', 'calves'], goals: ['mma_bjj', 'endurance', 'fat_loss', 'athleticism'], sport: ['mma', 'striking'], easier: 'footwork-drill', harder: 'shadow-boxing' }),
  quickExercise({ id: 'footwork-drill', name: 'Footwork Drill', pattern: 'conditioning', muscles: ['calves', 'hips', 'core'], goals: ['mma_bjj', 'athleticism', 'endurance'], sport: ['mma', 'striking'], easier: 'marching-high-knees', harder: 'shadow-boxing', avoid: ['ankles'] }),
  quickExercise({ id: 'sprawl-to-push-up', name: 'Sprawl to Push-Up', pattern: 'conditioning', muscles: ['full body', 'chest', 'hips', 'core'], difficulty: 'advanced', goals: ['mma_bjj', 'athleticism', 'fat_loss'], sport: ['mma', 'wrestling'], easier: 'sprawl', harder: 'sprawl-to-shot', avoid: ['wrists', 'shoulders', 'lower_back'] }),
  quickExercise({ id: 'medicine-ball-slam', name: 'Medicine Ball Slam', pattern: 'power', muscles: ['lats', 'core', 'shoulders', 'hips'], equipment: ['medicine ball'], difficulty: 'intermediate', goals: ['mma_bjj', 'athleticism', 'fat_loss'], sport: ['mma', 'bjj', 'wrestling'], easier: 'battle-rope-waves', harder: 'medicine-ball-rotational-throw', avoid: ['shoulders', 'lower_back'] }),
  quickExercise({ id: 'burpee', name: 'Burpee', pattern: 'conditioning', muscles: ['full body', 'chest', 'legs', 'core'], difficulty: 'intermediate', goals: ['fat_loss', 'endurance', 'mma_bjj', 'athleticism'], sport: ['mma', 'bjj', 'wrestling'], easier: 'squat-thrust', harder: 'sprawl-to-push-up', avoid: ['wrists', 'shoulders', 'lower_back'] }),
  quickExercise({ id: 'bike-interval', name: 'Bike Intervals', pattern: 'conditioning', muscles: ['quads', 'glutes', 'cardiovascular system'], equipment: ['stationary bike', 'gym equipment'], goals: ['fat_loss', 'endurance', 'mma_bjj'], easier: 'incline-treadmill-walk', harder: 'air-bike-interval' }),
  quickExercise({ id: 'rowing-machine', name: 'Rowing Machine', pattern: 'conditioning', muscles: ['legs', 'back', 'core', 'arms'], equipment: ['rowing machine', 'gym equipment'], difficulty: 'intermediate', goals: ['fat_loss', 'endurance', 'athleticism'], easier: 'bike-interval', harder: 'sprint-interval', avoid: ['lower_back'] }),
  quickExercise({ id: 'incline-treadmill-walk', name: 'Treadmill Incline Walk', pattern: 'conditioning', muscles: ['glutes', 'calves', 'cardiovascular system'], equipment: ['treadmill', 'gym equipment'], goals: ['fat_loss', 'endurance', 'recovery'], easier: 'marching-high-knees', harder: 'sprint-interval', avoid: ['ankles'] }),
  quickExercise({ id: 'sprint-interval', name: 'Sprint Intervals', pattern: 'conditioning', muscles: ['full body', 'hamstrings', 'glutes', 'calves'], difficulty: 'advanced', goals: ['athleticism', 'mma_bjj', 'fat_loss', 'endurance'], sport: ['mma', 'wrestling'], easier: 'shuttle-run', harder: 'sprint-interval', avoid: ['hamstrings', 'knees', 'ankles'] }),
  quickExercise({ id: 'shuttle-run', name: 'Shuttle Runs', pattern: 'conditioning', muscles: ['legs', 'hips', 'cardiovascular system'], difficulty: 'intermediate', goals: ['athleticism', 'mma_bjj', 'fat_loss', 'endurance'], sport: ['mma', 'wrestling'], easier: 'footwork-drill', harder: 'sprint-interval', avoid: ['knees', 'ankles'] }),
  quickExercise({ id: 'assault-bike', name: 'Assault Bike', pattern: 'conditioning', muscles: ['full body', 'legs', 'arms', 'core'], equipment: ['assault bike', 'gym equipment'], difficulty: 'intermediate', goals: ['fat_loss', 'endurance', 'mma_bjj', 'athleticism'], easier: 'bike-interval', harder: 'air-bike-interval' }),
  quickExercise({ id: 'squat-thrust', name: 'Squat Thrust', pattern: 'conditioning', muscles: ['legs', 'core', 'shoulders'], goals: ['fat_loss', 'endurance', 'athleticism'], easier: 'bodyweight-squat', harder: 'burpee', avoid: ['wrists', 'shoulders'] }),
  quickExercise({ id: 'marching-high-knees', name: 'Marching High Knees', pattern: 'conditioning', muscles: ['hip flexors', 'calves', 'core'], goals: ['recovery', 'mobility', 'fat_loss'], easier: 'marching-high-knees', harder: 'jump-rope' }),
  quickExercise({ id: 'combat-base-transition', name: 'Combat Base Transition', pattern: 'mobility', muscles: ['hips', 'core', 'legs'], goals: ['mma_bjj', 'mobility', 'recovery'], sport: ['bjj', 'mma'], easier: 'hip-escape', harder: 'technical-stand-up', avoid: ['knees', 'wrists'] }),
];

export const exerciseLibrary: ExerciseLibraryItem[] = Array.from(
  new Map([...baseExerciseLibrary, ...requestedExerciseLibrary].map((item) => [item.id, item])).values(),
);

export type Exercise = ExerciseLibraryItem & {
  muscles: string[];
  equipment: string[];
  instructions: string[];
  mistakes: string[];
  regressions: string[];
  progressions: string[];
};

export const exercises: Exercise[] = exerciseLibrary.map((item) => ({
  ...item,
  muscles: item.musclesWorked,
  equipment: item.equipment,
  instructions: item.coachingCues,
  mistakes: item.commonMistakes,
  regressions: item.substitutions.slice(0, 2),
  progressions: item.substitutions.slice(2),
}));
