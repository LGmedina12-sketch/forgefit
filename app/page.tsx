'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Flame, HeartPulse, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type DbExercise = {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment_needed: string[];
  difficulty: string;
  category: string;
  instructions: string[];
  common_mistakes: string[];
  regressions: string[];
  progressions: string[];
  substitutions: string[];
};

type DbMobility = {
  id: string;
  name: string;
  target_area: string;
  duration_seconds: number;
  difficulty: string;
  equipment_needed: string[];
  instructions: string[];
  common_mistakes: string[];
};

type GeneratedExercise = DbExercise & { sets: number; reps: string; restSeconds: number };
type SavedWorkout = { id: string; title: string; goal: string; duration_minutes: number; recovery_score: number | null; status: string; created_at: string };
type MobilityKey = 'hips' | 'ankles' | 'shoulders' | 'thoracic' | 'hamstrings';
type TabKey = 'train' | 'mobility' | 'library' | 'history';
type StretchMode = 'daily' | 'pre' | 'recovery';
type PoseKind = 'squat' | 'hip90' | 'ankle' | 'overhead' | 'wallSlide' | 'twist' | 'hamstring' | 'lunge' | 'push' | 'pull' | 'jump' | 'core' | 'lift';

type MobilityTest = {
  id: string;
  area: MobilityKey;
  target: string;
  title: string;
  prompt: string;
  startLabel: string;
  endLabel: string;
  pose: PoseKind;
};

const equipmentOptions = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box'];
const goalOptions = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const muscleOptions = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];
const tabs: { key: TabKey; label: string }[] = [
  { key: 'train', label: 'Train' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'library', label: 'Library' },
  { key: 'history', label: 'History' },
];

const mobilityAreas: { key: MobilityKey; label: string; target: string }[] = [
  { key: 'hips', label: 'Hips', target: 'hips' },
  { key: 'ankles', label: 'Ankles', target: 'ankles' },
  { key: 'shoulders', label: 'Shoulders', target: 'shoulders' },
  { key: 'thoracic', label: 'Upper back', target: 'thoracic spine' },
  { key: 'hamstrings', label: 'Hamstrings', target: 'hamstrings' },
];

const mobilityTests: MobilityTest[] = [
  { id: 'hips-squat', area: 'hips', target: 'hips', title: 'Deep squat depth', prompt: 'Slide to the deepest comfortable squat you can reach.', startLabel: 'Tall squat', endLabel: 'Deep squat', pose: 'squat' },
  { id: 'hips-9090', area: 'hips', target: 'hips', title: '90/90 hip switch', prompt: 'Slide based on how close you get to smooth side-to-side rotation.', startLabel: 'Blocked switch', endLabel: 'Smooth switch', pose: 'hip90' },
  { id: 'ankles-wall', area: 'ankles', target: 'ankles', title: 'Knee-to-wall', prompt: 'Slide based on how far your knee can travel while your heel stays down.', startLabel: 'Far from wall', endLabel: 'Knee to wall', pose: 'ankle' },
  { id: 'ankles-squat', area: 'ankles', target: 'ankles', title: 'Heel-down squat', prompt: 'Slide based on how easily both heels stay planted.', startLabel: 'Heel lifts', endLabel: 'Heel planted', pose: 'squat' },
  { id: 'shoulders-overhead', area: 'shoulders', target: 'shoulders', title: 'Overhead reach', prompt: 'Slide based on how close your arms get overhead without arching.', startLabel: 'Forward arms', endLabel: 'Stacked overhead', pose: 'overhead' },
  { id: 'shoulders-wall', area: 'shoulders', target: 'shoulders', title: 'Wall slide', prompt: 'Slide based on how high you can slide your arms smoothly.', startLabel: 'Low slide', endLabel: 'High slide', pose: 'wallSlide' },
  { id: 'thoracic-openbook', area: 'thoracic', target: 'thoracic spine', title: 'Open-book rotation', prompt: 'Slide based on how far your chest rotates while knees stay stacked.', startLabel: 'Small turn', endLabel: 'Open chest', pose: 'twist' },
  { id: 'thoracic-thread', area: 'thoracic', target: 'thoracic spine', title: 'Thread the needle', prompt: 'Slide based on how far your upper back rotates both ways.', startLabel: 'Tight twist', endLabel: 'Full twist', pose: 'twist' },
  { id: 'hamstrings-toe', area: 'hamstrings', target: 'hamstrings', title: 'Toe touch', prompt: 'Slide based on how close your hands get to your toes.', startLabel: 'Hands high', endLabel: 'Touch toes', pose: 'hamstring' },
  { id: 'hamstrings-leg', area: 'hamstrings', target: 'hamstrings', title: 'Straight-leg raise', prompt: 'Slide based on how high one leg raises without the other lifting.', startLabel: 'Low raise', endLabel: 'High raise', pose: 'hamstring' },
];

const activityTargets: Record<string, string[]> = {
  'MMA / BJJ': ['hips', 'thoracic spine', 'shoulders', 'hamstrings'],
  Boxing: ['thoracic spine', 'shoulders', 'hips'],
  Wrestling: ['hips', 'shoulders', 'thoracic spine', 'hamstrings'],
  Lifting: ['hips', 'ankles', 'thoracic spine', 'shoulders'],
  Running: ['ankles', 'hamstrings', 'hips'],
  Basketball: ['ankles', 'hips', 'hamstrings'],
  Soccer: ['hips', 'hamstrings', 'ankles'],
  Football: ['hips', 'shoulders', 'ankles', 'hamstrings'],
  General: ['hips', 'ankles', 'shoulders', 'thoracic spine', 'hamstrings'],
};

const stretchModes: { key: StretchMode; label: string; description: string }[] = [
  { key: 'daily', label: 'Daily reset', description: 'Balanced routine for tight areas and general movement.' },
  { key: 'pre', label: 'Before activity', description: 'Short movement prep before training or sports.' },
  { key: 'recovery', label: 'Recovery', description: 'Longer cooldown work after hard sessions.' },
];

const stretchTimes = [5, 8, 12, 15, 20];
const initialTestScores: Record<string, number> = mobilityTests.reduce((acc, test) => ({ ...acc, [test.id]: 70 }), {} as Record<string, number>);

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
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [priorities, setPriorities] = useState<string[]>(['back', 'legs', 'core', 'shoulders']);
  const [generated, setGenerated] = useState<GeneratedExercise[]>([]);
  const [testScores, setTestScores] = useState<Record<string, number>>(initialTestScores);
  const [saveMessage, setSaveMessage] = useState('');
  const [workoutMessage, setWorkoutMessage] = useState('');
  const [stretchMessage, setStretchMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('train');
  const [activity, setActivity] = useState('MMA / BJJ');
  const [stretchMode, setStretchMode] = useState<StretchMode>('daily');
  const [stretchMinutes, setStretchMinutes] = useState(8);

  function areaScore(area: MobilityKey) {
    const tests = mobilityTests.filter((test) => test.area === area);
    return Math.round(tests.reduce((total, test) => total + (testScores[test.id] ?? 70), 0) / tests.length);
  }

  async function loadSavedWorkouts() {
    const { data } = await supabase
      .from('workouts')
      .select('id, title, goal, duration_minutes, recovery_score, status, created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    setSavedWorkouts((data as SavedWorkout[]) ?? []);
  }

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
      if (currentUser) await loadSavedWorkouts();
    }
    loadData();
  }, [supabase]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
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
    await loadSavedWorkouts();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setGenerated([]);
    setSavedWorkouts([]);
    setAuthMessage('Signed out.');
  }

  function buildWorkout() {
    const scored = exercises
      .map((exercise) => {
        const hasEquipment = exercise.equipment_needed.some((item) => selectedEquipment.includes(item));
        if (!hasEquipment) return { exercise, score: -999 };
        let score = 10;
        score += exercise.muscle_groups.filter((muscle) => priorities.includes(muscle)).length * 4;
        if (goal.toLowerCase().includes('mma') && ['power', 'conditioning', 'core'].includes(exercise.category)) score += 5;
        if (goal.toLowerCase().includes('strength') && exercise.category === 'strength') score += 5;
        if (goal.toLowerCase().includes('muscle') && exercise.category === 'hypertrophy') score += 5;
        if (goal.toLowerCase().includes('conditioning') && exercise.category === 'conditioning') score += 6;
        if (goal.toLowerCase().includes('lose') && ['conditioning', 'core'].includes(exercise.category)) score += 4;
        if (goal.toLowerCase().includes('athletic') && ['power', 'conditioning'].includes(exercise.category)) score += 5;
        if (recovery < 55 && exercise.difficulty === 'advanced') score -= 4;
        return { exercise, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const count = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const nextWorkout = scored.slice(0, count).map(({ exercise }, index) => ({
      ...exercise,
      sets: recovery < 55 ? 2 : goal.toLowerCase().includes('muscle') ? 4 : index === 0 ? 4 : 3,
      reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : goal.toLowerCase().includes('strength') ? '4-6' : '8-12',
      restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' || goal.toLowerCase().includes('strength') ? 120 : 75,
    }));

    setGenerated(nextWorkout);
    setWorkoutMessage(nextWorkout.length ? 'Workout generated. Save it when you like it.' : 'No exercises matched your equipment. Add more equipment or change your goal.');
  }

  async function saveWorkout() {
    if (!userId) return setWorkoutMessage('Sign in before saving workouts.');
    if (!generated.length) return setWorkoutMessage('Generate a workout first.');
    setWorkoutMessage('Saving workout...');

    const { data: workoutRow, error: workoutError } = await supabase
      .from('workouts')
      .insert({ user_id: userId, title: `${goal} session`, goal, duration_minutes: duration, recovery_score: recovery, status: 'planned' })
      .select('id')
      .single();
    if (workoutError || !workoutRow) return setWorkoutMessage(workoutError?.message ?? 'Workout could not be saved.');

    const rows = generated.map((exercise, index) => ({
      workout_id: workoutRow.id,
      exercise_id: exercise.id,
      position: index + 1,
      target_sets: exercise.sets,
      target_reps: exercise.reps,
      rest_seconds: exercise.restSeconds,
      notes: `${exercise.category} · ${exercise.muscle_groups.join(', ')}`,
    }));

    const { error: exerciseError } = await supabase.from('workout_exercises').insert(rows);
    if (exerciseError) return setWorkoutMessage(exerciseError.message);
    setWorkoutMessage('Workout saved to your account.');
    await loadSavedWorkouts();
  }

  async function saveMobilityAssessment() {
    if (!userId) return setSaveMessage('Sign in before saving your mobility score.');
    const { error } = await supabase.from('mobility_assessments').insert({
      user_id: userId,
      overall_score: mobilityScore,
      hips_score: areaScores.hips,
      ankles_score: areaScores.ankles,
      shoulders_score: areaScores.shoulders,
      thoracic_score: areaScores.thoracic,
      hamstrings_score: areaScores.hamstrings,
      notes: `Slider calibration: ${JSON.stringify(testScores)}`,
    });
    setSaveMessage(error ? error.message : `Saved real score: ${mobilityScore}`);
  }

  async function saveStretchSession() {
    if (!userId) return setStretchMessage('Sign in before saving mobility routines.');
    const { error } = await supabase.from('mobility_sessions').insert({
      user_id: userId,
      title: `${stretchModeLabel} - ${activity}`,
      target_areas: routineTargets,
      duration_minutes: stretchMinutes,
    });
    setStretchMessage(error ? error.message : 'Stretch routine saved.');
  }

  const areaScores: Record<MobilityKey, number> = {
    hips: areaScore('hips'),
    ankles: areaScore('ankles'),
    shoulders: areaScore('shoulders'),
    thoracic: areaScore('thoracic'),
    hamstrings: areaScore('hamstrings'),
  };
  const mobilityScore = Math.round((areaScores.hips + areaScores.ankles + areaScores.shoulders + areaScores.thoracic + areaScores.hamstrings) / 5);
  const weakTargets = mobilityAreas.filter((area) => areaScores[area.key] < 70).map((area) => area.target);
  const activityBaseTargets = activityTargets[activity] ?? activityTargets.General;
  const routineTargets = Array.from(new Set(stretchMode === 'pre' ? [...activityBaseTargets, ...weakTargets] : [...weakTargets, ...activityBaseTargets]));
  const stretchModeLabel = stretchModes.find((mode) => mode.key === stretchMode)?.label ?? 'Daily reset';
  const selectedStretchDescription = stretchModes.find((mode) => mode.key === stretchMode)?.description ?? '';
  const routineCandidates = mobility.filter((drill) => routineTargets.includes(drill.target_area));
  const perDrillSeconds = stretchMode === 'pre' ? (stretchMinutes <= 5 ? 45 : 60) : stretchMode === 'recovery' ? (stretchMinutes >= 15 ? 90 : 75) : 60;
  const maxDrillsByTime = Math.max(2, Math.floor((stretchMinutes * 60) / perDrillSeconds));
  const stretchRoutine = (routineCandidates.length ? routineCandidates : mobility)
    .sort((a, b) => (routineTargets.indexOf(a.target_area) === -1 ? 999 : routineTargets.indexOf(a.target_area)) - (routineTargets.indexOf(b.target_area) === -1 ? 999 : routineTargets.indexOf(b.target_area)))
    .slice(0, maxDrillsByTime)
    .map((drill) => ({ ...drill, displaySeconds: perDrillSeconds }));
  const routineMinutes = Math.max(1, Math.ceil(stretchRoutine.reduce((total, drill) => total + drill.displaySeconds, 0) / 60));

  if (!userId) {
    return (
      <main className="min-h-screen bg-forge-bg px-4 py-8 text-white">
        <section className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">ForgeFit</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Train smarter every day.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Sign in to generate workouts, save sessions, calibrate mobility, and get stretches that change with your sport.</p>
          </div>
          <section className="rounded-[2rem] border border-white/10 bg-forge-card p-5 shadow-2xl">
            <h2 className="text-2xl font-black">Start training</h2>
            <p className="mt-2 text-sm text-zinc-300">{authMessage}</p>
            <div className="mt-5 flex flex-col gap-3">
              <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-400" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button onClick={signIn} className="rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Sign in</button>
              <button onClick={signUp} className="rounded-2xl bg-white px-4 py-4 font-black text-black">Create account</button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-forge-bg px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-orange-200/80">Welcome, {userEmail}</p>
              <h1 className="text-3xl font-black tracking-tight">Today&apos;s plan</h1>
            </div>
            <button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-2xl px-2 py-2 text-xs font-black ${activeTab === tab.key ? 'bg-orange-500 text-black' : 'bg-black/30 text-white'}`}>{tab.label}</button>)}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<HeartPulse size={18} />} label="Recovery" value={String(recovery)} />
          <Stat icon={<Flame size={18} />} label="Library" value={`${exercises.length}`} />
          <Stat icon={<Dumbbell size={18} />} label="Workout" value={`${generated.length} moves`} />
          <Stat icon={<Trophy size={18} />} label="Mobility" value={String(mobilityScore)} />
        </div>

        {activeTab === 'train' && (
          <section className="rounded-[2rem] border border-white/10 bg-forge-card p-5 shadow-2xl">
            <p className="text-sm font-semibold text-orange-300">Workout generator</p>
            <h2 className="mt-1 text-2xl font-black">Build today&apos;s session</h2>
            <label className="mt-4 block text-sm font-bold">Goal</label>
            <select className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3" value={goal} onChange={(event) => setGoal(event.target.value)}>{goalOptions.map((item) => <option key={item}>{item}</option>)}</select>
            <label className="mt-4 block text-sm font-bold">Duration: {duration} min</label>
            <input className="w-full" type="range" min="20" max="75" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
            <label className="mt-4 block text-sm font-bold">Recovery: {recovery}</label>
            <input className="w-full" type="range" min="25" max="100" step="5" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} />
            <p className="mt-4 text-sm font-bold">Equipment</p>
            <div className="mt-2 flex flex-wrap gap-2">{equipmentOptions.map((item) => <button key={item} onClick={() => toggle(selectedEquipment, item, setSelectedEquipment)} className={`rounded-full px-3 py-2 text-xs font-bold ${selectedEquipment.includes(item) ? 'bg-orange-500 text-black' : 'bg-white/10'}`}>{item}</button>)}</div>
            <p className="mt-4 text-sm font-bold">Muscle priorities</p>
            <div className="mt-2 flex flex-wrap gap-2">{muscleOptions.map((item) => <button key={item} onClick={() => toggle(priorities, item, setPriorities)} className={`rounded-full px-3 py-2 text-xs font-bold ${priorities.includes(item) ? 'bg-orange-500 text-black' : 'bg-white/10'}`}>{item}</button>)}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={buildWorkout} className="rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate</button>
              <button onClick={saveWorkout} className="rounded-2xl bg-white px-4 py-4 font-black text-black">Save</button>
            </div>
            {workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}
            <div className="mt-4 flex flex-col gap-3">
              {generated.map((exercise) => (
                <article key={exercise.id} className="rounded-2xl bg-black/25 p-4">
                  <ExerciseIllustration exercise={exercise} />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div><h3 className="font-bold">{exercise.name}</h3><p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')}</p></div>
                    <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-200">{exercise.sets} x {exercise.reps}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Rest {exercise.restSeconds}s • {exercise.category}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'mobility' && (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-300">Mobility</p>
            <h2 className="mt-1 text-2xl font-black">Motion calibration</h2>
            <p className="mt-2 text-sm text-zinc-300">Move each slider to match where you actually are in the motion. Score and stretches update instantly.</p>
            <div className="mt-4 rounded-2xl bg-black/30 p-4">
              <p className="text-sm text-zinc-400">Live mobility score</p>
              <p className="text-4xl font-black text-orange-300">{mobilityScore}</p>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[10px] text-zinc-400">{mobilityAreas.map((area) => <div key={area.key}><p className="font-black text-white">{areaScores[area.key]}</p><p>{area.label}</p></div>)}</div>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {mobilityTests.map((test) => (
                <div key={test.id} className="rounded-2xl bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-black">{test.title}</p><p className="text-xs text-zinc-400">{test.prompt}</p></div>
                    <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-black text-orange-200">{testScores[test.id]}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MotionPose kind={test.pose} value={5} caption={test.startLabel} />
                    <MotionPose kind={test.pose} value={100} caption={test.endLabel} />
                  </div>
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <MotionPose kind={test.pose} value={testScores[test.id] ?? 70} caption="Your range" large />
                    <input className="mt-3 w-full" type="range" min="0" max="100" step="1" value={testScores[test.id] ?? 70} onChange={(event) => setTestScores({ ...testScores, [test.id]: Number(event.target.value) })} />
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-500"><span>Start</span><span>End range</span></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveMobilityAssessment} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Save mobility score</button>
            {saveMessage && <p className="mt-3 text-sm text-orange-200">{saveMessage}</p>}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm font-semibold text-orange-300">Stretch routine</p>
              <h3 className="mt-1 text-xl font-black">{stretchModeLabel}</h3>
              <p className="mt-1 text-sm text-zinc-300">{selectedStretchDescription}</p>
              <p className="mt-4 text-sm font-bold">How much time do you have?</p>
              <div className="mt-2 grid grid-cols-5 gap-2">{stretchTimes.map((minutes) => <button key={minutes} onClick={() => setStretchMinutes(minutes)} className={`rounded-2xl px-2 py-3 text-xs font-black ${stretchMinutes === minutes ? 'bg-orange-500 text-black' : 'bg-black/30'}`}>{minutes}m</button>)}</div>
              <p className="mt-4 text-sm font-bold">Mode</p>
              <div className="mt-2 grid grid-cols-3 gap-2">{stretchModes.map((mode) => <button key={mode.key} onClick={() => setStretchMode(mode.key)} className={`rounded-2xl px-2 py-3 text-xs font-black ${stretchMode === mode.key ? 'bg-orange-500 text-black' : 'bg-black/30'}`}>{mode.label}</button>)}</div>
              <p className="mt-4 text-sm font-bold">Activity</p>
              <select className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3" value={activity} onChange={(event) => setActivity(event.target.value)}>{Object.keys(activityTargets).map((item) => <option key={item}>{item}</option>)}</select>
              <div className="mt-4 rounded-2xl bg-black/30 p-4"><p className="text-sm text-zinc-400">Routine length</p><p className="text-2xl font-black">About {routineMinutes} min</p><p className="mt-1 text-xs text-zinc-400">Targets: {routineTargets.join(', ')}</p></div>
              <div className="mt-3 flex flex-col gap-2">
                {stretchRoutine.map((drill) => (
                  <div key={drill.id} className="rounded-2xl bg-black/25 px-4 py-3">
                    <div className="mb-3"><MobilityDrillIllustration drill={drill} /></div>
                    <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{drill.name}</p><p className="text-xs text-zinc-400">{drill.target_area}</p></div><p className="text-sm text-orange-200">{drill.displaySeconds}s</p></div>
                    <p className="mt-2 text-xs text-zinc-400">{drill.instructions?.[0]}</p>
                  </div>
                ))}
              </div>
              <button onClick={saveStretchSession} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save stretch routine</button>
              {stretchMessage && <p className="mt-3 text-sm text-orange-200">{stretchMessage}</p>}
            </div>
          </section>
        )}

        {activeTab === 'library' && (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-300">Exercise library</p><h2 className="mt-1 text-xl font-black">Available movements</h2>
            <div className="mt-4 flex flex-col gap-2">{exercises.map((exercise) => <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3"><ExerciseIllustration exercise={exercise} compact /><p className="mt-2 font-semibold">{exercise.name}</p><p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p></div>)}</div>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-300">Saved history</p><h2 className="mt-1 text-xl font-black">Your saved workouts</h2>
            <div className="mt-4 flex flex-col gap-2">{savedWorkouts.map((workout) => <div key={workout.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{workout.title}</p><p className="text-xs text-zinc-400">{workout.goal} · {workout.duration_minutes} min · recovery {workout.recovery_score ?? 'n/a'}</p></div>)}{!savedWorkouts.length && <p className="text-sm text-zinc-400">No saved workouts yet. Generate one, press Save, then check back here.</p>}</div>
          </section>
        )}
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><div className="mb-3 text-orange-300">{icon}</div><p className="text-xs text-zinc-400">{label}</p><p className="text-lg font-black">{value}</p></div>;
}

function MotionPose({ kind, value, caption, large = false }: { kind: PoseKind; value: number; caption: string; large?: boolean }) {
  const p = Math.max(0, Math.min(100, value));
  const h = large ? 130 : 82;
  const stroke = '#fed7aa';
  const accent = '#fb923c';
  const arm = '#fdba74';

  let body = null;
  if (kind === 'squat') {
    const hipY = 48 + p * 0.32;
    const headY = 25 + p * 0.15;
    body = <><circle cx="104" cy={headY} r="11" fill={accent} /><line x1="104" y1={headY + 12} x2="104" y2={hipY} stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="104" y1={hipY} x2={70 - p * 0.1} y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="104" y1={hipY} x2={138 + p * 0.1} y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="102" y1={headY + 24} x2="62" y2={58 + p * 0.2} stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="106" y1={headY + 24} x2="146" y2={58 + p * 0.2} stroke={arm} strokeWidth="6" strokeLinecap="round" /></>;
  } else if (kind === 'hip90') {
    const rot = p * 0.45;
    body = <><circle cx="110" cy="32" r="11" fill={accent} /><line x1="110" y1="44" x2="110" y2="65" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="110" y1="66" x2={72 - rot * 0.4} y2={80 - rot * 0.12} stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1={72 - rot * 0.4} y1={80 - rot * 0.12} x2="48" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="110" y1="66" x2={150 + rot * 0.5} y2={80 - rot * 0.25} stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1={150 + rot * 0.5} y1={80 - rot * 0.25} x2="185" y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><path d={`M65 90 C 95 ${90 - rot}, 135 ${90 - rot}, 175 72`} stroke="rgba(251,146,60,0.45)" strokeWidth="3" fill="none" strokeDasharray="6 6" /></>;
  } else if (kind === 'ankle') {
    const kneeX = 91 + p * 0.7;
    body = <><line x1="185" y1="20" x2="185" y2="96" stroke="rgba(255,255,255,0.18)" strokeWidth="5" /><circle cx="86" cy="28" r="10" fill={accent} /><line x1="86" y1="40" x2="101" y2="62" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="101" y1="62" x2={kneeX} y2="82" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1={kneeX} y1="82" x2="142" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="101" y1="62" x2="56" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="95" y1="46" x2="166" y2="45" stroke={arm} strokeWidth="6" strokeLinecap="round" /></>;
  } else if (kind === 'overhead' || kind === 'wallSlide') {
    const handY = 80 - p * 0.62;
    body = <><line x1="184" y1="15" x2="184" y2="98" stroke={kind === 'wallSlide' ? 'rgba(255,255,255,0.22)' : 'transparent'} strokeWidth="4" /><circle cx="105" cy="35" r="11" fill={accent} /><line x1="105" y1="47" x2="105" y2="75" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="105" y1="58" x2="72" y2={handY} stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="105" y1="58" x2="138" y2={handY} stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="105" y1="75" x2="82" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="105" y1="75" x2="128" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /></>;
  } else if (kind === 'twist') {
    const handX = 92 + p * 0.85;
    body = <><circle cx="74" cy="36" r="10" fill={accent} /><line x1="82" y1="45" x2="118" y2="68" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="118" y1="68" x2="72" y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="118" y1="68" x2="155" y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="98" y1="56" x2="48" y2="70" stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="100" y1="56" x2={handX} y2={42 - p * 0.15} stroke={arm} strokeWidth="6" strokeLinecap="round" /><path d={`M86 58 C 120 ${45 - p * 0.2}, 150 ${38 - p * 0.15}, 188 32`} stroke="rgba(251,146,60,0.45)" strokeWidth="3" fill="none" strokeDasharray="6 6" /></>;
  } else if (kind === 'hamstring') {
    const torsoX = 100 + p * 0.55;
    const handY = 55 + p * 0.38;
    body = <><circle cx={torsoX - 18} cy={38 + p * 0.2} r="10" fill={accent} /><line x1="82" y1="56" x2={torsoX} y2={56 + p * 0.25} stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="82" y1="56" x2="54" y2="94" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="82" y1="56" x2="176" y2="94" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1={torsoX} y1={56 + p * 0.25} x2={176 - (100 - p) * 0.2} y2={handY} stroke={arm} strokeWidth="6" strokeLinecap="round" /></>;
  } else if (kind === 'lunge') {
    body = <><circle cx="108" cy="30" r="10" fill={accent} /><line x1="108" y1="42" x2="110" y2="62" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="110" y1="62" x2="72" y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="110" y1="62" x2="168" y2="92" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="110" y1="50" x2="70" y2="58" stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="110" y1="50" x2="150" y2="58" stroke={arm} strokeWidth="6" strokeLinecap="round" /></>;
  } else {
    body = <><circle cx="105" cy="35" r="11" fill={accent} /><line x1="105" y1="48" x2="105" y2="72" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="105" y1="58" x2="70" y2="55" stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="105" y1="58" x2="142" y2="52" stroke={arm} strokeWidth="6" strokeLinecap="round" /><line x1="105" y1="72" x2="80" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /><line x1="105" y1="72" x2="130" y2="96" stroke={stroke} strokeWidth="7" strokeLinecap="round" /></>;
  }

  return <div className={`rounded-2xl border border-white/10 bg-black/30 p-2 ${large ? 'min-h-[150px]' : ''}`}><svg viewBox="0 0 220 120" className="w-full" style={{ height: h }} role="img" aria-label={caption}><rect x="8" y="8" width="204" height="104" rx="18" fill="rgba(255,255,255,0.04)" /><line x1="25" y1="98" x2="195" y2="98" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />{body}</svg><div className="mt-1 flex items-center justify-between text-[10px]"><span className="text-zinc-400">{caption}</span><span className="font-black text-orange-300">{Math.round(p)}%</span></div></div>;
}

function ExerciseIllustration({ exercise, compact = false }: { exercise: Pick<DbExercise, 'name' | 'category' | 'muscle_groups'>; compact?: boolean }) {
  const name = exercise.name.toLowerCase();
  let kind: PoseKind = 'lift';
  if (exercise.category === 'power' || name.includes('jump')) kind = 'jump';
  else if (exercise.category === 'conditioning' || name.includes('burpee') || name.includes('climber')) kind = 'push';
  else if (exercise.muscle_groups.includes('core')) kind = 'core';
  else if (exercise.muscle_groups.includes('back')) kind = 'pull';
  else if (exercise.muscle_groups.includes('legs') || exercise.muscle_groups.includes('glutes')) kind = 'squat';
  return <MotionPose kind={kind} value={85} caption={exercise.category} large={!compact} />;
}

function MobilityDrillIllustration({ drill }: { drill: Pick<DbMobility, 'name' | 'target_area'> }) {
  const name = drill.name.toLowerCase();
  let kind: PoseKind = 'lunge';
  let value = 88;
  if (drill.target_area === 'ankles' || name.includes('ankle') || name.includes('calf')) kind = 'ankle';
  else if (drill.target_area === 'shoulders' || name.includes('shoulder') || name.includes('pec') || name.includes('wall')) kind = name.includes('wall') ? 'wallSlide' : 'overhead';
  else if (drill.target_area === 'thoracic spine' || name.includes('open book') || name.includes('thread') || name.includes('windmill') || name.includes('scorpion')) kind = 'twist';
  else if (drill.target_area === 'hamstrings' || name.includes('hamstring') || name.includes('down dog') || name.includes('fold')) kind = 'hamstring';
  else if (name.includes('90/90')) kind = 'hip90';
  else if (name.includes('squat')) kind = 'squat';
  else kind = 'lunge';
  if (name.includes('wrist')) kind = 'overhead';
  if (name.includes('child')) kind = 'overhead';
  if (name.includes('pigeon') || name.includes('figure four')) kind = 'hip90';
  if (name.includes('lizard') || name.includes('couch') || name.includes('hip flexor')) kind = 'lunge';
  if (name.includes('toe') || name.includes('straddle')) kind = 'hamstring';
  if (name.includes('cat cow')) value = 65;
  return <MotionPose kind={kind} value={value} caption={drill.name} large />;
}
