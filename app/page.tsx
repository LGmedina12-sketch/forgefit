'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
type SourceKey = 'gowod' | 'forgefit';
type Area = 'Shoulders' | 'Overhead' | 'Thorax' | 'Hips' | 'Postchain' | 'Ankles';
type Pose = 'squat' | 'toeTouch' | 'ankleWall' | 'overheadReach' | 'thoracicTwist' | 'hip90' | 'lunge' | 'wallSlide' | 'legRaise' | 'seatedFold';

type MobilityTest = {
  id: string;
  title: string;
  area: Area;
  target: string;
  pose: Pose;
  start: string;
  end: string;
  instruction: string;
  cue: string;
  fix: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'train', label: 'Train' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'library', label: 'Library' },
  { key: 'history', label: 'History' },
];

const goalOptions = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const equipmentOptions = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box'];
const muscleOptions = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];

const gowodScores: Record<Area, number> = {
  Shoulders: 91,
  Overhead: 88,
  Thorax: 99,
  Hips: 98,
  Postchain: 22,
  Ankles: 100,
};

const targetByArea: Record<Area, string> = {
  Shoulders: 'shoulders',
  Overhead: 'shoulders',
  Thorax: 'thoracic spine',
  Hips: 'hips',
  Postchain: 'hamstrings',
  Ankles: 'ankles',
};

const mobilityTests: MobilityTest[] = [
  { id: 'hips-squat', title: 'Deep squat depth', area: 'Hips', target: 'hips', pose: 'squat', start: 'High squat', end: 'Deep squat', instruction: 'Stand shoulder-width, feet flat, then sink as low as you can without your heels lifting.', cue: 'Knees track over toes, chest stays tall, heels stay down.', fix: 'Use squat pries, 90/90 switches, and lizard stretch.' },
  { id: 'hips-9090', title: '90/90 hip switch', area: 'Hips', target: 'hips', pose: 'hip90', start: 'Closed hips', end: 'Open 90/90', instruction: 'Sit in a 90/90 and rate how cleanly both hips rotate without using your hands.', cue: 'Both knees bent, tall chest, rotate from the hip.', fix: 'Use 90/90 switches, pigeon, and figure-four work.' },
  { id: 'hips-lunge', title: 'Hip flexor lunge', area: 'Hips', target: 'hips', pose: 'lunge', start: 'Short lunge', end: 'Long hip stretch', instruction: 'Half-kneel, tuck your pelvis, then slide forward until the front hip opens.', cue: 'Back glute squeezed, ribs down, front knee stacked.', fix: 'Use couch stretch, hip flexor rocks, and lizard stretch.' },
  { id: 'ankles-wall', title: 'Knee-to-wall', area: 'Ankles', target: 'ankles', pose: 'ankleWall', start: 'Knee far', end: 'Knee near wall', instruction: 'Keep your heel planted and drive your knee toward the wall.', cue: 'Heel glued down, knee tracks over second/third toe.', fix: 'Use knee-to-wall rocks and calf wall stretches.' },
  { id: 'ankles-squat', title: 'Heel-down squat', area: 'Ankles', target: 'ankles', pose: 'squat', start: 'Heels lift', end: 'Heels planted', instruction: 'Squat while keeping both heels heavy on the floor.', cue: 'Weight through mid-foot, knees forward, torso relaxed.', fix: 'Use ankle rocks with deep squat holds.' },
  { id: 'shoulders-overhead', title: 'Overhead reach', area: 'Overhead', target: 'shoulders', pose: 'overheadReach', start: 'Arms forward', end: 'Stacked overhead', instruction: 'Reach both arms overhead without flaring ribs or arching your lower back.', cue: 'Ribs down, biceps near ears, neck relaxed.', fix: 'Use wall slides, lat reach, and shoulder flexion work.' },
  { id: 'shoulders-wall', title: 'Wall slide', area: 'Shoulders', target: 'shoulders', pose: 'wallSlide', start: 'Low slide', end: 'High slide', instruction: 'Back against a wall, slide elbows and wrists upward with control.', cue: 'Do not shrug; keep ribs down and move slowly.', fix: 'Use wall slides and doorway pec stretches.' },
  { id: 'thoracic-openbook', title: 'Open-book rotation', area: 'Thorax', target: 'thoracic spine', pose: 'thoracicTwist', start: 'Small turn', end: 'Open chest', instruction: 'Lie on your side, knees stacked, and rotate the top arm open.', cue: 'Move from upper back, not low back.', fix: 'Use open books and side-lying windmills.' },
  { id: 'thoracic-thread', title: 'Thread the needle', area: 'Thorax', target: 'thoracic spine', pose: 'thoracicTwist', start: 'Tight twist', end: 'Full reach', instruction: 'From all fours, reach one arm under your body, then open back up.', cue: 'Hips stay square, shoulder reaches long, breathe.', fix: 'Use thread-the-needle and cat-cow first.' },
  { id: 'postchain-toe', title: 'Toe touch', area: 'Postchain', target: 'hamstrings', pose: 'toeTouch', start: 'Hands high', end: 'Touch toes', instruction: 'Hinge forward and rate how close your hands get to your toes.', cue: 'Soft knees, long spine, fold from hips.', fix: 'Use hamstring flosses and squat-to-hamstring reaches.' },
  { id: 'postchain-leg', title: 'Straight-leg raise', area: 'Postchain', target: 'hamstrings', pose: 'legRaise', start: 'Low raise', end: 'High raise', instruction: 'Lie down and lift one straight leg while the other stays on the floor.', cue: 'Knee mostly straight, pelvis does not roll.', fix: 'Use hamstring floss and calf/hamstring mobility.' },
  { id: 'postchain-seated', title: 'Seated fold', area: 'Postchain', target: 'hamstrings', pose: 'seatedFold', start: 'Upright', end: 'Forward fold', instruction: 'Sit tall with legs forward and fold from the hips toward your feet.', cue: 'Reach chest forward first; do not just round the spine.', fix: 'Use seated fold, straddle fold, and posterior-chain breathing.' },
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
  const [source, setSource] = useState<SourceKey>('gowod');
  const [activeTab, setActiveTab] = useState<TabKey>('train');
  const [workoutMessage, setWorkoutMessage] = useState('');

  const forgefitAreaScores = getForgefitAreaScores(scores);
  const activeAreaScores = source === 'gowod' ? getGowodAreaScores() : forgefitAreaScores;
  const mobilityAverage = source === 'gowod' ? 89 : Math.round(activeAreaScores.reduce((total, item) => total + item.score, 0) / activeAreaScores.length);
  const weakestAreas = [...activeAreaScores].sort((a, b) => a.score - b.score).slice(0, 2).map((item) => item.area);
  const weakestTargets = weakestAreas.map((area) => targetByArea[area]);
  const recommendedDrills = mobility
    .filter((drill) => weakestTargets.some((target) => drill.target_area === target || drill.name.toLowerCase().includes(target) || (target === 'hamstrings' && drill.name.toLowerCase().includes('calf'))))
    .slice(0, 8);

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
              <p className="mt-2 text-sm text-zinc-300">Adaptive training plus GOWOD-informed mobility.</p>
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
                <label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Minutes</span><input type="number" min="20" max="90" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label>
                <label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Recovery</span><input type="number" min="1" max="100" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label>
              </div>
              <Chooser title="Equipment" options={equipmentOptions} selected={selectedEquipment} onToggle={(value) => toggle(selectedEquipment, value, setSelectedEquipment)} />
              <Chooser title="Muscle focus" options={muscleOptions} selected={priorities} onToggle={(value) => toggle(priorities, value, setPriorities)} />
              <button onClick={buildWorkout} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate workout</button>
              {workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}
            </Panel>
            {!!generated.length && <Panel title="Generated workout" eyebrow="Today"><div className="flex flex-col gap-3">{generated.map((exercise, index) => <article key={exercise.id} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-orange-300">#{index + 1} · {exercise.category}</p><h3 className="text-lg font-black">{exercise.name}</h3><p className="text-sm text-zinc-300">{exercise.sets} sets · {exercise.reps} reps · rest {exercise.restSeconds}s</p><p className="mt-2 text-sm text-zinc-400">{exercise.instructions?.[0] ?? 'Move with control.'}</p></article>)}</div><button onClick={saveWorkout} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save workout</button></Panel>}
          </section>
        )}

        {activeTab === 'mobility' && (
          <section className="flex flex-col gap-5">
            <Panel title="Mobility score" eyebrow="GOWOD result saved">
              <div className="flex items-center justify-center py-3">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-400 text-center">
                  <div><p className="text-5xl font-black">89</p><p className="text-sm text-zinc-300">global</p></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {getGowodAreaScores().map((item) => <ScoreBar key={item.area} area={item.area} score={item.score} />)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => setSource('gowod')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'gowod' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>Use GOWOD</button>
                <button onClick={() => setSource('forgefit')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'forgefit' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>Use sliders</button>
              </div>
              <p className="mt-3 text-sm text-zinc-300">Selected source: <span className="font-black text-orange-300">{source === 'gowod' ? 'GOWOD screenshot scores' : 'ForgeFit slider test'}</span>. Recommendations below use this source.</p>
            </Panel>

            <Panel title="Routine priority" eyebrow="Actually adapting">
              <p className="text-sm text-zinc-300">Your GOWOD post-chain score is <span className="font-black text-orange-300">22</span>, so the routine prioritizes hamstrings, calves, and posterior-chain mobility first.</p>
            </Panel>

            {source === 'forgefit' && mobilityTests.map((test) => (
              <article key={test.id} className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{test.area}</p><h2 className="mt-1 text-xl font-black">{test.title}</h2><p className="mt-1 text-sm text-zinc-300">{test.instruction}</p></div><span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-black">{scores[test.id]}</span></div>
                <div className="mt-3 rounded-2xl bg-black/25 p-3 text-sm text-zinc-300"><p><span className="font-black text-orange-300">Cue:</span> {test.cue}</p><p className="mt-1"><span className="font-black text-orange-300">Improve it:</span> {test.fix}</p></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><PoseArt pose={test.pose} value={0} label={test.start} small /><PoseArt pose={test.pose} value={100} label={test.end} small /></div>
                <div className="mt-4 rounded-2xl border border-orange-500/30 bg-black/30 p-3"><PoseArt pose={test.pose} value={scores[test.id]} label="Your range" /><input className="mt-4 w-full" type="range" min="0" max="100" value={scores[test.id]} onChange={(event) => setScores({ ...scores, [test.id]: Number(event.target.value) })} /><div className="mt-1 flex justify-between text-[10px] text-zinc-500"><span>{test.start}</span><span>{test.end}</span></div></div>
              </article>
            ))}

            <Panel title="Recommended routine" eyebrow="Based on selected source">
              <div className="flex flex-col gap-3">
                {(recommendedDrills.length ? recommendedDrills : mobility.slice(0, 8)).map((drill) => <div key={drill.id} className="rounded-2xl bg-black/25 p-4"><p className="text-xs font-bold text-orange-300">{drill.target_area} · {Math.max(1, Math.round(drill.duration_seconds / 60))} min</p><h3 className="font-black">{drill.name}</h3><p className="mt-1 text-sm text-zinc-400">{drill.instructions?.[0] ?? 'Move slowly, breathe, and stay out of sharp pain.'}</p></div>)}
              </div>
            </Panel>
          </section>
        )}

        {activeTab === 'library' && <Panel title="Available movements" eyebrow="Exercise library"><div className="flex flex-col gap-2">{exercises.map((exercise) => <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{exercise.name}</p><p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p></div>)}</div></Panel>}
        {activeTab === 'history' && <Panel title="Your saved workouts" eyebrow="Saved history"><div className="flex flex-col gap-2">{savedWorkouts.map((workout) => <div key={workout.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{workout.title}</p><p className="text-xs text-zinc-400">{workout.goal} · {workout.duration_minutes} min · recovery {workout.recovery_score ?? 'n/a'}</p></div>)}{!savedWorkouts.length && <p className="text-sm text-zinc-400">No saved workouts yet.</p>}</div></Panel>}
      </section>
    </main>
  );
}

function getForgefitAreaScores(scores: Record<string, number>) {
  const areas = Array.from(new Set(mobilityTests.map((test) => test.area))) as Area[];
  return areas.map((area) => {
    const tests = mobilityTests.filter((test) => test.area === area);
    return { area, score: Math.round(tests.reduce((total, test) => total + (scores[test.id] ?? 60), 0) / tests.length) };
  });
}

function getGowodAreaScores() {
  return (Object.entries(gowodScores) as [Area, number][]).map(([area, score]) => ({ area, score }));
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-orange-300">{eyebrow}</p><h2 className="mt-1 text-xl font-black">{title}</h2><div className="mt-4">{children}</div></section>;
}

function ScoreBar({ area, score }: { area: Area; score: number }) {
  const color = score < 40 ? 'bg-orange-400' : 'bg-emerald-400';
  return <div className="rounded-2xl bg-black/25 p-3 text-center"><p className="mx-auto rounded-lg bg-black/40 px-2 py-1 text-sm font-black">{score}</p><div className="mx-auto mt-2 flex h-20 w-2 items-end rounded-full bg-zinc-700"><span className={`block w-2 rounded-full ${color}`} style={{ height: `${score}%` }} /></div><p className="mt-2 text-[10px] font-bold text-zinc-300">{area}</p></div>;
}

function Chooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onToggle(option)} className={`rounded-full px-3 py-2 text-xs font-bold ${selected.includes(option) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>{option}</button>)}</div></div>;
}

function PoseArt({ pose, value, label, small = false }: { pose: Pose; value: number; label: string; small?: boolean }) {
  const p = Math.max(0, Math.min(100, value));
  const height = small ? 92 : 150;
  const skin = '#fed7aa';
  const head = '#fb923c';
  const limb = '#fdba74';
  return <div className="rounded-2xl border border-white/10 bg-black/30 p-2"><svg viewBox="0 0 260 160" className="w-full" style={{ height }} role="img" aria-label={label}><rect x="8" y="8" width="244" height="144" rx="22" fill="rgba(255,255,255,.04)" /><line x1="22" y1="132" x2="238" y2="132" stroke="rgba(255,255,255,.22)" strokeWidth="4" />{pose === 'squat' && <Squat p={p} skin={skin} head={head} limb={limb} />}{pose === 'toeTouch' && <ToeTouch p={p} skin={skin} head={head} limb={limb} />}{pose === 'ankleWall' && <AnkleWall p={p} skin={skin} head={head} limb={limb} />}{pose === 'overheadReach' && <OverheadReach p={p} skin={skin} head={head} limb={limb} />}{pose === 'wallSlide' && <OverheadReach p={p} skin={skin} head={head} limb={limb} />}{pose === 'thoracicTwist' && <Twist p={p} skin={skin} head={head} limb={limb} />}{pose === 'hip90' && <Hip90 p={p} skin={skin} head={head} limb={limb} />}{pose === 'lunge' && <Lunge p={p} skin={skin} head={head} limb={limb} />}{pose === 'legRaise' && <LegRaise p={p} skin={skin} head={head} limb={limb} />}{pose === 'seatedFold' && <ToeTouch p={p} skin={skin} head={head} limb={limb} />}</svg><div className="mt-1 flex items-center justify-between text-[10px]"><span className="text-zinc-400">{label}</span><span className="font-black text-orange-300">{Math.round(p)}%</span></div></div>;
}

function Joint({ x, y }: { x: number; y: number }) { return <circle cx={x} cy={y} r="3.5" fill="#080a0f" stroke="#fdba74" strokeWidth="2" />; }
function Squat({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const hipY = 62 + p * .52, headY = 32 + p * .18, lk = 92 - p * .28, rk = 168 + p * .28, ky = 104 + p * .26; return <><circle cx="130" cy={headY} r="13" fill={head} /><line x1="130" y1={headY+15} x2="130" y2={hipY} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1={hipY} x2={lk} y2={ky} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={lk} y1={ky} x2="66" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1={hipY} x2={rk} y2={ky} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={rk} y1={ky} x2="194" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1={headY+30} x2="82" y2={66+p*.45} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="132" y1={headY+30} x2="178" y2={66+p*.45} stroke={limb} strokeWidth="8" strokeLinecap="round" /><Joint x={lk} y={ky} /><Joint x={rk} y={ky} /></>; }
function ToeTouch({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const sx=116+p*.68, sy=66+p*.47, hx=100+p*.54, hy=42+p*.42, handX=128+p*.8, handY=82+p*.48; return <><circle cx={hx} cy={hy} r="13" fill={head} /><line x1="86" y1="74" x2={sx} y2={sy} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="86" y1="74" x2="58" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="86" y1="74" x2="204" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={sx} y1={sy} x2={handX} y2={handY} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1={sx} y1={sy} x2={handX+10} y2={handY+4} stroke={limb} strokeWidth="8" strokeLinecap="round" /></>; }
function AnkleWall({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const kneeX=92+p*1.18; return <><line x1="220" y1="18" x2="220" y2="136" stroke="rgba(255,255,255,.26)" strokeWidth="7" /><circle cx="72" cy="42" r="13" fill={head} /><line x1="72" y1="56" x2="104" y2="82" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="104" y1="82" x2={kneeX} y2="108" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={kneeX} y1="108" x2="164" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="104" y1="82" x2="48" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="96" y1="62" x2="206" y2="60" stroke={limb} strokeWidth="8" strokeLinecap="round" /><Joint x={kneeX} y={108} /></>; }
function OverheadReach({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const y=104-p*.88; return <><circle cx="130" cy="48" r="13" fill={head} /><line x1="130" y1="62" x2="130" y2="98" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1="72" x2="88" y2={y} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="72" x2="172" y2={y} stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="98" x2="100" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="130" y1="98" x2="160" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /></>; }
function Twist({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const rx=92+p*1.25, ry=84-p*.4; return <><circle cx="78" cy="62" r="13" fill={head} /><line x1="90" y1="72" x2="136" y2="96" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="136" y1="96" x2="78" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="136" y1="96" x2="184" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="110" y1="82" x2="54" y2="96" stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="112" y1="82" x2={rx} y2={ry} stroke={limb} strokeWidth="8" strokeLinecap="round" /></>; }
function Hip90({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const o=p*.68, lkx=82-o*.52, lky=110-o*.16, rkx=168+o*.68, rky=110-o*.28; return <><circle cx="128" cy="52" r="13" fill={head} /><line x1="128" y1="66" x2="128" y2="92" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1="94" x2={lkx} y2={lky} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={lkx} y1={lky} x2="52" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="128" y1="94" x2={rkx} y2={rky} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={rkx} y1={rky} x2="218" y2="126" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="126" y1="76" x2="92" y2="72" stroke={limb} strokeWidth="8" strokeLinecap="round" /><line x1="130" y1="76" x2="166" y2="72" stroke={limb} strokeWidth="8" strokeLinecap="round" /></>; }
function Lunge({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const hipX=128+p*.2, hipY=84+p*.12, fk=162+p*.32, bk=88-p*.22; return <><circle cx="126" cy="44" r="13" fill={head} /><line x1="126" y1="58" x2={hipX} y2={hipY} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={hipX} y1={hipY} x2={fk} y2="110" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={fk} y1="110" x2="196" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={hipX} y1={hipY} x2={bk} y2="112" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1={bk} y1="112" x2="58" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /></>; }
function LegRaise({ p, skin, head, limb }: { p: number; skin: string; head: string; limb: string }) { const footY=132-p*.94; return <><circle cx="54" cy="104" r="12" fill={head} /><line x1="66" y1="108" x2="126" y2="124" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="126" y1="124" x2="210" y2="132" stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="126" y1="124" x2="176" y2={footY} stroke={skin} strokeWidth="9" strokeLinecap="round" /><line x1="86" y1="112" x2="112" y2="98" stroke={limb} strokeWidth="8" strokeLinecap="round" /></>; }
