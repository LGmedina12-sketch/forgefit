'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Home,
  Library,
  Play,
  RotateCcw,
  Settings,
  Shield,
  SlidersHorizontal,
  Timer,
  TrendingUp,
  User,
  Video,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { exerciseLibrary } from '@/lib/data/exercises';
import { stretchLibrary } from '@/lib/data/mobility';
import { calibrationTests, defaultCalibrationScores, scoringAreas } from '@/lib/training/calibration';
import {
  calculateMobilityScores,
  chooseExerciseSubstitutions,
  defaultEquipmentProfile,
  equipmentProfileToList,
  generateMobilityPlan,
  generateWorkoutPlan,
  updateScoresFromFeedback,
} from '@/lib/training/recommendationEngine';
import { getVideoEmbedUrl, validateVideoLibrary, validateVideoUrl } from '@/lib/training/media';
import { planLabels, workoutTypeLabels } from '@/lib/training/scheduler';
import type {
  CalibrationResult,
  CalibrationTestKey,
  EquipmentProfile,
  ExerciseLibraryItem,
  MobilityArea,
  MobilityHistoryItem,
  MobilityScore,
  MobilitySession,
  MobilitySessionMode,
  MovementPattern,
  StretchLibraryItem,
  TrainingGoal,
  TrainingHistoryItem,
  TrainingPlanType,
  UserFeedback,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from '@/lib/training/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

type TabKey = 'home' | 'workout' | 'mobility' | 'calibration' | 'exercises' | 'stretches' | 'progress' | 'settings';
type FeedbackDraft = {
  rpe: number;
  pain: boolean;
  painAreas: MobilityArea[];
  formQuality: UserFeedback['formQuality'];
  completed: boolean;
};

const storageKeys = {
  profile: 'forgefit-v2-profile',
  equipment: 'forgefit-v2-equipment',
  calibration: 'forgefit-v2-calibration',
  mobilityScores: 'forgefit-v2-mobility-scores',
  history: 'forgefit-v2-history',
  mobilityHistory: 'forgefit-v2-mobility-history',
  feedback: 'forgefit-v2-feedback',
  generatedWorkout: 'forgefit-v3-next-workout',
  generatedMobility: 'forgefit-v3-next-mobility',
};

const tabs: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'workout', label: 'Workout', Icon: Dumbbell },
  { key: 'mobility', label: 'Mobility', Icon: Activity },
  { key: 'calibration', label: 'Calibration', Icon: SlidersHorizontal },
  { key: 'exercises', label: 'Exercises', Icon: Library },
  { key: 'stretches', label: 'Stretches', Icon: HeartPulse },
  { key: 'progress', label: 'Progress', Icon: TrendingUp },
  { key: 'settings', label: 'Settings', Icon: User },
];

const goalOptions: { label: string; value: TrainingGoal }[] = [
  { label: 'Strength', value: 'strength' },
  { label: 'Muscle', value: 'muscle' },
  { label: 'Fat loss', value: 'fat_loss' },
  { label: 'Athleticism', value: 'athleticism' },
  { label: 'MMA/BJJ support', value: 'mma_bjj' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Recovery', value: 'recovery' },
  { label: 'Conditioning', value: 'conditioning' },
  { label: 'Endurance', value: 'endurance' },
];

const planOptions: { label: string; value: TrainingPlanType }[] = [
  { label: planLabels.push_pull_legs, value: 'push_pull_legs' },
  { label: planLabels.upper_lower, value: 'upper_lower' },
  { label: planLabels.full_body, value: 'full_body' },
  { label: planLabels.mma_bjj_athletic, value: 'mma_bjj_athletic' },
  { label: planLabels.hybrid, value: 'hybrid' },
  { label: planLabels.mobility_only, value: 'mobility_only' },
];

const painOptions: MobilityArea[] = [
  'shoulders',
  'neck',
  'wrists',
  'elbows',
  'lower_back',
  'hips',
  'hip_flexors',
  'adductors',
  'hamstrings',
  'knees',
  'ankles',
  'calves',
];

const durationOptions = [10, 20, 30, 45, 60].map((minutes) => ({ label: `${minutes} minutes`, value: String(minutes) }));

const movementFilters: ('all' | MovementPattern)[] = [
  'all',
  'push',
  'pull',
  'squat',
  'hinge',
  'core',
  'carry',
  'rotation',
  'conditioning',
  'power',
  'neck',
];

const defaultEquipment = defaultEquipmentProfile();
const defaultProfile: UserProfile = {
  goal: 'mma_bjj',
  trainingPlan: 'push_pull_legs',
  equipment: equipmentProfileToList(defaultEquipment),
  trainingDaysPerWeek: 3,
  combatSchedule: { mma: 1, bjj: 2, wrestling: 1, striking: 0 },
  sorenessLevel: 3,
  readinessLevel: 76,
  painAreas: [],
  tightAreas: [],
  injuryLimitations: [],
  experienceLevel: 'intermediate',
  workoutLength: 45,
  mobilityMinutes: 20,
  onboardingComplete: false,
};

const defaultCalibrationResult: CalibrationResult = {
  completedAt: new Date().toISOString(),
  profile: defaultProfile,
  testScores: defaultCalibrationScores,
};

const defaultMobilityScores = calculateMobilityScores(defaultCalibrationResult);
const defaultFeedback: FeedbackDraft = { rpe: 7, pain: false, painAreas: [], formQuality: 'good', completed: true };

export default function Page() {
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState(isSupabaseConfigured() ? 'Sign in or create an account.' : 'Supabase is not configured, demo mode is available.');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [equipmentProfile, setEquipmentProfile] = useState<EquipmentProfile>(defaultEquipment);
  const [calibrationScores, setCalibrationScores] = useState<Record<CalibrationTestKey, number>>(defaultCalibrationScores);
  const [mobilityScores, setMobilityScores] = useState<MobilityScore[]>(defaultMobilityScores);
  const [history, setHistory] = useState<TrainingHistoryItem[]>([]);
  const [mobilityHistory, setMobilityHistory] = useState<MobilityHistoryItem[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutSession | null>(null);
  const [generatedMobility, setGeneratedMobility] = useState<MobilitySession | null>(null);
  const [mobilityMode, setMobilityMode] = useState<MobilitySessionMode>('pre_workout');
  const [statusMessage, setStatusMessage] = useState('Complete calibration or generate from defaults.');
  const [workoutFeedback, setWorkoutFeedback] = useState<FeedbackDraft>(defaultFeedback);
  const [mobilityFeedback, setMobilityFeedback] = useState<FeedbackDraft>({ ...defaultFeedback, rpe: 5 });
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState<'all' | MovementPattern>('all');
  const [stretchQuery, setStretchQuery] = useState('');
  const [stretchArea, setStretchArea] = useState<'all' | MobilityArea>('all');

  const globalMobilityScore = Math.round(mobilityScores.reduce((sum, score) => sum + score.score, 0) / Math.max(1, mobilityScores.length));
  const weakestScores = [...mobilityScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const recentPatterns = history.slice(0, 4).flatMap((item) => item.movementPatterns);
  const videoIssues = validateVideoLibrary().filter((item) => item.status === 'invalid' || item.status === 'placeholder');
  const filteredExercises = exerciseLibrary.filter((item) => {
    const query = exerciseQuery.trim().toLowerCase();
    const matchesQuery = !query || [item.name, item.category, item.movementPattern, ...item.musclesWorked, ...item.equipment].join(' ').toLowerCase().includes(query);
    const matchesFilter = exerciseFilter === 'all' || item.movementPattern === exerciseFilter;
    return matchesQuery && matchesFilter;
  });
  const filteredStretches = stretchLibrary.filter((item) => {
    const query = stretchQuery.trim().toLowerCase();
    const matchesQuery = !query || [item.name, item.category, item.phase, ...item.bodyAreas, ...item.equipment].join(' ').toLowerCase().includes(query);
    const matchesArea = stretchArea === 'all' || item.bodyAreas.includes(stretchArea);
    return matchesQuery && matchesArea;
  });

  useEffect(() => {
    const storedProfile = withProfileDefaults(readJson(storageKeys.profile, defaultProfile));
    const storedEquipment = readJson(storageKeys.equipment, defaultEquipment);
    const storedCalibration = readJson(storageKeys.calibration, defaultCalibrationScores);
    const storedScores = readJson(storageKeys.mobilityScores, defaultMobilityScores);
    const storedHistory = readJson<TrainingHistoryItem[]>(storageKeys.history, []);
    const storedMobilityHistory = readJson<MobilityHistoryItem[]>(storageKeys.mobilityHistory, []);
    const storedFeedback = readJson<UserFeedback[]>(storageKeys.feedback, []);
    const storedWorkout = readJson<WorkoutSession | null>(storageKeys.generatedWorkout, null);
    const storedMobility = readJson<MobilitySession | null>(storageKeys.generatedMobility, null);

    setProfile(storedProfile);
    setEquipmentProfile(storedEquipment);
    setCalibrationScores(storedCalibration);
    setMobilityScores(storedScores);
    setHistory(storedHistory);
    setMobilityHistory(storedMobilityHistory);
    setFeedback(storedFeedback);
    const initialWorkout = storedWorkout?.exercises ? storedWorkout : generateWorkoutPlan({ profile: storedProfile, mobilityScores: storedScores, history: storedHistory, feedback: storedFeedback });
    const initialMobility = storedMobility?.steps ? storedMobility : generateMobilityPlan({
      profile: storedProfile,
      mobilityScores: storedScores,
      mode: mobilityMode,
      timeAvailable: storedProfile.mobilityMinutes,
      feedback: storedFeedback,
      history: storedHistory,
      mobilityHistory: storedMobilityHistory,
    });
    setGeneratedWorkout(initialWorkout);
    setGeneratedMobility(initialMobility);
    writeJson(storageKeys.generatedWorkout, initialWorkout);
    writeJson(storageKeys.generatedMobility, initialMobility);

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setAuthMessage(`Signed in as ${user.email ?? 'ForgeFit athlete'}.`);

      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profileRow && typeof profileRow === 'object') {
        const mappedProfile = withProfileDefaults(mapProfileRow(profileRow as Record<string, unknown>, storedProfile));
        setProfile(mappedProfile);
        writeJson(storageKeys.profile, mappedProfile);
        const rowEquipment = Array.isArray((profileRow as Record<string, unknown>).equipment_profile)
          ? ((profileRow as Record<string, unknown>).equipment_profile as string[])
          : mappedProfile.equipment;
        setEquipmentProfile(equipmentListToProfile(rowEquipment));
        const accountWorkout = generateWorkoutPlan({ profile: mappedProfile, mobilityScores: storedScores, history: storedHistory, feedback: storedFeedback });
        const accountMobility = generateMobilityPlan({
          profile: mappedProfile,
          mobilityScores: storedScores,
          mode: mobilityMode,
          timeAvailable: mappedProfile.mobilityMinutes,
          feedback: storedFeedback,
          history: storedHistory,
          mobilityHistory: storedMobilityHistory,
        });
        setGeneratedWorkout(accountWorkout);
        setGeneratedMobility(accountMobility);
        writeJson(storageKeys.generatedWorkout, accountWorkout);
        writeJson(storageKeys.generatedMobility, accountMobility);
      }
    }

    loadSession();
  }, [supabase]);

  function updateProfile(next: Partial<UserProfile>) {
    setProfile((old) => {
      const merged = { ...old, ...next };
      writeJson(storageKeys.profile, merged);
      return merged;
    });
  }

  function toggleEquipment(key: keyof EquipmentProfile) {
    setEquipmentProfile((old) => {
      const next = { ...old, [key]: !old[key] };
      const equipment = equipmentProfileToList(next);
      writeJson(storageKeys.equipment, next);
      updateProfile({ equipment });
      return next;
    });
  }

  function selectEquipmentPreset(preset: 'bodyweight' | 'dumbbells' | 'bands' | 'pullupBar' | 'gym' | 'fullGym') {
    const next: EquipmentProfile = {
      bodyweight: true,
      dumbbells: preset === 'dumbbells' || preset === 'fullGym',
      gym: preset === 'gym' || preset === 'fullGym',
      planetFitness: false,
      bands: preset === 'bands' || preset === 'fullGym',
      pullupBar: preset === 'pullupBar' || preset === 'fullGym',
      machines: preset === 'gym' || preset === 'fullGym',
      cables: preset === 'gym' || preset === 'fullGym',
      barbell: preset === 'fullGym',
      kettlebells: preset === 'fullGym',
      medicineBall: preset === 'fullGym',
      foamRoller: preset === 'fullGym',
      bench: preset === 'dumbbells' || preset === 'gym' || preset === 'fullGym',
    };
    setEquipmentProfile(next);
    writeJson(storageKeys.equipment, next);
    updateProfile({ equipment: equipmentProfileToList(next) });
  }

  function togglePain(area: MobilityArea, target: 'profile' | 'workoutFeedback' | 'mobilityFeedback') {
    if (target === 'profile') {
      updateProfile({ painAreas: toggleList(profile.painAreas, area) });
      return;
    }

    const setter = target === 'workoutFeedback' ? setWorkoutFeedback : setMobilityFeedback;
    setter((old) => ({ ...old, painAreas: toggleList(old.painAreas, area), pain: true }));
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    if (error) return setAuthMessage(error.message);
    setUserId(data.session?.user.id ?? null);
    setUserEmail(data.session?.user.email ?? email);
    setAuthMessage(data.session ? 'Account created.' : 'Account created. Check your email if confirmation is enabled.');
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthMessage(error.message);
    setUserId(data.user?.id ?? null);
    setUserEmail(data.user?.email ?? email);
    setAuthMessage(`Welcome back, ${data.user?.email ?? email}.`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setGeneratedWorkout(null);
    setGeneratedMobility(null);
    setAuthMessage('Signed out.');
  }

  function enterDemoMode() {
    setUserId('local-demo');
    setUserEmail('demo@forgefit.local');
    setAuthMessage('Demo mode active. Data is saved locally in this browser.');
  }

  async function completeCalibration() {
    const result: CalibrationResult = {
      completedAt: new Date().toISOString(),
      profile,
      testScores: calibrationScores,
    };
    const nextScores = calculateMobilityScores(result);
    setMobilityScores(nextScores);
    writeJson(storageKeys.calibration, calibrationScores);
    writeJson(storageKeys.mobilityScores, nextScores);
    setStatusMessage('Calibration saved. Workout and mobility recommendations now use these scores.');
    const nextWorkout = generateWorkoutPlan({ profile, mobilityScores: nextScores, history, feedback });
    const nextMobility = generateMobilityPlan({ profile, mobilityScores: nextScores, mode: mobilityMode, timeAvailable: profile.mobilityMinutes, feedback, history, mobilityHistory });
    setGeneratedWorkout(nextWorkout);
    setGeneratedMobility(nextMobility);
    writeJson(storageKeys.generatedWorkout, nextWorkout);
    writeJson(storageKeys.generatedMobility, nextMobility);
    setActiveTab('home');

    if (userId && userId !== 'local-demo') {
      await supabase.from('profiles').update({
        primary_goal: profile.goal,
        experience_level: profile.experienceLevel,
        equipment_profile: profile.equipment,
        profile_completed: true,
      }).eq('id', userId);
      await supabase.from('calibration_results').insert({
        user_id: userId,
        completed_at: result.completedAt,
        test_scores: result.testScores,
        profile_snapshot: result.profile,
      });
    }
  }

  function generateWorkout() {
    const workout = generateWorkoutPlan({ profile, mobilityScores, history, feedback, generationIndex: generatedWorkout?.generationIndex ?? 0 });
    setGeneratedWorkout(workout);
    writeJson(storageKeys.generatedWorkout, workout);
    setStatusMessage(`${workout.title} recommended: ${workout.recommendationReason}`);
    setActiveTab('workout');
  }

  function regenerateWorkout() {
    const workout = generateWorkoutPlan({ profile, mobilityScores, history, feedback, generationIndex: (generatedWorkout?.generationIndex ?? 0) + 1 });
    setGeneratedWorkout(workout);
    writeJson(storageKeys.generatedWorkout, workout);
    setStatusMessage(`Workout regenerated with a different exercise mix. ${workout.recommendationReason}`);
  }

  function generateMobility() {
    const routine = generateMobilityPlan({
      profile,
      mobilityScores,
      mode: mobilityMode,
      timeAvailable: profile.mobilityMinutes,
      feedback,
      history,
      mobilityHistory,
      generationIndex: generatedMobility?.generationIndex ?? 0,
    });
    setGeneratedMobility(routine);
    writeJson(storageKeys.generatedMobility, routine);
    setStatusMessage(`${routine.title} recommended: ${routine.recommendationReason}`);
    setActiveTab('mobility');
  }

  function regenerateMobility() {
    const routine = generateMobilityPlan({
      profile,
      mobilityScores,
      mode: mobilityMode,
      timeAvailable: profile.mobilityMinutes,
      feedback,
      history,
      mobilityHistory,
      generationIndex: (generatedMobility?.generationIndex ?? 0) + 1,
    });
    setGeneratedMobility(routine);
    writeJson(storageKeys.generatedMobility, routine);
    setStatusMessage('Stretch session regenerated with different drills while keeping the same needs and recovery rules.');
  }

  async function completeOnboarding() {
    const nextProfile = { ...profile, onboardingComplete: true };
    setProfile(nextProfile);
    writeJson(storageKeys.profile, nextProfile);
    const nextWorkout = generateWorkoutPlan({ profile: nextProfile, mobilityScores, history, feedback });
    const nextMobility = generateMobilityPlan({ profile: nextProfile, mobilityScores, mode: 'recovery_day', timeAvailable: nextProfile.mobilityMinutes, feedback, history, mobilityHistory });
    setGeneratedWorkout(nextWorkout);
    setGeneratedMobility(nextMobility);
    writeJson(storageKeys.generatedWorkout, nextWorkout);
    writeJson(storageKeys.generatedMobility, nextMobility);
    setStatusMessage('Training setup saved. Your next workout and mobility session are ready.');

    if (userId && userId !== 'local-demo') {
      await supabase.from('profiles').update({
        primary_goal: nextProfile.goal,
        experience_level: nextProfile.experienceLevel,
        equipment_profile: nextProfile.equipment,
        profile_completed: true,
      }).eq('id', userId);
    }
  }

  function swapExercise(exercise: WorkoutExercise) {
    if (!generatedWorkout) return;
    const swaps = chooseExerciseSubstitutions(exercise.item, profile.equipment, profile.painAreas);
    const replacement = swaps[0];
    if (!replacement) {
      setStatusMessage('No safer substitution matched your equipment and pain settings.');
      return;
    }

    const nextWorkout = {
      ...generatedWorkout,
      exercises: generatedWorkout.exercises.map((entry) =>
        entry.item.id === exercise.item.id
          ? { ...entry, item: replacement, reason: `Swapped from ${exercise.item.name} for equipment or comfort.` }
          : entry,
      ),
    };
    setGeneratedWorkout(nextWorkout);
    writeJson(storageKeys.generatedWorkout, nextWorkout);
  }

  async function logFeedback(sessionType: UserFeedback['sessionType'], draft: FeedbackDraft) {
    const session = sessionType === 'workout' ? generatedWorkout : generatedMobility;
    if (!session) {
      setStatusMessage(`Generate a ${sessionType} first.`);
      return;
    }

    const entry: UserFeedback = {
      sessionId: session.id,
      sessionType,
      rpe: draft.rpe,
      pain: draft.pain,
      painAreas: draft.painAreas,
      formQuality: draft.formQuality,
      completed: draft.completed,
      createdAt: new Date().toISOString(),
    };
    const nextFeedback = [entry, ...feedback].slice(0, 40);
    const nextScores = updateScoresFromFeedback(mobilityScores, entry);
    setFeedback(nextFeedback);
    setMobilityScores(nextScores);
    writeJson(storageKeys.feedback, nextFeedback);
    writeJson(storageKeys.mobilityScores, nextScores);

    if (sessionType === 'workout' && generatedWorkout) {
      const nextHistory = entry.completed ? [historyFromWorkout(generatedWorkout, entry), ...history].slice(0, 30) : history;
      setHistory(nextHistory);
      writeJson(storageKeys.history, nextHistory);
      await saveWorkoutToSupabase(generatedWorkout, entry);
      const nextWorkout = generateWorkoutPlan({ profile, mobilityScores: nextScores, history: nextHistory, feedback: nextFeedback });
      const nextMobility = generateMobilityPlan({
        profile,
        mobilityScores: nextScores,
        mode: 'post_workout',
        timeAvailable: profile.mobilityMinutes,
        feedback: nextFeedback,
        history: nextHistory,
        mobilityHistory,
      });
      setGeneratedWorkout(nextWorkout);
      setGeneratedMobility(nextMobility);
      writeJson(storageKeys.generatedWorkout, nextWorkout);
      writeJson(storageKeys.generatedMobility, nextMobility);
      setStatusMessage(entry.completed
        ? `Workout completed. Next up: ${workoutTypeLabels[nextWorkout.workoutType]}.`
        : 'Workout feedback saved as partial; the split stays on the same recommendation.');
    } else if (generatedMobility) {
      const nextMobilityHistory = entry.completed ? [historyFromMobility(generatedMobility, entry), ...mobilityHistory].slice(0, 30) : mobilityHistory;
      setMobilityHistory(nextMobilityHistory);
      writeJson(storageKeys.mobilityHistory, nextMobilityHistory);
      await saveMobilityToSupabase(generatedMobility, entry);
      const nextMobility = generateMobilityPlan({
        profile,
        mobilityScores: nextScores,
        mode: mobilityMode,
        timeAvailable: profile.mobilityMinutes,
        feedback: nextFeedback,
        history,
        mobilityHistory: nextMobilityHistory,
      });
      setGeneratedMobility(nextMobility);
      writeJson(storageKeys.generatedMobility, nextMobility);
      setStatusMessage(entry.completed
        ? `Stretch session completed. Next mobility recommendation: ${nextMobility.title}.`
        : 'Mobility feedback saved as partial; the routine remains available.');
    }
  }

  async function saveWorkoutToSupabase(workout: WorkoutSession, entry: UserFeedback) {
    if (!userId || userId === 'local-demo') return;

    const { data: row } = await supabase.from('workouts').insert({
      user_id: userId,
      title: workout.title,
      goal: profile.goal,
      duration_minutes: workout.durationMinutes,
      recovery_score: profile.readinessLevel,
      status: entry.completed ? 'completed' : 'planned',
    }).select('id').single();

    const workoutId = (row as { id?: string } | null)?.id;
    if (workoutId) {
      await supabase.from('workout_exercises').insert(workout.exercises.map((exercise, index) => ({
        workout_id: workoutId,
        exercise_id: exercise.item.id,
        position: index + 1,
        target_sets: exercise.sets ?? null,
        target_reps: exercise.reps ?? `${exercise.timeSeconds ?? 0}s`,
        rest_seconds: exercise.restSeconds,
        notes: `${exercise.phase}: ${exercise.reason}`,
      })));
      await supabase.from('workout_muscle_sessions').insert({
        user_id: userId,
        workout_id: workoutId,
        trained_muscles: Array.from(new Set(workout.exercises.flatMap((exercise) => exercise.item.musclesWorked))),
        source: 'forgefit_v2',
      });
    }

    await supabase.from('user_feedback').insert({
      user_id: userId,
      session_id: workout.id,
      session_type: entry.sessionType,
      rpe: entry.rpe,
      pain: entry.pain,
      pain_areas: entry.painAreas,
      form_quality: entry.formQuality,
      completed: entry.completed,
    });
  }

  async function saveMobilityToSupabase(routine: MobilitySession, entry: UserFeedback) {
    if (!userId || userId === 'local-demo') return;

    const { data: row } = await supabase.from('mobility_sessions').insert({
      user_id: userId,
      title: routine.title,
      target_areas: routine.targetAreas,
      duration_minutes: routine.durationMinutes,
      completed_at: entry.completed ? entry.createdAt : null,
    }).select('id').single();

    const mobilitySessionId = (row as { id?: string } | null)?.id;
    if (mobilitySessionId) {
      await supabase.from('mobility_session_drills').insert(routine.steps.map((step, index) => ({
        mobility_session_id: mobilitySessionId,
        mobility_drill_id: step.item.id,
        position: index + 1,
        target_seconds: step.seconds,
        completed: entry.completed,
      })));
    }

    await supabase.from('user_feedback').insert({
      user_id: userId,
      session_id: routine.id,
      session_type: entry.sessionType,
      rpe: entry.rpe,
      pain: entry.pain,
      pain_areas: entry.painAreas,
      form_quality: entry.formQuality,
      completed: entry.completed,
    });
  }

  if (!userId) {
    return (
      <AuthScreen
        email={email}
        password={password}
        authMessage={authMessage}
        setEmail={setEmail}
        setPassword={setPassword}
        signIn={signIn}
        signUp={signUp}
        enterDemoMode={enterDemoMode}
      />
    );
  }

  if (!profile.onboardingComplete) {
    return (
      <OnboardingPanel
        profile={profile}
        updateProfile={updateProfile}
        equipmentProfile={equipmentProfile}
        selectEquipmentPreset={selectEquipmentPreset}
        completeOnboarding={completeOnboarding}
        signOut={signOut}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#070807] text-zinc-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[#070807]/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">ForgeFit</p>
              <h1 className="mt-1 text-2xl font-black tracking-normal sm:text-3xl">Athlete dashboard</h1>
            </div>
            <button onClick={signOut} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold text-zinc-100">
              <Settings className="h-4 w-4" />
              Sign out
            </button>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black ${
                  activeTab === key ? 'border-orange-300 bg-orange-500 text-black' : 'border-white/10 bg-white/10 text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            {activeTab === 'home' && (
              <HomeDashboard
                userEmail={userEmail}
                profile={profile}
                mobilityScore={globalMobilityScore}
                weakestScores={weakestScores}
                recentPatterns={recentPatterns}
                generatedWorkout={generatedWorkout}
                generatedMobility={generatedMobility}
                history={history}
                mobilityHistory={mobilityHistory}
                regenerateWorkout={regenerateWorkout}
                regenerateMobility={regenerateMobility}
                completeWorkout={() => logFeedback('workout', workoutFeedback)}
                completeMobility={() => logFeedback('mobility', mobilityFeedback)}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'workout' && (
              <WorkoutTab
                profile={profile}
                updateProfile={updateProfile}
                generatedWorkout={generatedWorkout}
                generateWorkout={generateWorkout}
                regenerateWorkout={regenerateWorkout}
                swapExercise={swapExercise}
                feedbackDraft={workoutFeedback}
                setFeedbackDraft={setWorkoutFeedback}
                togglePain={(area) => togglePain(area, 'workoutFeedback')}
                logFeedback={() => logFeedback('workout', workoutFeedback)}
              />
            )}

            {activeTab === 'mobility' && (
              <MobilityTab
                profile={profile}
                updateProfile={updateProfile}
                mobilityScores={mobilityScores}
                mode={mobilityMode}
                setMode={setMobilityMode}
                generatedMobility={generatedMobility}
                generateMobility={generateMobility}
                regenerateMobility={regenerateMobility}
                feedbackDraft={mobilityFeedback}
                setFeedbackDraft={setMobilityFeedback}
                togglePain={(area) => togglePain(area, 'mobilityFeedback')}
                logFeedback={() => logFeedback('mobility', mobilityFeedback)}
              />
            )}

            {activeTab === 'calibration' && (
              <CalibrationTab
                profile={profile}
                updateProfile={updateProfile}
                scores={calibrationScores}
                setScores={setCalibrationScores}
                togglePain={(area) => togglePain(area, 'profile')}
                completeCalibration={completeCalibration}
              />
            )}

            {activeTab === 'exercises' && (
              <ExerciseLibraryTab
                query={exerciseQuery}
                setQuery={setExerciseQuery}
                filter={exerciseFilter}
                setFilter={setExerciseFilter}
                items={filteredExercises}
              />
            )}

            {activeTab === 'stretches' && (
              <StretchLibraryTab
                query={stretchQuery}
                setQuery={setStretchQuery}
                area={stretchArea}
                setArea={setStretchArea}
                items={filteredStretches}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressTab history={history} mobilityHistory={mobilityHistory} feedback={feedback} mobilityScores={mobilityScores} />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                userEmail={userEmail}
                profile={profile}
                updateProfile={updateProfile}
                equipmentProfile={equipmentProfile}
                toggleEquipment={toggleEquipment}
                togglePain={(area) => togglePain(area, 'profile')}
              />
            )}
          </div>

          <aside className="hidden flex-col gap-4 lg:flex">
            <Panel title="Readiness" eyebrow="Today">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Energy" value={`${profile.readinessLevel}%`} tone="green" />
                <Metric label="Soreness" value={`${profile.sorenessLevel}/10`} tone={profile.sorenessLevel > 6 ? 'red' : 'amber'} />
              </div>
            </Panel>
            <Panel title="Mobility scores" eyebrow="Calibration">
              <div className="flex flex-col gap-2">
                {weakestScores.map((score) => <ScoreRow key={score.area} score={score} />)}
              </div>
            </Panel>
            <Panel title="Status" eyebrow="Engine">
              <p className="text-sm leading-6 text-zinc-300">{statusMessage}</p>
            </Panel>
            <Panel title="Video checks" eyebrow="Examples">
              <p className="text-sm leading-6 text-zinc-300">
                {videoIssues.length ? `${videoIssues.length} invalid or placeholder video URL${videoIssues.length === 1 ? '' : 's'} detected.` : 'No invalid or placeholder video URLs detected.'}
              </p>
            </Panel>
          </aside>
        </section>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070807]/95 px-3 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {tabs.slice(0, 4).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`rounded-xl px-2 py-2 text-xs font-black ${activeTab === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>
              <Icon className="mx-auto h-4 w-4" />
              <span className="mt-1 block">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function HomeDashboard({
  userEmail,
  profile,
  mobilityScore,
  weakestScores,
  recentPatterns,
  generatedWorkout,
  generatedMobility,
  history,
  mobilityHistory,
  regenerateWorkout,
  regenerateMobility,
  completeWorkout,
  completeMobility,
  setActiveTab,
}: {
  userEmail: string | null;
  profile: UserProfile;
  mobilityScore: number;
  weakestScores: MobilityScore[];
  recentPatterns: MovementPattern[];
  generatedWorkout: WorkoutSession | null;
  generatedMobility: MobilitySession | null;
  history: TrainingHistoryItem[];
  mobilityHistory: MobilityHistoryItem[];
  regenerateWorkout: () => void;
  regenerateMobility: () => void;
  completeWorkout: () => void;
  completeMobility: () => void;
  setActiveTab: (tab: TabKey) => void;
}) {
  const weeklyWorkouts = countWithinDays(history.map((item) => item.completedAt), 7);
  const weeklyMobility = countWithinDays(mobilityHistory.map((item) => item.completedAt), 7);
  const consistency = calculateConsistency([...history.map((item) => item.completedAt), ...mobilityHistory.map((item) => item.completedAt)]);

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Readiness" value={`${profile.readinessLevel}%`} detail={`${profile.sorenessLevel}/10 soreness`} />
        <StatCard icon={HeartPulse} label="Mobility" value={`${mobilityScore}`} detail={weakestScores.map((score) => formatArea(score.area)).join(', ')} />
        <StatCard icon={Shield} label="Combat load" value={`${profile.combatSchedule.mma + profile.combatSchedule.bjj + profile.combatSchedule.wrestling + profile.combatSchedule.striking}/wk`} detail={goalLabel(profile.goal)} />
        <StatCard icon={TrendingUp} label="Consistency" value={`${consistency} days`} detail={`${weeklyWorkouts} workouts, ${weeklyMobility} mobility this week`} />
      </section>

      <Panel title="Today" eyebrow={userEmail ?? 'Demo athlete'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={regenerateWorkout} className="rounded-xl border border-orange-400/30 bg-orange-500 px-4 py-4 text-left text-black">
            <Dumbbell className="h-5 w-5" />
            <span className="mt-3 block text-lg font-black">Regenerate Workout</span>
            <span className="mt-1 block text-sm font-semibold text-black/70">{planLabels[profile.trainingPlan]}, {profile.workoutLength} min</span>
          </button>
          <button onClick={regenerateMobility} className="rounded-xl border border-emerald-300/30 bg-emerald-400 px-4 py-4 text-left text-black">
            <Activity className="h-5 w-5" />
            <span className="mt-3 block text-lg font-black">Regenerate Stretch Session</span>
            <span className="mt-1 block text-sm font-semibold text-black/70">{profile.mobilityMinutes} min, history-aware</span>
          </button>
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Next workout" eyebrow={generatedWorkout ? generatedWorkout.focus : 'Not generated'}>
          {generatedWorkout ? (
            <>
              <p className="mb-3 text-sm leading-6 text-zinc-300">{generatedWorkout.recommendationReason}</p>
              <div className="mb-3 flex flex-wrap gap-2"><Tag>{generatedWorkout.title}</Tag><Tag>{generatedWorkout.intensity}</Tag><Tag>{generatedWorkout.durationMinutes} min</Tag></div>
              <CompactWorkout workout={generatedWorkout} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setActiveTab('workout')} className="h-11 rounded-lg border border-white/10 bg-white/10 text-sm font-black">Open</button>
                <button onClick={completeWorkout} className="h-11 rounded-lg bg-orange-500 text-sm font-black text-black">Complete Workout</button>
              </div>
            </>
          ) : (
            <EmptyState text="Run calibration or generate from defaults." action="Open Workout" onClick={() => setActiveTab('workout')} />
          )}
        </Panel>
        <Panel title="Next mobility" eyebrow={generatedMobility ? generatedMobility.scoreSummary : 'Not generated'}>
          {generatedMobility ? (
            <>
              <p className="mb-3 text-sm leading-6 text-zinc-300">{generatedMobility.recommendationReason}</p>
              <CompactMobility routine={generatedMobility} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setActiveTab('mobility')} className="h-11 rounded-lg border border-white/10 bg-white/10 text-sm font-black">Open</button>
                <button onClick={completeMobility} className="h-11 rounded-lg bg-emerald-400 text-sm font-black text-black">Complete Stretch Session</button>
              </div>
            </>
          ) : (
            <EmptyState text="Mobility uses your lowest scores and session mode." action="Open Mobility" onClick={() => setActiveTab('mobility')} />
          )}
        </Panel>
      </section>

      <Panel title="Last completed" eyebrow="History">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Workout" value={history[0]?.workoutType ? workoutTypeLabels[history[0].workoutType] : 'None'} tone="amber" />
          <Metric label="Stretch session" value={mobilityHistory[0]?.sessionTitle ?? 'None'} tone="green" />
        </div>
      </Panel>

      <Panel title="Recent training pressure" eyebrow="Balance">
        <div className="flex flex-wrap gap-2">
          {(recentPatterns.length ? recentPatterns : ['push', 'pull', 'squat', 'hinge', 'core'] as MovementPattern[]).slice(0, 12).map((pattern, index) => (
            <span key={`${pattern}-${index}`} className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-zinc-200">{pattern}</span>
          ))}
        </div>
      </Panel>
    </>
  );
}

function WorkoutTab({
  profile,
  updateProfile,
  generatedWorkout,
  generateWorkout,
  regenerateWorkout,
  swapExercise,
  feedbackDraft,
  setFeedbackDraft,
  togglePain,
  logFeedback,
}: {
  profile: UserProfile;
  updateProfile: (next: Partial<UserProfile>) => void;
  generatedWorkout: WorkoutSession | null;
  generateWorkout: () => void;
  regenerateWorkout: () => void;
  swapExercise: (exercise: WorkoutExercise) => void;
  feedbackDraft: FeedbackDraft;
  setFeedbackDraft: (next: FeedbackDraft | ((old: FeedbackDraft) => FeedbackDraft)) => void;
  togglePain: (area: MobilityArea) => void;
  logFeedback: () => void;
}) {
  return (
    <>
      <Panel title="Workout builder" eyebrow="Personalized">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Plan" value={profile.trainingPlan} options={planOptions} onChange={(value) => updateProfile({ trainingPlan: value as TrainingPlanType })} />
          <SelectField label="Goal" value={profile.goal} options={goalOptions} onChange={(value) => updateProfile({ goal: value as TrainingGoal })} />
          <SelectField
            label="Experience"
            value={profile.experienceLevel}
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Advanced', value: 'advanced' },
              { label: 'Competitive', value: 'competitive' },
            ]}
            onChange={(value) => updateProfile({ experienceLevel: value as UserProfile['experienceLevel'] })}
          />
          <SelectField label="Workout length" value={String(profile.workoutLength)} options={durationOptions} onChange={(value) => updateProfile({ workoutLength: Number(value) })} />
          <SliderField label="Energy readiness" value={profile.readinessLevel} min={1} max={100} suffix="%" onChange={(value) => updateProfile({ readinessLevel: value })} />
          <SliderField label="Soreness" value={profile.sorenessLevel} min={1} max={10} suffix="/10" onChange={(value) => updateProfile({ sorenessLevel: value })} />
          <SliderField label="Training days" value={profile.trainingDaysPerWeek} min={1} max={7} suffix="/wk" onChange={(value) => updateProfile({ trainingDaysPerWeek: value })} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['mma', 'bjj', 'wrestling', 'striking'] as const).map((sport) => (
            <NumberStepper
              key={sport}
              label={sport.toUpperCase()}
              value={profile.combatSchedule[sport]}
              onChange={(value) => updateProfile({ combatSchedule: { ...profile.combatSchedule, [sport]: value } })}
            />
          ))}
        </div>

        <PainPicker selected={profile.painAreas} togglePain={togglePain} />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={generateWorkout} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 font-black text-black"><Zap className="h-5 w-5" />Generate Workout</button>
          <button onClick={regenerateWorkout} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 font-black"><RotateCcw className="h-5 w-5" />Regenerate Workout</button>
        </div>
      </Panel>

      {generatedWorkout && (
        <Panel title={generatedWorkout.title} eyebrow={generatedWorkout.readinessAdjustment}>
          <div className="mb-4 rounded-xl border border-orange-300/20 bg-orange-300/10 p-3 text-sm leading-6 text-orange-100">
            <span className="font-black">{workoutTypeLabels[generatedWorkout.workoutType]}</span> - {generatedWorkout.recommendationReason}
          </div>
          {generatedWorkout.limitedMatchMessage && (
            <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-bold leading-6 text-amber-100">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {generatedWorkout.limitedMatchMessage}
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-2"><Tag>{generatedWorkout.intensity} intensity</Tag><Tag>{generatedWorkout.durationMinutes} minutes</Tag><Tag>{generatedWorkout.exercises.length} exercises</Tag></div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            {generatedWorkout.safetyNote}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {generatedWorkout.exercises.map((exercise) => (
              <ExerciseCard key={`${exercise.phase}-${exercise.item.id}`} exercise={exercise} onSwap={() => swapExercise(exercise)} />
            ))}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Cooldown mobility</h3>
            <div className="mt-3 grid gap-3">
              {generatedWorkout.mobilitySteps.map((step) => <StretchCard key={step.item.id} step={step} />)}
            </div>
          </div>
        </Panel>
      )}

      {generatedWorkout && (
        <FeedbackPanel
          title="Workout feedback"
          draft={feedbackDraft}
          setDraft={setFeedbackDraft}
          togglePain={togglePain}
          logFeedback={logFeedback}
          submitLabel="Complete Workout"
        />
      )}
    </>
  );
}

function MobilityTab({
  profile,
  updateProfile,
  mobilityScores,
  mode,
  setMode,
  generatedMobility,
  generateMobility,
  regenerateMobility,
  feedbackDraft,
  setFeedbackDraft,
  togglePain,
  logFeedback,
}: {
  profile: UserProfile;
  updateProfile: (next: Partial<UserProfile>) => void;
  mobilityScores: MobilityScore[];
  mode: MobilitySessionMode;
  setMode: (mode: MobilitySessionMode) => void;
  generatedMobility: MobilitySession | null;
  generateMobility: () => void;
  regenerateMobility: () => void;
  feedbackDraft: FeedbackDraft;
  setFeedbackDraft: (next: FeedbackDraft | ((old: FeedbackDraft) => FeedbackDraft)) => void;
  togglePain: (area: MobilityArea) => void;
  logFeedback: () => void;
}) {
  return (
    <>
      <Panel title="Mobility scores" eyebrow="1-100 by area">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {mobilityScores.map((score) => <ScoreCard key={score.area} score={score} />)}
        </div>
      </Panel>

      <Panel title="Routine builder" eyebrow="Adaptive sequence">
        <div className="grid gap-3 sm:grid-cols-3">
          {(['pre_workout', 'post_workout', 'recovery_day'] as MobilitySessionMode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${mode === item ? 'border-emerald-300 bg-emerald-400 text-black' : 'border-white/10 bg-white/10 text-zinc-200'}`}
            >
              {item.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectField label="Time available" value={String(profile.mobilityMinutes)} options={durationOptions} onChange={(value) => updateProfile({ mobilityMinutes: Number(value) })} />
          <SliderField label="Energy readiness" value={profile.readinessLevel} min={1} max={100} suffix="%" onChange={(value) => updateProfile({ readinessLevel: value })} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Tight areas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {painOptions.map((area) => <button key={area} onClick={() => updateProfile({ tightAreas: toggleList(profile.tightAreas ?? [], area) })} className={`rounded-full px-3 py-2 text-xs font-black ${(profile.tightAreas ?? []).includes(area) ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-200'}`}>{formatArea(area)}</button>)}
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={generateMobility} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-black text-black"><Activity className="h-5 w-5" />Generate Stretch Session</button>
          <button onClick={regenerateMobility} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 font-black"><RotateCcw className="h-5 w-5" />Regenerate Stretch Session</button>
        </div>
      </Panel>

      {generatedMobility && (
        <Panel title={generatedMobility.title} eyebrow={generatedMobility.scoreSummary}>
          <div className="mb-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-100">
            {generatedMobility.recommendationReason} {generatedMobility.progressionNote}
          </div>
          <div className="mb-4 flex flex-wrap gap-2"><Tag>{generatedMobility.durationMinutes} minutes</Tag><Tag>{generatedMobility.steps.length} movements</Tag></div>
          <div className="mb-4 flex flex-wrap gap-2">
            {generatedMobility.targetAreas.map((area) => <Tag key={area}>{formatArea(area)}</Tag>)}
          </div>
          <div className="grid gap-3">
            {generatedMobility.steps.map((step) => <StretchCard key={step.item.id} step={step} />)}
          </div>
        </Panel>
      )}

      {generatedMobility && (
        <FeedbackPanel
          title="Mobility feedback"
          draft={feedbackDraft}
          setDraft={setFeedbackDraft}
          togglePain={togglePain}
          logFeedback={logFeedback}
          submitLabel="Complete Stretch Session"
        />
      )}
    </>
  );
}

function CalibrationTab({
  profile,
  updateProfile,
  scores,
  setScores,
  togglePain,
  completeCalibration,
}: {
  profile: UserProfile;
  updateProfile: (next: Partial<UserProfile>) => void;
  scores: Record<CalibrationTestKey, number>;
  setScores: (scores: Record<CalibrationTestKey, number>) => void;
  togglePain: (area: MobilityArea) => void;
  completeCalibration: () => void;
}) {
  return (
    <>
      <Panel title="Profile setup" eyebrow="Step 1">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Training plan" value={profile.trainingPlan} options={planOptions} onChange={(value) => updateProfile({ trainingPlan: value as TrainingPlanType })} />
          <SelectField label="Main goal" value={profile.goal} options={goalOptions} onChange={(value) => updateProfile({ goal: value as TrainingGoal })} />
          <SelectField
            label="Experience"
            value={profile.experienceLevel}
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Advanced', value: 'advanced' },
              { label: 'Competitive', value: 'competitive' },
            ]}
            onChange={(value) => updateProfile({ experienceLevel: value as UserProfile['experienceLevel'] })}
          />
          <SliderField label="Training days" value={profile.trainingDaysPerWeek} min={1} max={7} suffix="/wk" onChange={(value) => updateProfile({ trainingDaysPerWeek: value })} />
          <SelectField label="Workout length" value={String(profile.workoutLength)} options={durationOptions} onChange={(value) => updateProfile({ workoutLength: Number(value) })} />
        </div>
        <PainPicker selected={profile.painAreas} togglePain={togglePain} />
      </Panel>

      <Panel title="Sport schedule" eyebrow="Step 2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['mma', 'bjj', 'wrestling', 'striking'] as const).map((sport) => (
            <NumberStepper
              key={sport}
              label={sport.toUpperCase()}
              value={profile.combatSchedule[sport]}
              onChange={(value) => updateProfile({ combatSchedule: { ...profile.combatSchedule, [sport]: value } })}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Mobility self-tests" eyebrow="Step 3">
        <div className="flex flex-col gap-4">
          {calibrationTests.map((test) => (
            <article key={test.id} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{formatArea(test.area)}</p>
                  <h3 className="mt-1 text-lg font-black">{test.name}</h3>
                </div>
                <span className="rounded-xl bg-white px-3 py-2 text-sm font-black text-black">{scores[test.id]}</span>
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-zinc-300">
                {test.instructions.map((item) => <li key={item}>{item}</li>)}
              </ol>
              <p className="mt-3 text-sm text-zinc-400">{test.scoring}</p>
              <p className="mt-2 text-xs font-bold text-zinc-500">{test.example}</p>
              <input
                className="mt-4 w-full accent-orange-500"
                type="range"
                min="1"
                max="100"
                value={scores[test.id]}
                onChange={(event) => setScores({ ...scores, [test.id]: Number(event.target.value) })}
              />
            </article>
          ))}
        </div>
        <button onClick={completeCalibration} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-black text-black">
          <CheckCircle2 className="h-5 w-5" />
          Complete calibration
        </button>
      </Panel>
    </>
  );
}

function ExerciseLibraryTab({
  query,
  setQuery,
  filter,
  setFilter,
  items,
}: {
  query: string;
  setQuery: (value: string) => void;
  filter: 'all' | MovementPattern;
  setFilter: (value: 'all' | MovementPattern) => void;
  items: ExerciseLibraryItem[];
}) {
  return (
    <Panel title="Exercise library" eyebrow={`${items.length} movements`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movements" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none" />
        <select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | MovementPattern)} className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none">
          {movementFilters.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => <ExerciseLibraryCard key={item.id} item={item} />)}
      </div>
    </Panel>
  );
}

function StretchLibraryTab({
  query,
  setQuery,
  area,
  setArea,
  items,
}: {
  query: string;
  setQuery: (value: string) => void;
  area: 'all' | MobilityArea;
  setArea: (value: 'all' | MobilityArea) => void;
  items: StretchLibraryItem[];
}) {
  return (
    <Panel title="Stretch library" eyebrow={`${items.length} drills`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stretches" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none" />
        <select value={area} onChange={(event) => setArea(event.target.value as 'all' | MobilityArea)} className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none">
          <option value="all">all</option>
          {scoringAreas.map((item) => <option key={item} value={item}>{formatArea(item)}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.map((item) => <StretchLibraryCard key={item.id} item={item} />)}
      </div>
    </Panel>
  );
}

function ProgressTab({
  history,
  mobilityHistory,
  feedback,
  mobilityScores,
}: {
  history: TrainingHistoryItem[];
  mobilityHistory: MobilityHistoryItem[];
  feedback: UserFeedback[];
  mobilityScores: MobilityScore[];
}) {
  const patternCounts = history.flatMap((item) => item.movementPatterns).reduce<Record<string, number>>((acc, pattern) => {
    acc[pattern] = (acc[pattern] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Panel title="Movement balance" eyebrow="Recent sessions">
        <div className="grid gap-2 sm:grid-cols-4">
          {Object.entries(patternCounts).length ? Object.entries(patternCounts).map(([pattern, count]) => (
            <Metric key={pattern} label={pattern} value={String(count)} tone="green" />
          )) : <p className="text-sm text-zinc-400">Complete a session to start building history.</p>}
        </div>
      </Panel>
      <Panel title="Workout history" eyebrow={`${history.length} completed`}>
        <div className="flex flex-col gap-2">
          {history.slice(0, 8).map((item) => (
            <div key={`${item.sessionTitle}-${item.completedAt}`} className="rounded-xl bg-black/25 px-4 py-3 text-sm text-zinc-300">
              <span className="font-black text-white">{item.sessionTitle ?? workoutTypeLabels[item.workoutType ?? 'full_body']}</span> - {item.workoutType ? workoutTypeLabels[item.workoutType] : 'Workout'} - RPE {item.rpe}
            </div>
          ))}
          {!history.length && <p className="text-sm text-zinc-400">No completed workouts yet.</p>}
        </div>
      </Panel>
      <Panel title="Stretch history" eyebrow={`${mobilityHistory.length} completed`}>
        <div className="flex flex-col gap-2">
          {mobilityHistory.slice(0, 8).map((item) => (
            <div key={`${item.sessionTitle}-${item.completedAt}`} className="rounded-xl bg-black/25 px-4 py-3 text-sm text-zinc-300">
              <span className="font-black text-white">{item.sessionTitle}</span> - {item.durationMinutes} min - {item.targetAreas.map(formatArea).join(', ')}
            </div>
          ))}
          {!mobilityHistory.length && <p className="text-sm text-zinc-400">No completed stretch sessions yet.</p>}
        </div>
      </Panel>
      <Panel title="Mobility trend" eyebrow="Scores">
        <div className="grid gap-3 sm:grid-cols-3">
          {mobilityScores.map((score) => <ScoreCard key={score.area} score={score} />)}
        </div>
      </Panel>
      <Panel title="Feedback log" eyebrow={`${feedback.length} entries`}>
        <div className="flex flex-col gap-2">
          {feedback.slice(0, 10).map((item) => (
            <div key={`${item.sessionId}-${item.createdAt}`} className="rounded-xl bg-black/25 px-4 py-3 text-sm text-zinc-300">
              <span className="font-black text-white">{item.sessionType}</span> - RPE {item.rpe} - {item.completed ? 'completed' : 'partial'} - {item.pain ? `pain: ${item.painAreas.map(formatArea).join(', ')}` : 'no pain'}
            </div>
          ))}
          {!feedback.length && <p className="text-sm text-zinc-400">No feedback logged yet.</p>}
        </div>
      </Panel>
    </>
  );
}

function SettingsTab({
  userEmail,
  profile,
  updateProfile,
  equipmentProfile,
  toggleEquipment,
  togglePain,
}: {
  userEmail: string | null;
  profile: UserProfile;
  updateProfile: (next: Partial<UserProfile>) => void;
  equipmentProfile: EquipmentProfile;
  toggleEquipment: (key: keyof EquipmentProfile) => void;
  togglePain: (area: MobilityArea) => void;
}) {
  return (
    <>
      <Panel title="Profile" eyebrow={userEmail ?? 'Local athlete'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Training plan" value={profile.trainingPlan} options={planOptions} onChange={(value) => updateProfile({ trainingPlan: value as TrainingPlanType })} />
          <SelectField label="Goal" value={profile.goal} options={goalOptions} onChange={(value) => updateProfile({ goal: value as TrainingGoal })} />
          <SelectField
            label="Experience"
            value={profile.experienceLevel}
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Advanced', value: 'advanced' },
              { label: 'Competitive', value: 'competitive' },
            ]}
            onChange={(value) => updateProfile({ experienceLevel: value as UserProfile['experienceLevel'] })}
          />
          <SliderField label="Training days" value={profile.trainingDaysPerWeek} min={1} max={7} suffix="/wk" onChange={(value) => updateProfile({ trainingDaysPerWeek: value })} />
          <SelectField label="Workout length" value={String(profile.workoutLength)} options={durationOptions} onChange={(value) => updateProfile({ workoutLength: Number(value) })} />
          <SelectField label="Mobility length" value={String(profile.mobilityMinutes)} options={durationOptions} onChange={(value) => updateProfile({ mobilityMinutes: Number(value) })} />
          <SelectField label="Soreness" value={profile.sorenessLevel >= 8 ? 'high' : profile.sorenessLevel >= 5 ? 'medium' : 'low'} options={[
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
          ]} onChange={(value) => updateProfile({ sorenessLevel: value === 'high' ? 9 : value === 'medium' ? 6 : 3 })} />
        </div>
      </Panel>
      <Panel title="Equipment profile" eyebrow={`${profile.equipment.length} options`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(equipmentProfile) as (keyof EquipmentProfile)[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleEquipment(key)}
              className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-black ${equipmentProfile[key] ? 'border-orange-300 bg-orange-500 text-black' : 'border-white/10 bg-white/10 text-zinc-200'}`}
            >
              {splitCamel(key)}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Pain and limitations" eyebrow="Safety">
        <PainPicker selected={profile.painAreas} togglePain={togglePain} />
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Tight areas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {painOptions.map((area) => <button key={area} onClick={() => updateProfile({ tightAreas: toggleList(profile.tightAreas ?? [], area) })} className={`rounded-full px-3 py-2 text-xs font-black ${(profile.tightAreas ?? []).includes(area) ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-200'}`}>{formatArea(area)}</button>)}
          </div>
        </div>
        <label className="mt-4 block rounded-lg border border-white/10 bg-black/25 p-3">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Injury limitations</span>
          <textarea value={(profile.injuryLimitations ?? []).join('\n')} onChange={(event) => updateProfile({ injuryLimitations: event.target.value ? [event.target.value] : [] })} rows={3} className="mt-2 w-full resize-none bg-transparent text-sm outline-none" />
        </label>
      </Panel>
    </>
  );
}

function ExerciseCard({ exercise, onSwap }: { exercise: WorkoutExercise; onSwap: () => void }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">{exercise.phase} - {exercise.item.movementPattern}</p>
          <h3 className="mt-1 text-xl font-black">{exercise.item.name}</h3>
          <p className="mt-1 text-sm text-zinc-300">
            {exercise.timeSeconds
              ? `${exercise.sets ?? 1} rounds - ${exercise.timeSeconds}s`
              : `${exercise.sets ?? 1} sets - ${exercise.reps ?? 'controlled reps'}`} - rest {exercise.restSeconds}s - {exercise.rpeTarget}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{exercise.item.description}</p>
        </div>
        <DifficultyTag value={exercise.item.difficulty} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {exercise.item.equipment.map((item) => <Tag key={item}>{item}</Tag>)}
        {exercise.item.musclesWorked.slice(0, 4).map((item) => <Tag key={item}>{item}</Tag>)}
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{exercise.reason}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{exercise.progression}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg bg-white/5 p-3 text-sm text-zinc-300"><span className="font-black text-white">Easier:</span> {exercise.item.easierAlternative || 'Reduce load, range, or incline'}</p>
        <p className="rounded-lg bg-white/5 p-3 text-sm text-zinc-300"><span className="font-black text-white">Harder:</span> {exercise.item.harderAlternative || 'Add controlled reps or load'}</p>
      </div>
      {!!exercise.item.injuryWarnings.length && <p className="mt-3 text-sm font-bold text-amber-200">{exercise.item.injuryWarnings.join(' ')}</p>}
      <InstructionList items={exercise.item.coachingCues} />
      <MovementDetails cues={exercise.item.coachingCues} mistakes={exercise.item.commonMistakes} />
      <VideoMeta item={exercise.item} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <VideoButton item={exercise.item} />
        <button onClick={onSwap} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 text-sm font-black text-zinc-100">
          <RotateCcw className="h-4 w-4" />
          Swap
        </button>
      </div>
    </article>
  );
}

function StretchCard({ step }: { step: MobilitySession['steps'][number] }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{step.phase} - {step.sets} set{step.sets === 1 ? '' : 's'} - {step.reps ?? `${step.seconds}s`}</p>
          <h3 className="mt-1 text-lg font-black">{step.item.name}</h3>
          <p className="mt-1 text-sm text-zinc-300">{step.reason}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{step.item.description}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300"><span className="font-black">When:</span> {step.item.whenToUse}</p>
        </div>
        <DifficultyTag value={step.item.difficulty} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {step.item.bodyAreas.map((area) => <Tag key={area}>{formatArea(area)}</Tag>)}
        {step.item.equipment.map((item) => <Tag key={item}>{item}</Tag>)}
      </div>
      <InstructionList items={step.item.coachingCues} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg bg-white/5 p-3 text-sm text-zinc-300"><span className="font-black text-white">Easier:</span> {step.item.easierAlternative || 'Use support and reduce the range'}</p>
        <p className="rounded-lg bg-white/5 p-3 text-sm text-zinc-300"><span className="font-black text-white">Harder:</span> {step.item.harderAlternative || 'Add active control or a longer hold'}</p>
      </div>
      {!!step.item.injuryWarnings.length && <p className="mt-3 text-sm font-bold text-amber-200">{step.item.injuryWarnings.join(' ')}</p>}
      <MovementDetails cues={step.item.coachingCues} mistakes={step.item.commonMistakes} />
      <VideoMeta item={step.item} />
      <div className="mt-4">
        <VideoButton item={step.item} />
      </div>
    </article>
  );
}

function ExerciseLibraryCard({ item }: { item: ExerciseLibraryItem }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">{item.movementPattern}</p>
          <h3 className="mt-1 text-lg font-black">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
        </div>
        <DifficultyTag value={item.difficulty} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.equipment.slice(0, 4).map((equipment) => <Tag key={equipment}>{equipment}</Tag>)}
        {item.musclesWorked.slice(0, 4).map((muscle) => <Tag key={muscle}>{muscle}</Tag>)}
      </div>
      <InstructionList items={item.coachingCues} />
      <p className="mt-3 text-sm text-zinc-300"><span className="font-black text-white">Easier:</span> {item.easierAlternative || 'Reduce load or range'} <span className="ml-2 font-black text-white">Harder:</span> {item.harderAlternative || 'Add reps or load'}</p>
      <MovementDetails cues={item.coachingCues} mistakes={item.commonMistakes} />
      <VideoMeta item={item} />
      <div className="mt-4">
        <VideoButton item={item} />
      </div>
    </article>
  );
}

function StretchLibraryCard({ item }: { item: StretchLibraryItem }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{item.phase}</p>
          <h3 className="mt-1 text-lg font-black">{item.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
        </div>
        <DifficultyTag value={item.difficulty} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.bodyAreas.map((area) => <Tag key={area}>{formatArea(area)}</Tag>)}
        {item.equipment.map((equipment) => <Tag key={equipment}>{equipment}</Tag>)}
      </div>
      <InstructionList items={item.coachingCues} />
      <p className="mt-3 text-sm text-zinc-300"><span className="font-black text-white">When:</span> {item.whenToUse}</p>
      <p className="mt-2 text-sm text-zinc-300"><span className="font-black text-white">Easier:</span> {item.easierAlternative || 'Reduce the range'} <span className="ml-2 font-black text-white">Harder:</span> {item.harderAlternative || 'Use more active control'}</p>
      <MovementDetails cues={item.coachingCues} mistakes={item.commonMistakes} />
      <VideoMeta item={item} />
      <div className="mt-4">
        <VideoButton item={item} />
      </div>
    </article>
  );
}

function FeedbackPanel({
  title,
  draft,
  setDraft,
  togglePain,
  logFeedback,
  submitLabel,
}: {
  title: string;
  draft: FeedbackDraft;
  setDraft: (next: FeedbackDraft | ((old: FeedbackDraft) => FeedbackDraft)) => void;
  togglePain: (area: MobilityArea) => void;
  logFeedback: () => void;
  submitLabel: string;
}) {
  return (
    <Panel title={title} eyebrow="Adjust next recommendation">
      <div className="grid gap-3 sm:grid-cols-3">
        <SliderField label="Difficulty RPE" value={draft.rpe} min={1} max={10} suffix="/10" onChange={(value) => setDraft((old) => ({ ...old, rpe: value }))} />
        <SelectField
          label="Form quality"
          value={draft.formQuality}
          options={[
            { label: 'Poor', value: 'poor' },
            { label: 'OK', value: 'ok' },
            { label: 'Good', value: 'good' },
          ]}
          onChange={(value) => setDraft((old) => ({ ...old, formQuality: value as UserFeedback['formQuality'] }))}
        />
        <button onClick={() => setDraft((old) => ({ ...old, completed: !old.completed }))} className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${draft.completed ? 'border-emerald-300 bg-emerald-400 text-black' : 'border-white/10 bg-white/10 text-zinc-200'}`}>
          {draft.completed ? 'Completed' : 'Partial'}
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-3">
        <span className="text-sm font-black">Pain or bad irritation?</span>
        <button onClick={() => setDraft((old) => ({ ...old, pain: !old.pain }))} className={`rounded-xl px-4 py-2 text-sm font-black ${draft.pain ? 'bg-red-400 text-black' : 'bg-white/10 text-zinc-200'}`}>
          {draft.pain ? 'Pain noted' : 'No pain'}
        </button>
      </div>
      {draft.pain && <PainPicker selected={draft.painAreas} togglePain={togglePain} />}
      <button onClick={logFeedback} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-black text-black">
        <CheckCircle2 className="h-5 w-5" />
        {submitLabel}
      </button>
    </Panel>
  );
}

function OnboardingPanel({
  profile,
  updateProfile,
  equipmentProfile,
  selectEquipmentPreset,
  completeOnboarding,
  signOut,
}: {
  profile: UserProfile;
  updateProfile: (next: Partial<UserProfile>) => void;
  equipmentProfile: EquipmentProfile;
  selectEquipmentPreset: (preset: 'bodyweight' | 'dumbbells' | 'bands' | 'pullupBar' | 'gym' | 'fullGym') => void;
  completeOnboarding: () => void;
  signOut: () => void;
}) {
  const soreness = profile.sorenessLevel >= 8 ? 'high' : profile.sorenessLevel >= 5 ? 'medium' : 'low';
  const equipmentChoices = [
    { key: 'bodyweight' as const, label: 'Bodyweight only', active: equipmentProfile.bodyweight && !equipmentProfile.dumbbells && !equipmentProfile.bands && !equipmentProfile.gym },
    { key: 'dumbbells' as const, label: 'Dumbbells', active: equipmentProfile.dumbbells && !equipmentProfile.gym },
    { key: 'bands' as const, label: 'Resistance bands', active: equipmentProfile.bands && !equipmentProfile.gym },
    { key: 'pullupBar' as const, label: 'Pull-up bar', active: equipmentProfile.pullupBar && !equipmentProfile.gym },
    { key: 'gym' as const, label: 'Gym equipment', active: equipmentProfile.gym && !equipmentProfile.barbell },
    { key: 'fullGym' as const, label: 'Full gym', active: equipmentProfile.gym && equipmentProfile.barbell },
  ];

  return (
    <main className="min-h-screen bg-[#070807] px-4 py-6 text-white sm:px-6">
      <section className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">ForgeFit setup</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Build your training profile</h1>
          </div>
          <button onClick={signOut} className="h-10 rounded-lg border border-white/10 bg-white/10 px-3 text-sm font-black">Sign out</button>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Panel title="Training" eyebrow="Profile">
            <div className="grid gap-3">
              <SelectField label="Fitness level" value={profile.experienceLevel} options={[
                { label: 'Beginner', value: 'beginner' },
                { label: 'Intermediate', value: 'intermediate' },
                { label: 'Advanced', value: 'advanced' },
              ]} onChange={(value) => updateProfile({ experienceLevel: value as UserProfile['experienceLevel'] })} />
              <SelectField label="Main goal" value={profile.goal} options={goalOptions} onChange={(value) => updateProfile({ goal: value as TrainingGoal })} />
              <SelectField label="Preferred split" value={profile.trainingPlan} options={planOptions} onChange={(value) => updateProfile({ trainingPlan: value as TrainingPlanType })} />
              <SelectField label="Workout time" value={String(profile.workoutLength)} options={durationOptions} onChange={(value) => updateProfile({ workoutLength: Number(value) })} />
              <SelectField label="Mobility time" value={String(profile.mobilityMinutes)} options={durationOptions} onChange={(value) => updateProfile({ mobilityMinutes: Number(value) })} />
              <SelectField label="Soreness" value={soreness} options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
              ]} onChange={(value) => updateProfile({ sorenessLevel: value === 'high' ? 9 : value === 'medium' ? 6 : 3 })} />
            </div>
          </Panel>

          <Panel title="Available equipment" eyebrow="Training access">
            <div className="grid grid-cols-2 gap-2">
              {equipmentChoices.map((choice) => (
                <button key={choice.key} onClick={() => selectEquipmentPreset(choice.key)} className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-black ${choice.active ? 'border-orange-300 bg-orange-500 text-black' : 'border-white/10 bg-white/10 text-zinc-200'}`}>
                  {choice.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Tight areas" eyebrow="Mobility focus">
            <div className="flex flex-wrap gap-2">
              {painOptions.map((area) => (
                <button key={area} onClick={() => updateProfile({ tightAreas: toggleList(profile.tightAreas ?? [], area) })} className={`rounded-full px-3 py-2 text-xs font-black ${(profile.tightAreas ?? []).includes(area) ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-200'}`}>
                  {formatArea(area)}
                </button>
              ))}
            </div>
            <label className="mt-4 block rounded-lg border border-white/10 bg-black/25 p-3">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Injury limitations</span>
              <textarea value={(profile.injuryLimitations ?? []).join('\n')} onChange={(event) => updateProfile({ injuryLimitations: event.target.value ? [event.target.value] : [] })} rows={3} placeholder="List movements or areas to avoid" className="mt-2 w-full resize-none bg-transparent text-sm text-white outline-none" />
            </label>
          </Panel>

          <Panel title="MMA and BJJ schedule" eyebrow="Sessions per week">
            <div className="grid grid-cols-2 gap-3">
              {(['mma', 'bjj', 'wrestling', 'striking'] as const).map((sport) => (
                <NumberStepper key={sport} label={sport.toUpperCase()} value={profile.combatSchedule[sport]} onChange={(value) => updateProfile({ combatSchedule: { ...profile.combatSchedule, [sport]: value } })} />
              ))}
            </div>
          </Panel>
        </div>

        <button onClick={completeOnboarding} className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 font-black text-black">
          <CheckCircle2 className="h-5 w-5" />
          Save setup and build my plan
        </button>
      </section>

    </main>
  );
}

function AuthScreen({
  email,
  password,
  authMessage,
  setEmail,
  setPassword,
  signIn,
  signUp,
  enterDemoMode,
}: {
  email: string;
  password: string;
  authMessage: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  signIn: () => void;
  signUp: () => void;
  enterDemoMode: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#070807] px-4 py-8 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-4">
        <div className="rounded-xl border border-white/10 bg-white/10 p-5 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">ForgeFit</p>
          <h1 className="mt-2 text-3xl font-black">Sign in</h1>
          <div className="mt-5 flex flex-col gap-3">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" className="h-12 rounded-xl border border-white/10 bg-black/30 px-4 font-semibold outline-none" />
            <button onClick={signIn} className="h-12 rounded-xl bg-orange-500 px-4 font-black text-black">Sign in</button>
            <button onClick={signUp} className="h-12 rounded-xl border border-white/10 bg-white/10 px-4 font-black text-white">Create account</button>
            <button onClick={enterDemoMode} className="h-12 rounded-xl border border-emerald-300/30 bg-emerald-400 px-4 font-black text-black">Demo mode</button>
          </div>
        </div>
        <p className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-orange-100">{authMessage}</p>
      </section>
    </main>
  );
}

function CompactWorkout({ workout }: { workout: WorkoutSession }) {
  return (
    <div className="flex flex-col gap-2">
      {workout.limitedMatchMessage && <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{workout.limitedMatchMessage}</p>}
      {workout.exercises.slice(0, 4).map((exercise) => (
        <div key={exercise.item.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-4 py-3">
          <span className="font-bold">{exercise.item.name}</span>
          <span className="text-xs font-black text-orange-300">{exercise.phase}</span>
        </div>
      ))}
    </div>
  );
}

function CompactMobility({ routine }: { routine: MobilitySession }) {
  return (
    <div className="flex flex-col gap-2">
      {routine.steps.slice(0, 4).map((step) => (
        <div key={step.item.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-4 py-3">
          <span className="font-bold">{step.item.name}</span>
          <span className="text-xs font-black text-emerald-300">{step.seconds}s</span>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black tracking-normal">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-zinc-400">{label}</span>
        <Icon className="h-5 w-5 text-orange-300" />
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 min-h-5 text-xs font-semibold text-zinc-400">{detail}</p>
    </section>
  );
}

function Metric({ label, value, tone = 'green' }: { label: string; value: string; tone?: 'green' | 'amber' | 'red' }) {
  const color = tone === 'red' ? 'text-red-200 bg-red-500/15' : tone === 'amber' ? 'text-amber-100 bg-amber-400/15' : 'text-emerald-100 bg-emerald-400/15';
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#11140f] px-3 text-sm font-bold text-white outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function SliderField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
        {label}
        <span className="rounded-lg bg-white px-2 py-1 text-black">{value}{suffix}</span>
      </span>
      <input className="mt-3 w-full accent-orange-500" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function NumberStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="h-9 w-9 rounded-lg bg-white/10 font-black">-</button>
        <span className="text-xl font-black">{value}</span>
        <button onClick={() => onChange(Math.min(7, value + 1))} className="h-9 w-9 rounded-lg bg-orange-500 font-black text-black">+</button>
      </div>
    </div>
  );
}

function PainPicker({ selected, togglePain }: { selected: MobilityArea[]; togglePain: (area: MobilityArea) => void }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Pain or tightness areas</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {painOptions.map((area) => (
          <button key={area} onClick={() => togglePain(area)} className={`rounded-full px-3 py-2 text-xs font-black ${selected.includes(area) ? 'bg-red-400 text-black' : 'bg-white/10 text-zinc-200'}`}>
            {formatArea(area)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ score }: { score: MobilityScore }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">{formatArea(score.area)}</p>
        <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-black">{score.score}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${score.score < 55 ? 'bg-red-400' : score.score < 75 ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${score.score}%` }} />
      </div>
    </div>
  );
}

function ScoreRow({ score }: { score: MobilityScore }) {
  return (
    <div className="rounded-xl bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-black">{formatArea(score.area)}</span>
        <span className="font-black">{score.score}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${score.score}%` }} />
      </div>
    </div>
  );
}

function InstructionList({ items }: { items: string[] }) {
  return (
    <div className="mt-3 rounded-xl bg-white/5 p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Step-by-step instructions</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-zinc-300">
        {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ol>
    </div>
  );
}

function VideoMeta({ item }: { item: { videoUrl: string; videoAvailable: boolean } }) {
  return (
    <div className="mt-3 rounded-xl bg-white/5 p-3 font-mono text-[11px] leading-5 text-zinc-400">
      <p>videoAvailable: {item.videoAvailable ? 'true' : 'false'}</p>
      <p className="break-words">videoUrl: {item.videoAvailable ? item.videoUrl : 'none'}</p>
    </div>
  );
}

function MovementDetails({ cues, mistakes }: { cues: string[]; mistakes: string[] }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl bg-emerald-400/10 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Cues</p>
        <p className="mt-2 text-sm text-zinc-300">{cues.slice(0, 3).join(' - ')}</p>
      </div>
      <div className="rounded-xl bg-red-400/10 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">Mistakes</p>
        <p className="mt-2 text-sm text-zinc-300">{mistakes.slice(0, 3).join(' - ')}</p>
      </div>
    </div>
  );
}

function VideoButton({ item }: { item: { name: string; videoUrl: string; videoAvailable: boolean } }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const validation = validateVideoUrl(item.videoUrl, item.videoAvailable);
  const embedUrl = item.videoAvailable && validation.status === 'valid' ? getVideoEmbedUrl(item.videoUrl) : '';

  if (!embedUrl) {
    return (
      <div className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-center text-sm font-black text-zinc-400">
        Video example coming soon
      </div>
    );
  }

  return (
    <>
      <button onClick={() => { setFailed(false); setOpen(true); }} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-black">
        <Video className="h-4 w-4" />
        Watch example
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-[#080a0f] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h2 className="text-base font-black">{item.name}</h2>
              <button onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white" aria-label="Close video">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {!failed ? (
                <iframe
                  title={`${item.name} video example`}
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onError={() => setFailed(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm font-bold text-zinc-300">
                  Video example coming soon
                </div>
              )}
            </div>
            <p className="px-4 py-3 text-sm text-zinc-400">{validation.message}</p>
          </section>
        </div>
      )}
    </>
  );
}

function DifficultyTag({ value }: { value: string }) {
  const tone = value === 'advanced' ? 'bg-red-400/15 text-red-100' : value === 'intermediate' ? 'bg-amber-300/15 text-amber-100' : 'bg-emerald-400/15 text-emerald-100';
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{value}</span>;
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">{children}</span>;
}

function EmptyState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
      <p className="text-sm text-zinc-400">{text}</p>
      <button onClick={onClick} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-black">
        <Play className="h-4 w-4" />
        {action}
      </button>
    </div>
  );
}

function historyFromWorkout(workout: WorkoutSession, entry: UserFeedback): TrainingHistoryItem {
  return {
    completedAt: entry.createdAt,
    sessionTitle: workout.title,
    workoutType: workout.workoutType,
    muscles: Array.from(new Set(workout.exercises.flatMap((exercise) => exercise.item.musclesWorked.map((muscle) => muscle.toLowerCase())))),
    movementPatterns: Array.from(new Set(workout.exercises.map((exercise) => exercise.item.movementPattern))),
    rpe: entry.rpe,
    pain: entry.pain,
    durationMinutes: workout.durationMinutes,
    intensity: workout.intensity,
    exerciseIds: workout.exercises.map((exercise) => exercise.item.id),
  };
}

function historyFromMobility(routine: MobilitySession, entry: UserFeedback): MobilityHistoryItem {
  return {
    completedAt: entry.createdAt,
    sessionTitle: routine.title,
    targetAreas: routine.targetAreas,
    drillIds: routine.steps.map((step) => step.item.id),
    durationMinutes: routine.durationMinutes,
    rpe: entry.rpe,
    pain: entry.pain,
  };
}

function withProfileDefaults(profile: UserProfile): UserProfile {
  return {
    ...defaultProfile,
    ...profile,
    trainingPlan: profile.trainingPlan ?? defaultProfile.trainingPlan,
    equipment: profile.equipment?.length ? profile.equipment : defaultProfile.equipment,
    combatSchedule: { ...defaultProfile.combatSchedule, ...(profile.combatSchedule ?? {}) },
    painAreas: profile.painAreas ?? [],
    tightAreas: profile.tightAreas ?? [],
    injuryLimitations: profile.injuryLimitations ?? [],
    onboardingComplete: profile.onboardingComplete ?? false,
  };
}

function mapProfileRow(row: Record<string, unknown>, fallback: UserProfile): UserProfile {
  const goalText = String(row.primary_goal ?? row.goal ?? '').toLowerCase();
  const experienceText = String(row.experience_level ?? row.training_experience ?? fallback.experienceLevel).toLowerCase();
  const planText = String(row.training_plan ?? row.split_plan ?? fallback.trainingPlan).toLowerCase();
  return {
    ...fallback,
    goal: goalText.includes('strength') ? 'strength' : goalText.includes('muscle') ? 'muscle' : goalText.includes('fat') ? 'fat_loss' : goalText.includes('conditioning') ? 'conditioning' : goalText.includes('endurance') ? 'endurance' : goalText.includes('recovery') ? 'recovery' : goalText.includes('mobility') ? 'mobility' : goalText.includes('mma') || goalText.includes('bjj') ? 'mma_bjj' : fallback.goal,
    trainingPlan: planText.includes('hybrid') ? 'hybrid' : planText.includes('upper') ? 'upper_lower' : planText.includes('full') ? 'full_body' : planText.includes('mobility') ? 'mobility_only' : planText.includes('mma') || planText.includes('bjj') ? 'mma_bjj_athletic' : 'push_pull_legs',
    experienceLevel: experienceText.includes('beginner') ? 'beginner' : experienceText.includes('advanced') ? 'advanced' : experienceText.includes('competitive') ? 'competitive' : 'intermediate',
    equipment: Array.isArray(row.equipment_profile) ? row.equipment_profile as string[] : fallback.equipment,
    painAreas: Array.isArray(row.limitations) ? mapLimitationsToPain(row.limitations as string[]) : fallback.painAreas,
    tightAreas: Array.isArray(row.tight_areas) ? row.tight_areas as MobilityArea[] : fallback.tightAreas,
    injuryLimitations: Array.isArray(row.limitations) ? row.limitations as string[] : fallback.injuryLimitations,
    onboardingComplete: Boolean(row.profile_completed ?? fallback.onboardingComplete),
  };
}

function countWithinDays(dates: string[], days: number) {
  const cutoff = Date.now() - days * 86400000;
  return dates.filter((date) => new Date(date).getTime() >= cutoff).length;
}

function calculateConsistency(dates: string[]) {
  const completedDays = new Set(dates.map((value) => new Date(value).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 365; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!completedDays.has(key)) {
      if (index === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function mapLimitationsToPain(limitations: string[]): MobilityArea[] {
  const text = limitations.join(' ').toLowerCase();
  return painOptions.filter((area) => text.includes(formatArea(area)) || areaAliasesForProfile(area).some((alias) => text.includes(alias)));
}

function areaAliasesForProfile(area: MobilityArea) {
  if (area === 'lower_back') return ['back', 'low back'];
  if (area === 'hip_flexors') return ['hip flexor'];
  if (area === 'thoracic_spine') return ['t spine', 'upper back'];
  return [area];
}

function equipmentListToProfile(list: string[]): EquipmentProfile {
  const text = list.join(' ').toLowerCase();
  return {
    bodyweight: true,
    dumbbells: text.includes('dumbbell'),
    gym: text.includes('gym'),
    planetFitness: text.includes('planet'),
    bands: text.includes('band'),
    pullupBar: text.includes('pull'),
    machines: text.includes('machine'),
    cables: text.includes('cable'),
    barbell: text.includes('barbell'),
    kettlebells: text.includes('kettlebell'),
    medicineBall: text.includes('medicine'),
    foamRoller: text.includes('foam'),
    bench: text.includes('bench'),
  };
}

function toggleList<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatArea(area: MobilityArea) {
  return area.replaceAll('_', ' ');
}

function splitCamel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function goalLabel(goal: TrainingGoal) {
  return goalOptions.find((item) => item.value === goal)?.label ?? goal;
}
