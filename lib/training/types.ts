export type TrainingGoal =
  | 'strength'
  | 'muscle'
  | 'fat_loss'
  | 'athleticism'
  | 'mma_bjj'
  | 'mobility'
  | 'endurance';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'competitive';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type VideoType = 'youtube' | 'local' | 'external';

export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'core'
  | 'carry'
  | 'rotation'
  | 'conditioning'
  | 'power'
  | 'neck'
  | 'mobility';

export type MobilityArea =
  | 'hips'
  | 'ankles'
  | 'hamstrings'
  | 'shoulders'
  | 'thoracic_spine'
  | 'neck'
  | 'wrists'
  | 'lower_back'
  | 'adductors'
  | 'hip_flexors'
  | 'rotation'
  | 'knees'
  | 'elbows'
  | 'glutes'
  | 'quads';

export type MobilitySessionMode = 'pre_workout' | 'post_workout' | 'recovery_day';
export type MobilityPhase = 'dynamic' | 'main' | 'static' | 'foam_roll' | 'breathing';
export type ExercisePhase = 'warmup' | 'main' | 'accessory' | 'conditioning' | 'cooldown' | 'mobility';

export type CombatSchedule = {
  mma: number;
  bjj: number;
  wrestling: number;
  striking: number;
};

export type EquipmentProfile = {
  bodyweight: boolean;
  dumbbells: boolean;
  gym: boolean;
  planetFitness: boolean;
  bands: boolean;
  pullupBar: boolean;
  machines: boolean;
  cables: boolean;
  barbell: boolean;
  kettlebells: boolean;
  medicineBall: boolean;
  foamRoller: boolean;
  bench: boolean;
};

export type UserProfile = {
  id?: string;
  displayName?: string;
  goal: TrainingGoal;
  equipment: string[];
  trainingDaysPerWeek: number;
  combatSchedule: CombatSchedule;
  sorenessLevel: number;
  readinessLevel: number;
  painAreas: MobilityArea[];
  experienceLevel: ExperienceLevel;
  workoutLength: number;
  mobilityMinutes: number;
};

export type CalibrationTestKey =
  | 'deep_squat'
  | 'shoulder_overhead_reach'
  | 'ankle_knee_to_wall'
  | 'hip_rotation'
  | 'hamstring_reach'
  | 'thoracic_rotation'
  | 'wrist_extension';

export type CalibrationSelfTest = {
  id: CalibrationTestKey;
  name: string;
  area: MobilityArea;
  instructions: string[];
  scoring: string;
  example: string;
};

export type CalibrationResult = {
  completedAt: string;
  profile: UserProfile;
  testScores: Record<CalibrationTestKey, number>;
};

export type MobilityScore = {
  area: MobilityArea;
  score: number;
  updatedAt: string;
  source: 'calibration' | 'feedback' | 'manual';
};

export type MediaFields = {
  videoUrl: string;
  thumbnailUrl: string;
  videoType: VideoType;
};

export type ExerciseLibraryItem = MediaFields & {
  id: string;
  name: string;
  category: string;
  movementPattern: MovementPattern;
  coachingCues: string[];
  commonMistakes: string[];
  musclesWorked: string[];
  equipment: string[];
  difficulty: Difficulty;
  goalTags: TrainingGoal[];
  sportTags: string[];
  avoidWithPain?: MobilityArea[];
  substitutions: string[];
};

export type StretchLibraryItem = MediaFields & {
  id: string;
  name: string;
  category: string;
  bodyAreas: MobilityArea[];
  phase: MobilityPhase;
  durationSeconds: number;
  coachingCues: string[];
  commonMistakes: string[];
  equipment: string[];
  difficulty: Difficulty;
  sportTags: string[];
};

export type WorkoutExercise = {
  item: ExerciseLibraryItem;
  phase: ExercisePhase;
  sets?: number;
  reps?: string;
  timeSeconds?: number;
  restSeconds: number;
  rpeTarget: string;
  reason: string;
  progression: string;
};

export type WorkoutSession = {
  id: string;
  title: string;
  focus: string;
  durationMinutes: number;
  readinessAdjustment: string;
  safetyNote: string;
  patternBalance: Record<MovementPattern, number>;
  exercises: WorkoutExercise[];
  mobilitySteps: MobilitySessionStep[];
};

export type MobilitySessionStep = {
  item: StretchLibraryItem;
  phase: MobilityPhase;
  seconds: number;
  reason: string;
};

export type MobilitySession = {
  id: string;
  title: string;
  mode: MobilitySessionMode;
  durationMinutes: number;
  targetAreas: MobilityArea[];
  scoreSummary: string;
  steps: MobilitySessionStep[];
};

export type UserFeedback = {
  sessionId: string;
  sessionType: 'workout' | 'mobility';
  rpe: number;
  pain: boolean;
  painAreas: MobilityArea[];
  formQuality: 'poor' | 'ok' | 'good';
  completed: boolean;
  notes?: string;
  createdAt: string;
};

export type TrainingHistoryItem = {
  completedAt: string;
  muscles: string[];
  movementPatterns: MovementPattern[];
  rpe: number;
  pain: boolean;
};
