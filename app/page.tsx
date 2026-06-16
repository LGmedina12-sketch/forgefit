'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type DbExercise = { id: string; name: string; muscle_groups: string[]; equipment_needed: string[]; difficulty: string; category: string; instructions: string[] };
type DbMobility = { id: string; name: string; target_area: string; duration_seconds: number; difficulty: string; equipment_needed: string[]; instructions: string[] };
type GeneratedExercise = DbExercise & { sets: number; reps: string; restSeconds: number };
type SavedWorkout = { id: string; title: string; goal: string; duration_minutes: number; recovery_score: number | null; status: string; created_at: string };
type TabKey = 'train' | 'mobility' | 'library' | 'history';
type SourceKey = 'gowod' | 'forgefit';
type Area = 'Shoulders' | 'Overhead' | 'Thorax' | 'Hips' | 'Postchain' | 'Ankles';
type SplitKey = 'full' | 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'ppl' | 'mma';
type SplitProgramKey = 'ppl' | 'upper_lower' | 'arnold' | 'mma_hybrid' | 'custom';
type MobilityMode = 'pre' | 'post' | 'daily' | 'recovery';
type MobilityActivity = 'lifting' | 'legs' | 'push' | 'pull' | 'running' | 'mma' | 'general';
type SplitDay = { label: string; split: SplitKey; muscles: string[]; activity: MobilityActivity };
type MobilityTest = { id: string; title: string; area: Area; target: string; instruction: string; cue: string; fix: string };

const tabs: { key: TabKey; label: string }[] = [
  { key: 'train', label: 'Train' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'library', label: 'Library' },
  { key: 'history', label: 'History' },
];

const goalOptions = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const equipmentOptions = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box', 'medicine ball'];
const mobilityEquipmentOptions = ['bodyweight', 'wall', 'bench', 'resistance band', 'foam roller', 'dumbbell', 'box'];
const muscleOptions = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];
const originalGowodGlobal = 89;

const splitOptions: { key: SplitKey; label: string; muscles: string[]; activity: MobilityActivity }[] = [
  { key: 'full', label: 'Full body', muscles: ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes'], activity: 'lifting' },
  { key: 'push', label: 'Push', muscles: ['chest', 'shoulders', 'core'], activity: 'push' },
  { key: 'pull', label: 'Pull', muscles: ['back', 'shoulders', 'core'], activity: 'pull' },
  { key: 'legs', label: 'Legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
  { key: 'upper', label: 'Upper', muscles: ['back', 'chest', 'shoulders', 'core'], activity: 'lifting' },
  { key: 'lower', label: 'Lower', muscles: ['legs', 'glutes', 'hamstrings', 'quads'], activity: 'legs' },
  { key: 'ppl', label: 'PPL rotation', muscles: ['chest', 'back', 'shoulders', 'legs', 'core'], activity: 'lifting' },
  { key: 'mma', label: 'MMA hybrid', muscles: ['back', 'legs', 'core', 'shoulders', 'glutes', 'hamstrings'], activity: 'mma' },
];

const programLabels: Record<SplitProgramKey, string> = {
  ppl: 'Push / Pull / Legs',
  upper_lower: 'Upper / Lower',
  arnold: 'Arnold-ish',
  mma_hybrid: 'MMA hybrid',
  custom: 'My custom split',
};

const defaultCustomDays: SplitDay[] = [
  { label: 'Custom 1', split: 'full', muscles: ['back', 'legs', 'core'], activity: 'lifting' },
  { label: 'Custom 2', split: 'push', muscles: ['chest', 'shoulders', 'core'], activity: 'push' },
  { label: 'Custom 3', split: 'pull', muscles: ['back', 'shoulders', 'core'], activity: 'pull' },
];

const splitPrograms: Record<Exclude<SplitProgramKey, 'custom'>, SplitDay[]> = {
  ppl: [
    { label: 'Push', split: 'push', muscles: ['chest', 'shoulders', 'core'], activity: 'push' },
    { label: 'Pull', split: 'pull', muscles: ['back', 'shoulders', 'core'], activity: 'pull' },
    { label: 'Legs', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
  ],
  upper_lower: [
    { label: 'Upper', split: 'upper', muscles: ['back', 'chest', 'shoulders', 'core'], activity: 'lifting' },
    { label: 'Lower', split: 'lower', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
  ],
  arnold: [
    { label: 'Chest + Back', split: 'upper', muscles: ['chest', 'back', 'core'], activity: 'lifting' },
    { label: 'Shoulders + Core', split: 'push', muscles: ['shoulders', 'core', 'chest'], activity: 'push' },
    { label: 'Legs', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads'], activity: 'legs' },
  ],
  mma_hybrid: [
    { label: 'MMA strength', split: 'mma', muscles: ['back', 'legs', 'core', 'shoulders'], activity: 'mma' },
    { label: 'Explosive lower', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
    { label: 'Upper power', split: 'upper', muscles: ['back', 'chest', 'shoulders', 'core'], activity: 'mma' },
    { label: 'Conditioning/core', split: 'full', muscles: ['core', 'legs', 'back', 'shoulders'], activity: 'mma' },
  ],
};

const originalGowodScores: Record<Area, number> = { Shoulders: 91, Overhead: 88, Thorax: 99, Hips: 98, Postchain: 22, Ankles: 100 };
const targetByArea: Record<Area, string> = { Shoulders: 'shoulders', Overhead: 'shoulders', Thorax: 'thoracic spine', Hips: 'hips', Postchain: 'hamstrings', Ankles: 'ankles' };
const activityAreaBoosts: Record<MobilityActivity, Area[]> = { lifting: ['Hips', 'Thorax', 'Shoulders', 'Postchain'], legs: ['Postchain', 'Hips', 'Ankles'], push: ['Shoulders', 'Overhead', 'Thorax'], pull: ['Thorax', 'Shoulders', 'Postchain'], running: ['Ankles', 'Postchain', 'Hips'], mma: ['Hips', 'Thorax', 'Shoulders', 'Postchain', 'Ankles'], general: ['Postchain', 'Hips', 'Shoulders'] };

const mobilityTests: MobilityTest[] = [
  { id: 'hips-squat', title: 'Deep squat depth', area: 'Hips', target: 'hips', instruction: 'Stand shoulder-width, feet flat, then sink as low as you can without your heels lifting.', cue: 'Knees track over toes, chest tall, heels down.', fix: 'Use squat pries, 90/90 switches, and lizard stretch.' },
  { id: 'hips-9090', title: '90/90 hip switch', area: 'Hips', target: 'hips', instruction: 'Sit in a 90/90 and rate how cleanly both hips rotate without using your hands.', cue: 'Tall chest, rotate from the hip.', fix: 'Use 90/90 switches, pigeon, and figure-four work.' },
  { id: 'hips-lunge', title: 'Hip flexor lunge', area: 'Hips', target: 'hips', instruction: 'Half-kneel, tuck pelvis, then slide forward until the front hip opens.', cue: 'Back glute squeezed, ribs down.', fix: 'Use couch stretch, hip flexor rocks, and lizard stretch.' },
  { id: 'ankles-wall', title: 'Knee-to-wall', area: 'Ankles', target: 'ankles', instruction: 'Keep your heel planted and drive your knee toward the wall.', cue: 'Heel down, knee tracks over toes.', fix: 'Use knee-to-wall rocks and calf wall stretches.' },
  { id: 'shoulders-overhead', title: 'Overhead reach', area: 'Overhead', target: 'shoulders', instruction: 'Reach overhead without flaring ribs or arching your lower back.', cue: 'Ribs down, biceps near ears.', fix: 'Use wall slides, lat reach, and shoulder flexion work.' },
  { id: 'thoracic-openbook', title: 'Open-book rotation', area: 'Thorax', target: 'thoracic spine', instruction: 'Lie on side, knees stacked, and rotate the top arm open.', cue: 'Move from upper back.', fix: 'Use open books and side-lying windmills.' },
  { id: 'postchain-toe', title: 'Toe touch', area: 'Postchain', target: 'hamstrings', instruction: 'Hinge forward and rate how close your hands get to your toes.', cue: 'Soft knees, long spine.', fix: 'Use hamstring flosses and squat-to-hamstring reaches.' },
  { id: 'postchain-leg', title: 'Straight-leg raise', area: 'Postchain', target: 'hamstrings', instruction: 'Lie down and lift one straight leg while the other stays on the floor.', cue: 'Knee mostly straight, pelvis still.', fix: 'Use hamstring floss and calf/hamstring mobility.' },
];

const initialScores = mobilityTests.reduce((acc, test) => ({ ...acc, [test.id]: 60 }), {} as Record<string, number>);

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('Sign in to start training.');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [mobility, setMobility] = useState<DbMobility[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [goal, setGoal] = useState('MMA performance');
  const [duration, setDuration] = useState(45);
  const [recovery, setRecovery] = useState(75);
  const [split, setSplit] = useState<SplitKey>('mma');
  const [splitProgram, setSplitProgram] = useState<SplitProgramKey>('ppl');
  const [activeSplitDay, setActiveSplitDay] = useState(0);
  const [customDays, setCustomDays] = useState<SplitDay[]>(defaultCustomDays);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [selectedMobilityEquipment, setSelectedMobilityEquipment] = useState<string[]>(['bodyweight', 'wall', 'bench']);
  const [priorities, setPriorities] = useState<string[]>(['chest', 'shoulders', 'core']);
  const [generated, setGenerated] = useState<GeneratedExercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [workoutRerolls, setWorkoutRerolls] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [source, setSource] = useState<SourceKey>('gowod');
  const [gowodAdjustments, setGowodAdjustments] = useState<Record<Area, number>>(originalGowodScores);
  const [mobilityMode, setMobilityMode] = useState<MobilityMode>('pre');
  const [mobilityActivity, setMobilityActivity] = useState<MobilityActivity>('push');
  const [mobilityMinutes, setMobilityMinutes] = useState(8);
  const [routineShuffle, setRoutineShuffle] = useState(0);
  const [generatedMobility, setGeneratedMobility] = useState<DbMobility[]>([]);
  const [mobilitySessionHistory, setMobilitySessionHistory] = useState<string[][]>([]);
  const [routineMessage, setRoutineMessage] = useState('Generate a routine. Last 3 routines are blocked from repeating when possible.');
  const [activeTab, setActiveTab] = useState<TabKey>('train');
  const [workoutMessage, setWorkoutMessage] = useState('');

  const currentProgramDays = splitProgram === 'custom' ? customDays : splitPrograms[splitProgram];
  const forgefitAreaScores = getForgefitAreaScores(scores);
  const activeAreaScores = source === 'gowod' ? getGowodAreaScores(gowodAdjustments) : forgefitAreaScores;
  const mobilityAverage = source === 'gowod' ? getAdjustedGowodGlobal(gowodAdjustments) : Math.round(activeAreaScores.reduce((total, item) => total + item.score, 0) / activeAreaScores.length);
  const recentMobilityIds = mobilitySessionHistory.flat();
  const routinePlan = buildMobilityRoutine(activeAreaScores, mobility, mobilityActivity, mobilityMode, mobilityMinutes, routineShuffle, selectedMobilityEquipment, recentMobilityIds);
  const weakestAreas = routinePlan.weakestAreas;
  const recommendedDrills = generatedMobility.length ? generatedMobility : routinePlan.drills;

  useEffect(() => {
    const saved = window.localStorage.getItem('forgefit-custom-split-days');
    const savedProgram = window.localStorage.getItem('forgefit-split-program') as SplitProgramKey | null;
    if (saved) {
      try { setCustomDays(JSON.parse(saved)); } catch {}
    }
    if (savedProgram && ['ppl', 'upper_lower', 'arnold', 'mma_hybrid', 'custom'].includes(savedProgram)) setSplitProgram(savedProgram);
  }, []);

  useEffect(() => { window.localStorage.setItem('forgefit-custom-split-days', JSON.stringify(customDays)); }, [customDays]);
  useEffect(() => { window.localStorage.setItem('forgefit-split-program', splitProgram); }, [splitProgram]);

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;
      setUserId(currentUser?.id ?? null);
      setUserEmail(currentUser?.email ?? null);
      setAuthMessage(currentUser?.email ? `Welcome back, ${currentUser.email}` : 'Sign in to start training.');
      const [{ data: exerciseRows }, { data: mobilityRows }] = await Promise.all([
        supabase.from('exercises').select('*').order('name'),
        supabase.from('mobility_drills').select('*').order('target_area'),
      ]);
      setExercises((exerciseRows as DbExercise[]) ?? []);
      setMobility((mobilityRows as DbMobility[]) ?? []);
      if (currentUser) await Promise.all([loadSavedWorkouts(), loadRecentMobilityHistory()]);
    }
    loadData();
  }, [supabase]);

  async function loadSavedWorkouts() {
    const { data } = await supabase.from('workouts').select('id, title, goal, duration_minutes, recovery_score, status, created_at').order('created_at', { ascending: false }).limit(8);
    setSavedWorkouts((data as SavedWorkout[]) ?? []);
  }

  async function loadRecentMobilityHistory() {
    const { data } = await supabase.from('mobility_sessions').select('id, mobility_session_drills(mobility_drill_id, position)').order('created_at', { ascending: false }).limit(3);
    const rows = (data ?? []) as { mobility_session_drills?: { mobility_drill_id: string; position: number }[] }[];
    setMobilitySessionHistory(rows.map((session) => (session.mobility_session_drills ?? []).sort((a, b) => a.position - b.position).map((item) => item.mobility_drill_id)).filter((s) => s.length).slice(0, 3));
  }

  async function signUp() {
    setAuthMessage('Creating your account...');
    const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    if (error) return setAuthMessage(error.message);
    setUserId(data.session?.user.id ?? null);
    setUserEmail(data.session?.user.email ?? null);
    setAuthMessage(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email, then sign in.');
  }

  async function signIn() {
    setAuthMessage('Signing in...');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthMessage(error.message);
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? null);
    setAuthMessage(`Welcome back, ${data.user.email}`);
    await Promise.all([loadSavedWorkouts(), loadRecentMobilityHistory()]);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null); setUserEmail(null); setGenerated([]); setSavedWorkouts([]); setGeneratedMobility([]); setMobilitySessionHistory([]); setAuthMessage('Signed out.');
  }

  function applySplitDay(day: SplitDay, index: number) {
    setActiveSplitDay(index);
    setSplit(day.split);
    setPriorities(day.muscles);
    setMobilityActivity(day.activity);
    setWorkoutMessage(`${day.label} selected. Muscle focus updated automatically.`);
  }

  function saveCurrentFocusToCustomDay() {
    const next = [...customDays];
    const safeIndex = Math.min(activeSplitDay, next.length - 1);
    next[safeIndex] = { label: next[safeIndex]?.label ?? `Custom ${safeIndex + 1}`, split, muscles: priorities, activity: mobilityActivity };
    setCustomDays(next);
    setSplitProgram('custom');
    setWorkoutMessage(`Saved current focus to ${next[safeIndex].label}.`);
  }

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function buildWorkout() {
    const reroll = workoutRerolls + 1;
    const count = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const goalText = goal.toLowerCase();
    const splitTargets = priorities;
    const scored = exercises.map((exercise) => {
      if (!matchesEquipment(exercise.equipment_needed, selectedEquipment)) return { exercise, score: -999 };
      let score = 10;
      score += exercise.muscle_groups.filter((muscle) => priorities.includes(muscle)).length * 6;
      score += exercise.muscle_groups.filter((muscle) => splitTargets.includes(muscle)).length * 3;
      if (goalText.includes('mma') && ['power', 'conditioning', 'core'].includes(exercise.category)) score += 6;
      if (split === 'legs' || split === 'lower') score += exercise.muscle_groups.some((m) => ['legs', 'glutes', 'hamstrings', 'quads'].includes(m)) ? 7 : -4;
      if (split === 'push') score += exercise.muscle_groups.some((m) => ['chest', 'shoulders'].includes(m)) ? 7 : -5;
      if (split === 'pull') score += exercise.muscle_groups.some((m) => ['back'].includes(m)) ? 8 : -4;
      if (goalText.includes('strength') && exercise.category === 'strength') score += 6;
      if (goalText.includes('muscle') && exercise.category === 'hypertrophy') score += 6;
      if (goalText.includes('conditioning') && exercise.category === 'conditioning') score += 7;
      if (goalText.includes('lose') && ['conditioning', 'core'].includes(exercise.category)) score += 5;
      if (goalText.includes('athletic') && ['power', 'conditioning'].includes(exercise.category)) score += 6;
      if (recovery < 55 && exercise.difficulty === 'advanced') score -= 5;
      if (recentExerciseIds.includes(exercise.id)) score -= 9;
      score += Math.random() * 12;
      return { exercise, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);

    const chosen: DbExercise[] = [];
    getWorkoutCategoryPlan(split, goal, count).forEach((category) => {
      const pool = scored.filter((item) => !chosen.some((picked) => picked.id === item.exercise.id) && (item.exercise.category === category || category === 'any'));
      const fallbackPool = scored.filter((item) => !chosen.some((picked) => picked.id === item.exercise.id));
      const usePool = pool.length ? pool : fallbackPool;
      if (!usePool.length) return;
      const pickWindow = usePool.slice(0, Math.min(6, usePool.length));
      chosen.push(pickWindow[Math.floor(Math.random() * pickWindow.length)].exercise);
    });
    while (chosen.length < count) {
      const pool = scored.filter((item) => !chosen.some((picked) => picked.id === item.exercise.id)).slice(0, 10);
      if (!pool.length) break;
      chosen.push(pool[Math.floor(Math.random() * pool.length)].exercise);
    }
    const nextWorkout = chosen.slice(0, count).map((exercise, index) => ({ ...exercise, sets: recovery < 55 ? 2 : goalText.includes('muscle') ? 4 : index === 0 ? 4 : 3, reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : goalText.includes('strength') ? '4-6' : '8-12', restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' || goalText.includes('strength') ? 120 : 75 }));
    setGenerated(nextWorkout); setWorkoutRerolls(reroll); setRecentExerciseIds((previous) => [...nextWorkout.map((exercise) => exercise.id), ...previous].slice(0, 14));
    setWorkoutMessage(nextWorkout.length ? `Workout reroll #${reroll}. Press generate again if you do not like it.` : 'No exercises matched your equipment. Add more equipment or change your goal.');
  }

  function generateMobilityRoutine() {
    const nextShuffle = routineShuffle + 1;
    const nextPlan = buildMobilityRoutine(activeAreaScores, mobility, mobilityActivity, mobilityMode, mobilityMinutes, nextShuffle, selectedMobilityEquipment, mobilitySessionHistory.flat());
    setRoutineShuffle(nextShuffle); setGeneratedMobility(nextPlan.drills); setMobilitySessionHistory((previous) => [nextPlan.drills.map((drill) => drill.id), ...previous].slice(0, 3));
    setRoutineMessage(nextPlan.drills.length ? `Generated routine #${nextShuffle}. These drills are blocked for the next 3 generated routines when enough alternatives exist.` : 'No matching mobility drills. Add equipment or change activity.');
  }

  async function completeMobilitySession() {
    if (!userId) return setRoutineMessage('Sign in before saving mobility sessions.');
    if (!recommendedDrills.length) return setRoutineMessage('Generate a routine first.');
    const secondsEach = Math.max(1, Math.round((mobilityMinutes * 60) / recommendedDrills.length));
    const { data: sessionRow, error: sessionError } = await supabase.from('mobility_sessions').insert({ user_id: userId, title: `${mobilityMode} ${mobilityActivity} mobility`, target_areas: weakestAreas, duration_minutes: mobilityMinutes, completed_at: new Date().toISOString() }).select('id').single();
    if (sessionError || !sessionRow) return setRoutineMessage(sessionError?.message ?? 'Could not save mobility session.');
    const drillRows = recommendedDrills.map((drill, index) => ({ mobility_session_id: sessionRow.id, mobility_drill_id: drill.id, position: index + 1, target_seconds: secondsEach, completed: true }));
    const { error: drillError } = await supabase.from('mobility_session_drills').insert(drillRows);
    if (drillError) return setRoutineMessage(drillError.message);
    setMobilitySessionHistory((previous) => [recommendedDrills.map((drill) => drill.id), ...previous].slice(0, 3)); setRoutineMessage('Mobility session saved. These drills will stay blocked for the next 3 routines when possible.');
  }

  async function saveWorkout() {
    if (!userId) return setWorkoutMessage('Sign in before saving workouts.');
    if (!generated.length) return setWorkoutMessage('Generate a workout first.');
    setWorkoutMessage('Saving workout...');
    const { data: workoutRow, error: workoutError } = await supabase.from('workouts').insert({ user_id: userId, title: `${goal} ${currentProgramDays[activeSplitDay]?.label ?? split} session`, goal, duration_minutes: duration, recovery_score: recovery, status: 'planned' }).select('id').single();
    if (workoutError || !workoutRow) return setWorkoutMessage(workoutError?.message ?? 'Workout could not be saved.');
    const rows = generated.map((exercise, index) => ({ workout_id: workoutRow.id, exercise_id: exercise.id, position: index + 1, target_sets: exercise.sets, target_reps: exercise.reps, rest_seconds: exercise.restSeconds, notes: exercise.instructions?.[0] ?? '' }));
    const { error: exerciseError } = await supabase.from('workout_exercises').insert(rows);
    if (exerciseError) return setWorkoutMessage(exerciseError.message);
    setWorkoutMessage('Workout saved.'); await loadSavedWorkouts();
  }

  if (!userId) return <AuthScreen email={email} password={password} authMessage={authMessage} setEmail={setEmail} setPassword={setPassword} signIn={signIn} signUp={signUp} />;

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-orange-200/80">Welcome, {userEmail}</p><h1 className="mt-1 text-3xl font-black tracking-tight">Today&apos;s plan</h1><p className="mt-2 text-sm text-zinc-300">Split programs, custom muscle focus, adaptive workouts, and tracked mobility.</p></div><button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button></div>
          <div className="mt-4 grid grid-cols-4 gap-2">{tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-2xl px-3 py-3 text-xs font-black ${activeTab === tab.key ? 'bg-white text-black' : 'bg-white/10 text-zinc-200'}`}>{tab.label}</button>)}</div>
        </header>

        {activeTab === 'train' && <section className="flex flex-col gap-5">
          <Panel title="Split program" eyebrow="Set it once, tap the day">
            <div className="grid grid-cols-2 gap-2">{(Object.keys(programLabels) as SplitProgramKey[]).map((key) => <button key={key} onClick={() => { setSplitProgram(key); setActiveSplitDay(0); const day = (key === 'custom' ? customDays : splitPrograms[key])[0]; applySplitDay(day, 0); }} className={`rounded-2xl px-3 py-3 text-xs font-black ${splitProgram === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{programLabels[key]}</button>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">{currentProgramDays.map((day, index) => <button key={`${day.label}-${index}`} onClick={() => applySplitDay(day, index)} className={`rounded-2xl px-3 py-3 text-xs font-black ${activeSplitDay === index ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{day.label}</button>)}</div>
            <p className="mt-3 text-xs text-zinc-400">Selected: <span className="font-black text-orange-300">{currentProgramDays[activeSplitDay]?.label}</span> → {priorities.join(', ')}</p>
            <button onClick={saveCurrentFocusToCustomDay} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">Save current muscle focus to selected custom day</button>
          </Panel>

          <Panel title="Build today's workout" eyebrow="Adaptive reroll generator">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Goal</label>
            <select value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3">{goalOptions.map((option) => <option key={option}>{option}</option>)}</select>
            <div className="mt-4 grid grid-cols-2 gap-3"><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Minutes</span><input type="number" min="20" max="90" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Recovery</span><input type="number" min="1" max="100" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label></div>
            <Chooser title="Workout equipment" options={equipmentOptions} selected={selectedEquipment} onToggle={(value) => toggle(selectedEquipment, value, setSelectedEquipment)} />
            <Chooser title="Specific muscle focus" options={muscleOptions} selected={priorities} onToggle={(value) => toggle(priorities, value, setPriorities)} />
            <button onClick={buildWorkout} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate new workout</button>
            {workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}
          </Panel>
          {!!generated.length && <Panel title="Generated workout" eyebrow={`Reroll #${workoutRerolls}`}><div className="flex flex-col gap-3">{generated.map((exercise, index) => <article key={`${exercise.id}-${workoutRerolls}`} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-orange-300">#{index + 1} · {exercise.category}</p><h3 className="text-lg font-black">{exercise.name}</h3><p className="text-sm text-zinc-300">{exercise.sets} sets · {exercise.reps} reps · rest {exercise.restSeconds}s</p><p className="mt-1 text-xs text-zinc-500">Needs: {exercise.equipment_needed.join(', ') || 'bodyweight'}</p><p className="mt-2 text-sm text-zinc-400">{exercise.instructions?.[0] ?? 'Move with control.'}</p></article>)}</div><button onClick={saveWorkout} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save workout</button></Panel>}
        </section>}

        {activeTab === 'mobility' && <section className="flex flex-col gap-5">
          <Panel title="Mobility score" eyebrow="GOWOD-style controls"><div className="flex items-center justify-center py-3"><div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-400 text-center"><div><p className="text-5xl font-black">{mobilityAverage}</p><p className="text-sm text-zinc-300">global</p></div></div></div><div className="grid grid-cols-3 gap-2">{activeAreaScores.map((item) => <ScoreBar key={item.area} area={item.area} score={item.score} editable={source === 'gowod'} onChange={(next) => setGowodAdjustments((current) => ({ ...current, [item.area]: next }))} />)}</div>{source === 'gowod' && <button onClick={() => setGowodAdjustments(originalGowodScores)} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">Reset to screenshot scores</button>}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setSource('gowod')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'gowod' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>Use GOWOD</button><button onClick={() => setSource('forgefit')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'forgefit' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>Use sliders</button></div></Panel>
          <Panel title="Routine builder" eyebrow="No-repeat mobility generator"><p className="text-sm text-zinc-300">Last 3 generated/completed routines are blocked from repeating when enough alternatives exist.</p><div className="mt-4 grid grid-cols-2 gap-2">{[['pre','Pre-workout'],['post','Post-workout'],['daily','Daily'],['recovery','Recovery']].map(([key,label]) => <button key={key} onClick={() => setMobilityMode(key as MobilityMode)} className={`rounded-2xl px-3 py-3 text-xs font-black ${mobilityMode === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{label}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{[['lifting','Lifting'],['legs','Leg day'],['push','Push'],['pull','Pull'],['running','Running'],['mma','MMA/BJJ'],['general','General']].map(([key,label]) => <button key={key} onClick={() => setMobilityActivity(key as MobilityActivity)} className={`rounded-2xl px-3 py-3 text-xs font-black ${mobilityActivity === key ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{label}</button>)}</div><div className="mt-4 grid grid-cols-4 gap-2">{[5,8,12,15].map((minute) => <button key={minute} onClick={() => setMobilityMinutes(minute)} className={`rounded-2xl px-2 py-3 text-xs font-black ${mobilityMinutes === minute ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{minute}m</button>)}</div><Chooser title="Mobility equipment" options={mobilityEquipmentOptions} selected={selectedMobilityEquipment} onToggle={(value) => toggle(selectedMobilityEquipment, value, setSelectedMobilityEquipment)} /></Panel>
          <Panel title="Routine priority" eyebrow="Actually adapting"><p className="text-sm text-zinc-300">Current priority: <span className="font-black text-orange-300">{weakestAreas.join(' + ')}</span>. Blocked from last 3: <span className="font-black text-orange-300">{recentMobilityIds.length}</span> drills.</p></Panel>
          {source === 'forgefit' && mobilityTests.map((test) => <article key={test.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{test.area}</p><h2 className="mt-1 text-xl font-black">{test.title}</h2><p className="mt-1 text-sm text-zinc-300">{test.instruction}</p></div><span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-black">{scores[test.id]}</span></div><p className="mt-3 rounded-2xl bg-black/25 p-3 text-sm text-zinc-300"><span className="font-black text-orange-300">Cue:</span> {test.cue}<br /><span className="font-black text-orange-300">Improve:</span> {test.fix}</p><input className="mt-4 w-full" type="range" min="0" max="100" value={scores[test.id]} onChange={(event) => setScores({ ...scores, [test.id]: Number(event.target.value) })} /></article>)}
          <Panel title={`Recommended ${mobilityMinutes} min routine`} eyebrow="Tracked session generator"><button onClick={generateMobilityRoutine} className="mb-3 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black">Generate mobility routine</button><div className="flex flex-col gap-3">{recommendedDrills.map((drill, index) => <div key={`${drill.id}-${routineShuffle}`} className="rounded-2xl bg-black/25 p-4"><p className="text-xs font-bold text-orange-300">Step {index + 1} · {drill.target_area} · {Math.max(1, Math.round((mobilityMinutes * 60) / Math.max(1, recommendedDrills.length)))} sec</p><h3 className="font-black">{drill.name}</h3><p className="mt-1 text-xs text-zinc-500">Needs: {drill.equipment_needed.join(', ') || 'bodyweight'}</p><p className="mt-1 text-sm text-zinc-400">{drill.instructions?.[0] ?? 'Move slowly, breathe, and stay out of sharp pain.'}</p></div>)}</div>{!!recommendedDrills.length && <button onClick={completeMobilitySession} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">Complete and save mobility session</button>}<p className="mt-3 text-sm text-orange-200">{routineMessage}</p></Panel>
        </section>}

        {activeTab === 'library' && <Panel title="Available movements" eyebrow="Exercise library"><div className="flex flex-col gap-2">{exercises.map((exercise) => <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{exercise.name}</p><p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p></div>)}</div></Panel>}
        {activeTab === 'history' && <Panel title="Your saved workouts" eyebrow="Saved history"><div className="flex flex-col gap-2">{savedWorkouts.map((workout) => <div key={workout.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{workout.title}</p><p className="text-xs text-zinc-400">{workout.goal} · {workout.duration_minutes} min · recovery {workout.recovery_score ?? 'n/a'}</p></div>)}{!savedWorkouts.length && <p className="text-sm text-zinc-400">No saved workouts yet.</p>}</div></Panel>}
      </section>
    </main>
  );
}

function AuthScreen({ email, password, authMessage, setEmail, setPassword, signIn, signUp }: { email: string; password: string; authMessage: string; setEmail: (v: string) => void; setPassword: (v: string) => void; signIn: () => void; signUp: () => void }) {
  return <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl"><p className="text-sm font-semibold text-orange-300">ForgeFit</p><h1 className="mt-2 text-4xl font-black">Sign in to train</h1><p className="mt-3 text-sm text-zinc-300">Your workouts, mobility scores, and history stay tied to your account.</p><div className="mt-6 flex flex-col gap-3"><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><button onClick={signIn} className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-black">Sign in</button><button onClick={signUp} className="rounded-2xl border border-white/10 px-4 py-3 font-black">Create account</button><p className="text-sm text-orange-200">{authMessage}</p></div></section></main>;
}

function matchesEquipment(required: string[] = [], selected: string[]) { if (!required.length) return true; return required.every((item) => item.toLowerCase() === 'bodyweight' || selected.includes(item.toLowerCase())); }
function getWorkoutCategoryPlan(split: SplitKey, goal: string, count: number) { const goalText = goal.toLowerCase(); let plan = split === 'mma' ? ['power', 'strength', 'conditioning', 'core', 'hypertrophy', 'any'] : split === 'push' || split === 'pull' || split === 'legs' || split === 'lower' ? ['strength', 'hypertrophy', 'hypertrophy', 'core', 'conditioning', 'any'] : ['strength', 'hypertrophy', 'core', 'conditioning', 'power', 'any']; if (goalText.includes('conditioning') || goalText.includes('lose')) plan = ['conditioning', 'strength', 'core', 'hypertrophy', 'conditioning', 'any']; if (goalText.includes('strength')) plan = ['strength', 'strength', 'hypertrophy', 'core', 'conditioning', 'any']; return plan.slice(0, count); }
function seededNoise(text: string) { let hash = 0; for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 9973; return (hash % 100) / 100; }
function buildMobilityRoutine(areaScores: { area: Area; score: number }[], drills: DbMobility[], activity: MobilityActivity, mode: MobilityMode, minutes: number, shuffle: number, equipment: string[], recentIds: string[]) { const boosts = activityAreaBoosts[activity]; const scoredAreas = areaScores.map((item) => ({ ...item, priority: (100 - item.score) + (boosts.includes(item.area) ? 20 : 0) + (mode === 'recovery' && item.score < 70 ? 12 : 0) })).sort((a, b) => b.priority - a.priority); const weakestAreas = scoredAreas.slice(0, mode === 'daily' ? 3 : 2).map((item) => item.area); const targets = weakestAreas.map((area) => targetByArea[area]); const count = minutes <= 5 ? 4 : minutes <= 8 ? 5 : minutes <= 12 ? 6 : 8; const blocked = new Set(recentIds); const available = drills.filter((drill) => matchesEquipment(drill.equipment_needed, equipment)); const pool = available.length ? available : drills.filter((drill) => matchesEquipment(drill.equipment_needed, ['bodyweight'])); const freshPool = pool.filter((drill) => !blocked.has(drill.id)); const enoughFresh = freshPool.length >= count; const sourcePool = enoughFresh ? freshPool : pool; const ranked = sourcePool.map((drill) => { let score = seededNoise(`${drill.id}-${shuffle}-${activity}-${mode}`) * 35; targets.forEach((target, index) => { if (drill.target_area === target || drill.name.toLowerCase().includes(target)) score += 42 - index * 8; if (target === 'hamstrings' && (drill.name.toLowerCase().includes('calf') || drill.name.toLowerCase().includes('hamstring') || drill.name.toLowerCase().includes('fold') || drill.name.toLowerCase().includes('posterior'))) score += 22; }); if (mode === 'pre' && drill.duration_seconds <= 90) score += 10; if (mode === 'post' && drill.duration_seconds >= 60) score += 10; if (mode === 'recovery') score += 8; if (!enoughFresh && blocked.has(drill.id)) score -= 80; return { drill, score }; }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score); return { weakestAreas, drills: ranked.slice(0, count).map((item) => item.drill) }; }
function getForgefitAreaScores(scores: Record<string, number>) { const areas = Array.from(new Set(mobilityTests.map((test) => test.area))) as Area[]; return areas.map((area) => { const tests = mobilityTests.filter((test) => test.area === area); return { area, score: Math.round(tests.reduce((total, test) => total + (scores[test.id] ?? 60), 0) / tests.length) }; }); }
function getGowodAreaScores(scores: Record<Area, number>) { return (Object.entries(scores) as [Area, number][]).map(([area, score]) => ({ area, score })); }
function getAdjustedGowodGlobal(scores: Record<Area, number>) { const originalAverage = Math.round(Object.values(originalGowodScores).reduce((total, score) => total + score, 0) / Object.values(originalGowodScores).length); const currentAverage = Math.round(Object.values(scores).reduce((total, score) => total + score, 0) / Object.values(scores).length); return Math.max(0, Math.min(100, Math.round(originalGowodGlobal + (currentAverage - originalAverage)))); }
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-orange-300">{eyebrow}</p><h2 className="mt-1 text-xl font-black">{title}</h2><div className="mt-4">{children}</div></section>; }
function ScoreBar({ area, score, editable = false, onChange }: { area: Area; score: number; editable?: boolean; onChange?: (next: number) => void }) { const color = score < 40 ? 'bg-orange-400' : 'bg-emerald-400'; return <div className="rounded-2xl bg-black/25 p-3 text-center"><p className="mx-auto rounded-lg bg-black/40 px-2 py-1 text-sm font-black">{score}</p><div className="mx-auto mt-2 flex h-20 w-2 items-end rounded-full bg-zinc-700"><span className={`block w-2 rounded-full ${color}`} style={{ height: `${score}%` }} /></div><p className="mt-2 text-[10px] font-bold text-zinc-300">{area}</p>{editable && <input className="mt-2 w-full" type="range" min="0" max="100" value={score} onChange={(event) => onChange?.(Number(event.target.value))} />}</div>; }
function Chooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onToggle(option)} className={`rounded-full px-3 py-2 text-xs font-bold ${selected.includes(option) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>{option}</button>)}</div></div>; }
