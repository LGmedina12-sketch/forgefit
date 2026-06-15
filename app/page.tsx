'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type DbExercise = {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment_needed: string[];
  difficulty: string;
  category: string;
  instructions: string[];
};

type DbMobility = {
  id: string;
  name: string;
  target_area: string;
  duration_seconds: number;
  difficulty: string;
  equipment_needed: string[];
  instructions: string[];
};

type GeneratedExercise = DbExercise & { sets: number; reps: string; restSeconds: number };
type SavedWorkout = { id: string; title: string; goal: string; duration_minutes: number; recovery_score: number | null; status: string; created_at: string };
type TabKey = 'train' | 'mobility' | 'library' | 'history';
type Pose = 'squat' | 'toeTouch' | 'ankleWall' | 'overheadReach' | 'thoracicTwist' | 'hip90';

type MobilityTest = {
  id: string;
  title: string;
  area: string;
  target: string;
  pose: Pose;
  start: string;
  end: string;
  instruction: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'train', label: 'Train' },
  { key: 'mobility', label: 'Mobility V2' },
  { key: 'library', label: 'Library' },
  { key: 'history', label: 'History' },
];

const goalOptions = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const equipmentOptions = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box'];
const muscleOptions = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];

const mobilityTests: MobilityTest[] = [
  { id: 'squat', title: 'Deep squat depth', area: 'Hips / ankles', target: 'hips', pose: 'squat', start: 'Tall squat', end: 'Deep squat', instruction: 'Move the slider to match how deep you can squat while both heels stay down.' },
  { id: 'toe', title: 'Toe touch', area: 'Hamstrings', target: 'hamstrings', pose: 'toeTouch', start: 'Hands high', end: 'Hands to toes', instruction: 'Move the slider based on how close your hands get to your toes.' },
  { id: 'ankle', title: 'Knee-to-wall', area: 'Ankles', target: 'ankles', pose: 'ankleWall', start: 'Knee far', end: 'Knee near wall', instruction: 'Move the slider based on how far your knee travels while your heel stays planted.' },
  { id: 'overhead', title: 'Overhead reach', area: 'Shoulders', target: 'shoulders', pose: 'overheadReach', start: 'Arms forward', end: 'Arms overhead', instruction: 'Move the slider based on how high your arms reach without arching your back.' },
  { id: 'twist', title: 'Open-book rotation', area: 'Upper back', target: 'thoracic spine', pose: 'thoracicTwist', start: 'Small turn', end: 'Full open chest', instruction: 'Move the slider based on how far your chest can rotate.' },
  { id: 'hip90', title: '90/90 hip switch', area: 'Hips', target: 'hips', pose: 'hip90', start: 'Blocked hips', end: 'Smooth switch', instruction: 'Move the slider based on how close you can get to a clean 90/90 position.' },
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
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [priorities, setPriorities] = useState<string[]>(['back', 'legs', 'core', 'shoulders']);
  const [generated, setGenerated] = useState<GeneratedExercise[]>([]);
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [activeTab, setActiveTab] = useState<TabKey>('train');
  const [workoutMessage, setWorkoutMessage] = useState('');

  const mobilityAverage = Math.round(mobilityTests.reduce((total, test) => total + scores[test.id], 0) / mobilityTests.length);
  const weakestTests = [...mobilityTests].sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 2);
  const recommendedDrills = mobility
    .filter((drill) => weakestTests.some((test) => drill.target_area === test.target || drill.name.toLowerCase().includes(test.target)))
    .slice(0, 5);

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

  async function loadSavedWorkouts() {
    const { data } = await supabase
      .from('workouts')
      .select('id, title, goal, duration_minutes, recovery_score, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    setSavedWorkouts((data as SavedWorkout[]) ?? []);
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

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
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
      notes: exercise.instructions?.[0] ?? '',
    }));

    const { error: exerciseError } = await supabase.from('workout_exercises').insert(rows);
    if (exerciseError) return setWorkoutMessage(exerciseError.message);
    setWorkoutMessage('Workout saved.');
    await loadSavedWorkouts();
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white">
        <section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <p className="text-sm font-semibold text-orange-300">ForgeFit</p>
          <h1 className="mt-2 text-4xl font-black">Sign in to train</h1>
          <p className="mt-3 text-sm text-zinc-300">Your workouts, mobility scores, and history stay tied to your account.</p>
          <div className="mt-6 flex flex-col gap-3">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" />
            <button onClick={signIn} className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-black">Sign in</button>
            <button onClick={signUp} className="rounded-2xl border border-white/10 px-4 py-3 font-black">Create account</button>
            <p className="text-sm text-orange-200">{authMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-28">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-orange-200/80">Welcome, {userEmail}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Today&apos;s plan</h1>
              <p className="mt-2 text-sm text-zinc-300">Adaptive training plus animated Mobility V2 calibration.</p>
            </div>
            <button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-2xl px-3 py-3 text-xs font-black ${activeTab === tab.key ? 'bg-white text-black' : 'bg-white/10 text-zinc-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'train' && (
          <section className="flex flex-col gap-5">
            <Panel title="Build today&apos;s workout" eyebrow="Adaptive generator">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Goal</label>
              <select value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                {goalOptions.map((option) => <option key={option}>{option}</option>)}
              </select>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="rounded-2xl bg-black/30 p-3">
                  <span className="text-xs text-zinc-400">Minutes</span>
                  <input type="number" min="20" max="90" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" />
                </label>
                <label className="rounded-2xl bg-black/30 p-3">
                  <span className="text-xs text-zinc-400">Recovery</span>
                  <input type="number" min="1" max="100" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" />
                </label>
              </div>

              <Chooser title="Equipment" options={equipmentOptions} selected={selectedEquipment} onToggle={(value) => toggle(selectedEquipment, value, setSelectedEquipment)} />
              <Chooser title="Muscle focus" options={muscleOptions} selected={priorities} onToggle={(value) => toggle(priorities, value, setPriorities)} />

              <button onClick={buildWorkout} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate workout</button>
              {workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}
            </Panel>

            {!!generated.length && (
              <Panel title="Generated workout" eyebrow="Today">
                <div className="flex flex-col gap-3">
                  {generated.map((exercise, index) => (
                    <article key={exercise.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-orange-300">#{index + 1} · {exercise.category}</p>
                          <h3 className="text-lg font-black">{exercise.name}</h3>
                          <p className="text-sm text-zinc-300">{exercise.sets} sets · {exercise.reps} reps · rest {exercise.restSeconds}s</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">{exercise.instructions?.[0] ?? 'Move with control.'}</p>
                    </article>
                  ))}
                </div>
                <button onClick={saveWorkout} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save workout</button>
              </Panel>
            )}
          </section>
        )}

        {activeTab === 'mobility' && (
          <section className="flex flex-col gap-5">
            <Panel title="Animated calibration" eyebrow="Mobility V2">
              <div className="rounded-2xl bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Live mobility score</p>
                <p className="text-5xl font-black text-orange-300">{mobilityAverage}</p>
                <p className="mt-2 text-sm text-zinc-300">Focus next: {weakestTests.map((item) => item.area).join(' + ')}</p>
              </div>
            </Panel>

            {mobilityTests.map((test) => (
              <article key={test.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{test.area}</p>
                    <h2 className="mt-1 text-xl font-black">{test.title}</h2>
                    <p className="mt-1 text-sm text-zinc-300">{test.instruction}</p>
                  </div>
                  <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-black">{scores[test.id]}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PoseArt pose={test.pose} value={0} label={test.start} small />
                  <PoseArt pose={test.pose} value={100} label={test.end} small />
                </div>

                <div className="mt-4 rounded-2xl border border-orange-500/30 bg-black/30 p-3">
                  <PoseArt pose={test.pose} value={scores[test.id]} label="Your range" />
                  <input className="mt-4 w-full" type="range" min="0" max="100" value={scores[test.id]} onChange={(event) => setScores({ ...scores, [test.id]: Number(event.target.value) })} />
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-500"><span>{test.start}</span><span>{test.end}</span></div>
                </div>
              </article>
            ))}

            <Panel title="Recommended routine" eyebrow="Based on weakest areas">
              <div className="flex flex-col gap-3">
                {(recommendedDrills.length ? recommendedDrills : mobility.slice(0, 5)).map((drill) => (
                  <div key={drill.id} className="rounded-2xl bg-black/25 p-4">
                    <p className="text-xs font-bold text-orange-300">{drill.target_area} · {Math.round(drill.duration_seconds / 60)} min</p>
                    <h3 className="font-black">{drill.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{drill.instructions?.[0] ?? 'Move slowly and breathe.'}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        )}

        {activeTab === 'library' && (
          <Panel title="Available movements" eyebrow="Exercise library">
            <div className="flex flex-col gap-2">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3">
                  <p className="font-semibold">{exercise.name}</p>
                  <p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {activeTab === 'history' && (
          <Panel title="Your saved workouts" eyebrow="Saved history">
            <div className="flex flex-col gap-2">
              {savedWorkouts.map((workout) => (
                <div key={workout.id} className="rounded-2xl bg-black/25 px-4 py-3">
                  <p className="font-semibold">{workout.title}</p>
                  <p className="text-xs text-zinc-400">{workout.goal} · {workout.duration_minutes} min · recovery {workout.recovery_score ?? 'n/a'}</p>
                </div>
              ))}
              {!savedWorkouts.length && <p className="text-sm text-zinc-400">No saved workouts yet. Generate one, press Save, then check back here.</p>}
            </div>
          </Panel>
        )}
      </section>
    </main>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-orange-300">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} onClick={() => onToggle(option)} className={`rounded-full px-3 py-2 text-xs font-bold ${selected.includes(option) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PoseArt({ pose, value, label, small = false }: { pose: Pose; value: number; label: string; small?: boolean }) {
  const p = Math.max(0, Math.min(100, value));
  const height = small ? 92 : 150;
  const skin = '#fed7aa';
  const head = '#fb923c';
  const limb = '#fdba74';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
      <svg viewBox="0 0 260 160" className="w-full" style={{ height }} role="img" aria-label={label}>
        <rect x="8" y="8" width="244" height="144" rx="22" fill="rgba(255,255,255,.04)" />
        <line x1="22" y1="132" x2="238" y2="132" stroke="rgba(255,255,255,.22)" strokeWidth="4" />
        {pose === 'squat' && <Squat p={p} skin={skin} head={head} limb={limb} />}
        {pose === 'toeTouch' && <ToeTouch p={p} skin={skin} head={head} limb={limb} />}
        {pose === 'ankleWall' && <AnkleWall p={p} skin={skin} head={head} limb={limb} />}
        {pose === 'overheadReach' && <OverheadReach p={p} skin={skin} head={head} limb={limb} />}
        {pose === 'thoracicTwist' && <ThoracicTwist p={p} skin={skin} head={head} limb={limb} />}
        {pose === 'hip90' && <Hip90 p={p} skin={skin} head={head} limb={limb} />}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px]"><span className="text-zinc-400">{label}</span><span className="font-black text-orange-300">{Math.round(p)}%</span></div>
    </div>
  );
}

function Squat({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const hipY = 62 + p * 0.52;
  const headY = 32 + p * 0.18;
  const kneeDrop = p * 0.26;
  return <><circle cx="130" cy={headY} r="13" fill={head} /><line x1="130" y1={headY + 15} x2="130" y2={hipY} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1={hipY} x2={92 - p * 0.28} y2={104 + kneeDrop} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={92 - p * 0.28} y1={104 + kneeDrop} x2="66" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1={hipY} x2={168 + p * 0.28} y2={104 + kneeDrop} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={168 + p * 0.28} y1={104 + kneeDrop} x2="194" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1={headY + 30} x2="82" y2={66 + p * 0.45} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="132" y1={headY + 30} x2="178" y2={66 + p * 0.45} stroke={limb} strokeWidth="8" strokeLinecap="round" /></>;
}

function ToeTouch({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const torsoEndX = 114 + p * 0.72;
  const torsoEndY = 66 + p * 0.47;
  const headX = 100 + p * 0.52;
  const headY = 42 + p * 0.42;
  return <><circle cx={headX} cy={headY} r="13" fill={head} /><line x1="86" y1="72" x2={torsoEndX} y2={torsoEndY} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="86" y1="72" x2="58" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="86" y1="72" x2="204" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={torsoEndX} y1={torsoEndY} x2={124 + p * 0.78} y2={82 + p * 0.50} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1={torsoEndX} y1={torsoEndY} x2={132 + p * 0.78} y2={86 + p * 0.48} stroke={limb} strokeWidth="8" strokeLinecap="round" /></>;
}

function AnkleWall({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const kneeX = 92 + p * 1.18;
  return <><line x1="220" y1="18" x2="220" y2="136" stroke="rgba(255,255,255,.26)" strokeWidth="7" /><circle cx="72" cy="42" r="13" fill={head} /><line x1="72" y1="56" x2="104" y2="82" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="104" y1="82" x2={kneeX} y2="108" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={kneeX} y1="108" x2="164" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="104" y1="82" x2="48" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="96" y1="62" x2="206" y2="60" stroke={limb} strokeWidth="8" strokeLinecap="round" /></>;
}

function OverheadReach({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const handY = 104 - p * 0.88;
  return <><circle cx="130" cy="48" r="13" fill={head} /><line x1="130" y1="62" x2="130" y2="98" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1="72" x2="88" y2={handY} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="72" x2="172" y2={handY} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="98" x2="100" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1="98" x2="160" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /></>;
}

function ThoracicTwist({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const reachX = 92 + p * 1.25;
  const reachY = 84 - p * 0.40;
  return <><circle cx="78" cy="62" r="13" fill={head} /><line x1="90" y1="72" x2="136" y2="96" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="136" y1="96" x2="78" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="136" y1="96" x2="184" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="110" y1="82" x2="54" y2="96" stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="112" y1="82" x2={reachX} y2={reachY} stroke={limb} strokeWidth="8" strokeLinecap="round" /><path d={`M86 86 C 124 ${76 - p * .25}, 170 ${66 - p * .25}, 220 50`} fill="none" stroke="rgba(251,146,60,.55)" strokeWidth="4" strokeDasharray="7 7" /></>;
}

function Hip90({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) {
  const open = p * 0.68;
  return <><circle cx="128" cy="52" r="13" fill={head} /><line x1="128" y1="66" x2="128" y2="92" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1="94" x2={82 - open * 0.52} y2={110 - open * 0.16} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={82 - open * 0.52} y1={110 - open * 0.16} x2="52" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1="94" x2={168 + open * 0.68} y2={110 - open * 0.28} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={168 + open * 0.68} y1={110 - open * 0.28} x2="218" y2="126" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="126" y1="76" x2="92" y2="72" stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="76" x2="166" y2="72" stroke={limb} strokeWidth="8" strokeLinecap="round" /></>;
}
