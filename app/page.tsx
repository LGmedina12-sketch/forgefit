'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type Exercise = { id: string; name: string; muscle_groups: string[]; equipment_needed: string[]; difficulty: string; category: string; instructions: string[] };
type Drill = { id: string; name: string; target_area: string; duration_seconds: number; difficulty: string; equipment_needed: string[]; instructions: string[] };
type GenExercise = Exercise & { sets: number; reps: string; restSeconds: number; readiness: number };
type SavedWorkout = { id: string; title: string; goal: string; duration_minutes: number; recovery_score: number | null; status: string; created_at: string };
type MuscleSession = { trained_muscles: string[]; created_at: string };
type Area = 'Shoulders' | 'Overhead' | 'Thorax' | 'Hips' | 'Postchain' | 'Ankles';
type SplitKey = 'full' | 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'mma';
type ProgramKey = 'ppl' | 'upper_lower' | 'arnold' | 'mma' | 'custom';
type MobilityMode = 'pre' | 'post' | 'daily' | 'recovery';
type MobilityActivity = 'lifting' | 'legs' | 'push' | 'pull' | 'running' | 'mma' | 'general';
type SplitDay = { label: string; split: SplitKey; muscles: string[]; activity: MobilityActivity };

const tabs = ['train', 'mobility', 'library', 'history'] as const;
const goals = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const equipment = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box', 'medicine ball'];
const mobilityEquipment = ['bodyweight', 'wall', 'bench', 'resistance band', 'foam roller', 'dumbbell', 'box'];
const muscles = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];
const originalGowod: Record<Area, number> = { Shoulders: 91, Overhead: 88, Thorax: 99, Hips: 98, Postchain: 22, Ankles: 100 };
const targetByArea: Record<Area, string> = { Shoulders: 'shoulders', Overhead: 'shoulders', Thorax: 'thoracic spine', Hips: 'hips', Postchain: 'hamstrings', Ankles: 'ankles' };
const areaBoosts: Record<MobilityActivity, Area[]> = { lifting: ['Hips', 'Thorax', 'Shoulders', 'Postchain'], legs: ['Postchain', 'Hips', 'Ankles'], push: ['Shoulders', 'Overhead', 'Thorax'], pull: ['Thorax', 'Shoulders', 'Postchain'], running: ['Ankles', 'Postchain', 'Hips'], mma: ['Hips', 'Thorax', 'Shoulders', 'Postchain', 'Ankles'], general: ['Postchain', 'Hips', 'Shoulders'] };
const programLabels: Record<ProgramKey, string> = { ppl: 'Push / Pull / Legs', upper_lower: 'Upper / Lower', arnold: 'Arnold-ish', mma: 'MMA hybrid', custom: 'My custom split' };
const defaultCustom: SplitDay[] = [
  { label: 'Custom 1', split: 'full', muscles: ['back', 'legs', 'core'], activity: 'lifting' },
  { label: 'Custom 2', split: 'push', muscles: ['chest', 'shoulders', 'core'], activity: 'push' },
  { label: 'Custom 3', split: 'pull', muscles: ['back', 'shoulders', 'core'], activity: 'pull' },
];
const programs: Record<Exclude<ProgramKey, 'custom'>, SplitDay[]> = {
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
  mma: [
    { label: 'MMA strength', split: 'mma', muscles: ['back', 'legs', 'core', 'shoulders'], activity: 'mma' },
    { label: 'Explosive lower', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
    { label: 'Upper power', split: 'upper', muscles: ['back', 'chest', 'shoulders', 'core'], activity: 'mma' },
    { label: 'Conditioning/core', split: 'full', muscles: ['core', 'legs', 'back', 'shoulders'], activity: 'mma' },
  ],
};

export default function Page() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('Sign in to train.');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('train');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [muscleSessions, setMuscleSessions] = useState<MuscleSession[]>([]);
  const [goal, setGoal] = useState('MMA performance');
  const [duration, setDuration] = useState(45);
  const [recovery, setRecovery] = useState(75);
  const [program, setProgram] = useState<ProgramKey>('ppl');
  const [dayIndex, setDayIndex] = useState(0);
  const [customDays, setCustomDays] = useState<SplitDay[]>(defaultCustom);
  const [split, setSplit] = useState<SplitKey>('push');
  const [focus, setFocus] = useState<string[]>(['chest', 'shoulders', 'core']);
  const [workoutEquipment, setWorkoutEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [generated, setGenerated] = useState<GenExercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [workoutRerolls, setWorkoutRerolls] = useState(0);
  const [workoutMessage, setWorkoutMessage] = useState('');
  const [gowod, setGowod] = useState<Record<Area, number>>(originalGowod);
  const [mobilityMode, setMobilityMode] = useState<MobilityMode>('pre');
  const [mobilityActivity, setMobilityActivity] = useState<MobilityActivity>('push');
  const [mobilityMinutes, setMobilityMinutes] = useState(8);
  const [mobEquipment, setMobEquipment] = useState<string[]>(['bodyweight', 'wall', 'bench']);
  const [generatedMobility, setGeneratedMobility] = useState<Drill[]>([]);
  const [mobilityHistory, setMobilityHistory] = useState<string[][]>([]);
  const [mobilityReroll, setMobilityReroll] = useState(0);
  const [routineMessage, setRoutineMessage] = useState('Generate a routine. Last 3 routines are blocked when possible.');

  const days = program === 'custom' ? customDays : programs[program];
  const muscleRecovery = getMuscleRecovery(muscleSessions);
  const recoveryMap = Object.fromEntries(muscleRecovery.map((item) => [item.muscle, item]));
  const tiredFocus = focus.filter((m) => (recoveryMap[m]?.readiness ?? 100) < 80);
  const areaScores = Object.entries(gowod).map(([area, score]) => ({ area: area as Area, score }));
  const mobilityPlan = buildMobilityRoutine(areaScores, drills, mobilityActivity, mobilityMode, mobilityMinutes, mobilityReroll, mobEquipment, mobilityHistory.flat());
  const shownDrills = generatedMobility.length ? generatedMobility : mobilityPlan.drills;
  const mobilityGlobal = getGowodGlobal(gowod);

  useEffect(() => {
    const savedCustom = localStorage.getItem('forgefit-custom-days');
    const savedProgram = localStorage.getItem('forgefit-program') as ProgramKey | null;
    if (savedCustom) { try { setCustomDays(JSON.parse(savedCustom)); } catch {} }
    if (savedProgram && Object.keys(programLabels).includes(savedProgram)) setProgram(savedProgram);
  }, []);
  useEffect(() => { localStorage.setItem('forgefit-custom-days', JSON.stringify(customDays)); }, [customDays]);
  useEffect(() => { localStorage.setItem('forgefit-program', program); }, [program]);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);
      const [{ data: exRows }, { data: drillRows }] = await Promise.all([
        supabase.from('exercises').select('*').order('name'),
        supabase.from('mobility_drills').select('*').order('target_area'),
      ]);
      setExercises((exRows as Exercise[]) ?? []);
      setDrills((drillRows as Drill[]) ?? []);
      if (user) await Promise.all([loadSavedWorkouts(), loadMuscleHistory(), loadMobilityHistory()]);
    }
    load();
  }, [supabase]);

  async function loadSavedWorkouts() {
    const { data } = await supabase.from('workouts').select('id, title, goal, duration_minutes, recovery_score, status, created_at').order('created_at', { ascending: false }).limit(8);
    setSavedWorkouts((data as SavedWorkout[]) ?? []);
  }
  async function loadMuscleHistory() {
    const { data } = await supabase.from('workout_muscle_sessions').select('trained_muscles, created_at').order('created_at', { ascending: false }).limit(8);
    setMuscleSessions(((data as MuscleSession[]) ?? []).map((row) => ({ trained_muscles: expandMuscles(row.trained_muscles ?? []), created_at: row.created_at })));
  }
  async function loadMobilityHistory() {
    const { data } = await supabase.from('mobility_sessions').select('id, mobility_session_drills(mobility_drill_id, position)').order('created_at', { ascending: false }).limit(3);
    const rows = (data ?? []) as { mobility_session_drills?: { mobility_drill_id: string; position: number }[] }[];
    setMobilityHistory(rows.map((s) => (s.mobility_session_drills ?? []).sort((a, b) => a.position - b.position).map((d) => d.mobility_drill_id)).filter(Boolean).slice(0, 3));
  }

  async function signUp() {
    const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    if (error) return setAuthMessage(error.message);
    setUserId(data.session?.user.id ?? null);
    setUserEmail(data.session?.user.email ?? null);
    setAuthMessage(data.session ? 'Account created.' : 'Account created. Check your email.');
  }
  async function signIn() {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthMessage(error.message);
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? null);
    setAuthMessage(`Welcome back, ${data.user.email}`);
    await Promise.all([loadSavedWorkouts(), loadMuscleHistory(), loadMobilityHistory()]);
  }
  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null); setUserEmail(null); setGenerated([]); setGeneratedMobility([]); setSavedWorkouts([]); setMuscleSessions([]); setMobilityHistory([]);
  }

  function pickDay(day: SplitDay, index: number) {
    setDayIndex(index); setSplit(day.split); setFocus(day.muscles); setMobilityActivity(day.activity); setWorkoutMessage(`${day.label} selected. Muscle focus updated automatically.`);
  }
  function saveCustomDay() {
    const next = [...customDays];
    const idx = Math.min(dayIndex, next.length - 1);
    next[idx] = { label: next[idx]?.label ?? `Custom ${idx + 1}`, split, muscles: focus, activity: mobilityActivity };
    setCustomDays(next); setProgram('custom'); setWorkoutMessage(`Saved current focus to ${next[idx].label}.`);
  }
  function toggle(list: string[], value: string, setter: (next: string[]) => void) { setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]); }

  function generateWorkout() {
    const count = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const goalText = goal.toLowerCase();
    const scored = exercises.map((exercise) => {
      if (!matchesEquipment(exercise.equipment_needed, workoutEquipment)) return { exercise, score: -999, readiness: 100 };
      const readiness = getExerciseReadiness(exercise, recoveryMap);
      let score = 10 + Math.random() * 12;
      score += exercise.muscle_groups.filter((m) => focus.includes(m)).length * 7;
      if (goalText.includes('mma') && ['power', 'conditioning', 'core'].includes(exercise.category)) score += 6;
      if ((split === 'legs' || split === 'lower') && exercise.muscle_groups.some((m) => ['legs', 'glutes', 'hamstrings', 'quads'].includes(m))) score += 8;
      if (split === 'push' && exercise.muscle_groups.some((m) => ['chest', 'shoulders'].includes(m))) score += 8;
      if (split === 'pull' && exercise.muscle_groups.includes('back')) score += 8;
      if (goalText.includes('strength') && exercise.category === 'strength') score += 6;
      if (goalText.includes('muscle') && exercise.category === 'hypertrophy') score += 6;
      if (goalText.includes('conditioning') && exercise.category === 'conditioning') score += 7;
      if (recentExerciseIds.includes(exercise.id)) score -= 9;
      if (readiness < 90) score -= (90 - readiness) / 3;
      if (readiness < 55) score -= 12;
      return { exercise, score, readiness };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    const ready = scored.filter((x) => x.readiness >= 65);
    const source = ready.length >= count ? ready : scored;
    const chosen: { exercise: Exercise; readiness: number }[] = [];
    getWorkoutCategoryPlan(split, goal, count).forEach((cat) => {
      const pool = source.filter((x) => !chosen.some((p) => p.exercise.id === x.exercise.id) && (x.exercise.category === cat || cat === 'any'));
      const fallback = source.filter((x) => !chosen.some((p) => p.exercise.id === x.exercise.id));
      const usePool = (pool.length ? pool : fallback).slice(0, 6);
      if (usePool.length) chosen.push(usePool[Math.floor(Math.random() * usePool.length)]);
    });
    while (chosen.length < count) {
      const pool = source.filter((x) => !chosen.some((p) => p.exercise.id === x.exercise.id)).slice(0, 10);
      if (!pool.length) break;
      chosen.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    const workout = chosen.map(({ exercise, readiness }, i) => ({ ...exercise, readiness, sets: readiness < 60 || recovery < 55 ? 2 : goalText.includes('muscle') ? 4 : i === 0 ? 4 : 3, reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : goalText.includes('strength') ? '4-6' : '8-12', restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' || goalText.includes('strength') ? 120 : 75 }));
    const reroll = workoutRerolls + 1;
    setGenerated(workout); setWorkoutRerolls(reroll); setRecentExerciseIds((old) => [...workout.map((x) => x.id), ...old].slice(0, 14));
    setWorkoutMessage(workout.length ? `Workout #${reroll}.${tiredFocus.length ? ` ${tiredFocus.join(', ')} still needs rest, so volume shifted when possible.` : ''}` : 'No exercises matched your equipment.');
  }

  async function saveWorkout() {
    if (!userId) return setWorkoutMessage('Sign in before saving.');
    if (!generated.length) return setWorkoutMessage('Generate a workout first.');
    const { data: row, error } = await supabase.from('workouts').insert({ user_id: userId, title: `${goal} ${days[dayIndex]?.label ?? split} session`, goal, duration_minutes: duration, recovery_score: recovery, status: 'planned' }).select('id').single();
    if (error || !row) return setWorkoutMessage(error?.message ?? 'Workout could not be saved.');
    await supabase.from('workout_exercises').insert(generated.map((ex, i) => ({ workout_id: row.id, exercise_id: ex.id, position: i + 1, target_sets: ex.sets, target_reps: ex.reps, rest_seconds: ex.restSeconds, notes: ex.instructions?.[0] ?? '' })));
    const trained = getWorkoutMuscles(generated);
    await supabase.from('workout_muscle_sessions').insert({ user_id: userId, workout_id: row.id, trained_muscles: trained, source: 'saved_workout' });
    setMuscleSessions((old) => [{ trained_muscles: trained, created_at: new Date().toISOString() }, ...old].slice(0, 8));
    setWorkoutMessage('Workout saved. Muscles are now on recovery cooldown.');
    await loadSavedWorkouts();
  }

  function generateMobilityRoutine() {
    const next = mobilityReroll + 1;
    const plan = buildMobilityRoutine(areaScores, drills, mobilityActivity, mobilityMode, mobilityMinutes, next, mobEquipment, mobilityHistory.flat());
    setMobilityReroll(next); setGeneratedMobility(plan.drills); setMobilityHistory((old) => [plan.drills.map((d) => d.id), ...old].slice(0, 3));
    setRoutineMessage(plan.drills.length ? `Generated routine #${next}.` : 'No matching mobility drills.');
  }
  async function completeMobilitySession() {
    if (!userId || !shownDrills.length) return setRoutineMessage('Generate a routine first.');
    const { data: row, error } = await supabase.from('mobility_sessions').insert({ user_id: userId, title: `${mobilityMode} ${mobilityActivity} mobility`, target_areas: mobilityPlan.weakestAreas, duration_minutes: mobilityMinutes, completed_at: new Date().toISOString() }).select('id').single();
    if (error || !row) return setRoutineMessage(error?.message ?? 'Could not save mobility.');
    await supabase.from('mobility_session_drills').insert(shownDrills.map((d, i) => ({ mobility_session_id: row.id, mobility_drill_id: d.id, position: i + 1, target_seconds: Math.round((mobilityMinutes * 60) / shownDrills.length), completed: true })));
    setRoutineMessage('Mobility session saved.');
  }

  if (!userId) return <AuthScreen email={email} password={password} authMessage={authMessage} setEmail={setEmail} setPassword={setPassword} signIn={signIn} signUp={signUp} />;

  return <main className="min-h-screen bg-[#080a0f] px-4 py-5 text-white"><section className="mx-auto flex max-w-md flex-col gap-5 pb-28">
    <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-orange-200/80">Welcome, {userEmail}</p><h1 className="mt-1 text-3xl font-black">Today&apos;s plan</h1><p className="mt-2 text-sm text-zinc-300">Recovery-aware workouts, custom splits, and tracked mobility.</p></div><button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button></div><div className="mt-4 grid grid-cols-4 gap-2">{tabs.map((t) => <button key={t} onClick={() => setActiveTab(t)} className={`rounded-2xl px-3 py-3 text-xs font-black ${activeTab === t ? 'bg-white text-black' : 'bg-white/10 text-zinc-200'}`}>{t}</button>)}</div></header>
    {activeTab === 'train' && <section className="flex flex-col gap-5"><Panel eyebrow="Set it once" title="Split program"><div className="grid grid-cols-2 gap-2">{(Object.keys(programLabels) as ProgramKey[]).map((key) => <button key={key} onClick={() => { setProgram(key); setDayIndex(0); pickDay((key === 'custom' ? customDays : programs[key])[0], 0); }} className={`rounded-2xl px-3 py-3 text-xs font-black ${program === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{programLabels[key]}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{days.map((d, i) => <button key={`${d.label}-${i}`} onClick={() => pickDay(d, i)} className={`rounded-2xl px-3 py-3 text-xs font-black ${dayIndex === i ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{d.label}</button>)}</div><p className="mt-3 text-xs text-zinc-400">Focus: <span className="font-black text-orange-300">{focus.join(', ')}</span></p><button onClick={saveCustomDay} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">Save current focus to custom day</button></Panel><Panel eyebrow="Smart cooldown" title="Muscle recovery"><div className="grid grid-cols-2 gap-2">{muscleRecovery.map((m) => <div key={m.muscle} className={`rounded-2xl p-3 ${m.status === 'Rest' ? 'bg-red-500/15' : m.status === 'Light' ? 'bg-yellow-500/15' : 'bg-emerald-500/15'}`}><p className="text-xs font-black uppercase text-zinc-300">{m.muscle}</p><p className="mt-1 text-lg font-black">{m.lastTrainedAt ? `${m.readiness}%` : 'fresh'}</p><p className="text-xs text-zinc-400">{m.status}{m.hoursSince !== null ? ` · ${m.hoursSince}h ago` : ''}</p></div>)}</div></Panel><Panel eyebrow="Recovery-aware generator" title="Build workout"><select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3">{goals.map((g) => <option key={g}>{g}</option>)}</select><div className="mt-4 grid grid-cols-2 gap-3"><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Minutes</span><input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Recovery</span><input type="number" value={recovery} onChange={(e) => setRecovery(Number(e.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label></div><Chooser title="Workout equipment" options={equipment} selected={workoutEquipment} onToggle={(v) => toggle(workoutEquipment, v, setWorkoutEquipment)} /><Chooser title="Specific muscle focus" options={muscles} selected={focus} onToggle={(v) => toggle(focus, v, setFocus)} /><button onClick={generateWorkout} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate new workout</button>{workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}</Panel>{!!generated.length && <Panel eyebrow={`Reroll #${workoutRerolls}`} title="Generated workout"><div className="flex flex-col gap-3">{generated.map((ex, i) => <article key={`${ex.id}-${workoutRerolls}`} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-orange-300">#{i + 1} · {ex.category} · muscle ready {Math.round(ex.readiness)}%</p><h3 className="text-lg font-black">{ex.name}</h3><p className="text-sm text-zinc-300">{ex.sets} sets · {ex.reps} · rest {ex.restSeconds}s</p><p className="mt-1 text-xs text-zinc-500">Needs: {ex.equipment_needed.join(', ') || 'bodyweight'}</p></article>)}</div><button onClick={saveWorkout} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save workout / log muscles</button></Panel>}</section>}
    {activeTab === 'mobility' && <section className="flex flex-col gap-5"><Panel eyebrow="GOWOD-style" title="Mobility score"><div className="flex items-center justify-center py-3"><div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-400 text-center"><div><p className="text-5xl font-black">{mobilityGlobal}</p><p className="text-sm text-zinc-300">global</p></div></div></div><div className="grid grid-cols-3 gap-2">{areaScores.map((x) => <ScoreBar key={x.area} area={x.area} score={x.score} editable onChange={(n) => setGowod((old) => ({ ...old, [x.area]: n }))} />)}</div></Panel><Panel eyebrow="No-repeat generator" title="Routine builder"><div className="grid grid-cols-2 gap-2">{(['pre','post','daily','recovery'] as MobilityMode[]).map((m) => <button key={m} onClick={() => setMobilityMode(m)} className={`rounded-2xl px-3 py-3 text-xs font-black ${mobilityMode === m ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{m}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2">{(['lifting','legs','push','pull','running','mma','general'] as MobilityActivity[]).map((a) => <button key={a} onClick={() => setMobilityActivity(a)} className={`rounded-2xl px-3 py-3 text-xs font-black ${mobilityActivity === a ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{a}</button>)}</div><div className="mt-3 grid grid-cols-4 gap-2">{[5,8,12,15].map((n) => <button key={n} onClick={() => setMobilityMinutes(n)} className={`rounded-2xl px-2 py-3 text-xs font-black ${mobilityMinutes === n ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{n}m</button>)}</div><Chooser title="Mobility equipment" options={mobilityEquipment} selected={mobEquipment} onToggle={(v) => toggle(mobEquipment, v, setMobEquipment)} /></Panel><Panel eyebrow="Tracked routine" title={`Recommended ${mobilityMinutes} min`}><button onClick={generateMobilityRoutine} className="mb-3 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black">Generate mobility routine</button><div className="flex flex-col gap-3">{shownDrills.map((d, i) => <div key={`${d.id}-${mobilityReroll}`} className="rounded-2xl bg-black/25 p-4"><p className="text-xs font-bold text-orange-300">Step {i + 1} · {d.target_area}</p><h3 className="font-black">{d.name}</h3><p className="text-xs text-zinc-500">Needs: {d.equipment_needed.join(', ') || 'bodyweight'}</p><p className="mt-1 text-sm text-zinc-400">{d.instructions?.[0] ?? 'Move slowly and breathe.'}</p></div>)}</div>{!!shownDrills.length && <button onClick={completeMobilitySession} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">Complete and save mobility session</button>}<p className="mt-3 text-sm text-orange-200">{routineMessage}</p></Panel></section>}
    {activeTab === 'library' && <Panel eyebrow="Exercise library" title="Available movements"><div className="flex flex-col gap-2">{exercises.map((ex) => <div key={ex.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{ex.name}</p><p className="text-xs text-zinc-400">{ex.muscle_groups.join(' • ')} · {ex.equipment_needed.join(', ')}</p></div>)}</div></Panel>}
    {activeTab === 'history' && <Panel eyebrow="Saved history" title="Your saved workouts"><div className="flex flex-col gap-2">{savedWorkouts.map((w) => <div key={w.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{w.title}</p><p className="text-xs text-zinc-400">{w.goal} · {w.duration_minutes} min · recovery {w.recovery_score ?? 'n/a'}</p></div>)}{!savedWorkouts.length && <p className="text-sm text-zinc-400">No saved workouts yet.</p>}</div></Panel>}
  </section></main>;
}

function AuthScreen({ email, password, authMessage, setEmail, setPassword, signIn, signUp }: { email: string; password: string; authMessage: string; setEmail: (v: string) => void; setPassword: (v: string) => void; signIn: () => void; signUp: () => void }) { return <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl"><p className="text-sm font-semibold text-orange-300">ForgeFit</p><h1 className="mt-2 text-4xl font-black">Sign in to train</h1><div className="mt-6 flex flex-col gap-3"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><button onClick={signIn} className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-black">Sign in</button><button onClick={signUp} className="rounded-2xl border border-white/10 px-4 py-3 font-black">Create account</button><p className="text-sm text-orange-200">{authMessage}</p></div></section></main>; }
function matchesEquipment(required: string[] = [], selected: string[]) { return !required.length || required.every((item) => item.toLowerCase() === 'bodyweight' || selected.includes(item.toLowerCase())); }
function expandMuscles(list: string[]) { const set = new Set<string>(); list.forEach((m) => { set.add(m); if (m === 'legs') ['quads', 'hamstrings', 'glutes'].forEach((x) => set.add(x)); }); return Array.from(set); }
function getWorkoutMuscles(workout: GenExercise[]) { return expandMuscles(Array.from(new Set(workout.flatMap((ex) => ex.muscle_groups)))); }
function getMuscleRecovery(sessions: MuscleSession[]) { const now = Date.now(); const cooldown: Record<string, number> = { core: 24, chest: 48, back: 48, shoulders: 48, legs: 48, glutes: 48, hamstrings: 48, quads: 48 }; return muscles.map((muscle) => { const found = sessions.find((s) => expandMuscles(s.trained_muscles).includes(muscle)); if (!found) return { muscle, readiness: 100, hoursSince: null, status: 'Ready' as const, lastTrainedAt: null }; const hoursSince = Math.max(0, Math.floor((now - new Date(found.created_at).getTime()) / 36e5)); const readiness = Math.min(100, Math.round((hoursSince / (cooldown[muscle] ?? 48)) * 100)); return { muscle, readiness, hoursSince, status: readiness >= 90 ? 'Ready' as const : readiness >= 60 ? 'Light' as const : 'Rest' as const, lastTrainedAt: found.created_at }; }); }
function getExerciseReadiness(ex: Exercise, rec: Record<string, { readiness: number }>) { const values = expandMuscles(ex.muscle_groups).map((m) => rec[m]?.readiness ?? 100); return Math.min(...values, 100); }
function getWorkoutCategoryPlan(split: SplitKey, goal: string, count: number) { const g = goal.toLowerCase(); let p = split === 'mma' ? ['power', 'strength', 'conditioning', 'core', 'hypertrophy', 'any'] : ['strength', 'hypertrophy', 'hypertrophy', 'core', 'conditioning', 'any']; if (g.includes('conditioning') || g.includes('lose')) p = ['conditioning', 'strength', 'core', 'hypertrophy', 'conditioning', 'any']; if (g.includes('strength')) p = ['strength', 'strength', 'hypertrophy', 'core', 'conditioning', 'any']; return p.slice(0, count); }
function seededNoise(text: string) { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 9973; return (h % 100) / 100; }
function buildMobilityRoutine(areaScores: { area: Area; score: number }[], drills: Drill[], activity: MobilityActivity, mode: MobilityMode, minutes: number, shuffle: number, eq: string[], recent: string[]) { const boosted = areaBoosts[activity]; const areas = areaScores.map((x) => ({ ...x, priority: (100 - x.score) + (boosted.includes(x.area) ? 20 : 0) })).sort((a, b) => b.priority - a.priority); const weak = areas.slice(0, mode === 'daily' ? 3 : 2).map((x) => x.area); const targets = weak.map((a) => targetByArea[a]); const count = minutes <= 5 ? 4 : minutes <= 8 ? 5 : minutes <= 12 ? 6 : 8; const pool = drills.filter((d) => matchesEquipment(d.equipment_needed, eq)); const fresh = pool.filter((d) => !recent.includes(d.id)); const source = fresh.length >= count ? fresh : pool; const ranked = source.map((d) => { let score = seededNoise(`${d.id}-${shuffle}-${activity}-${mode}`) * 35; targets.forEach((t, i) => { if (d.target_area === t || d.name.toLowerCase().includes(t)) score += 42 - i * 8; if (t === 'hamstrings' && /calf|hamstring|fold|posterior/i.test(d.name)) score += 22; }); return { d, score }; }).sort((a, b) => b.score - a.score); return { weakestAreas: weak, drills: ranked.slice(0, count).map((x) => x.d) }; }
function getGowodGlobal(scores: Record<Area, number>) { const oldAvg = Math.round(Object.values(originalGowod).reduce((a, b) => a + b, 0) / 6); const nowAvg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6); return Math.max(0, Math.min(100, 89 + (nowAvg - oldAvg))); }
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-orange-300">{eyebrow}</p><h2 className="mt-1 text-xl font-black">{title}</h2><div className="mt-4">{children}</div></section>; }
function ScoreBar({ area, score, editable, onChange }: { area: Area; score: number; editable?: boolean; onChange?: (next: number) => void }) { return <div className="rounded-2xl bg-black/25 p-3 text-center"><p className="mx-auto rounded-lg bg-black/40 px-2 py-1 text-sm font-black">{score}</p><div className="mx-auto mt-2 flex h-20 w-2 items-end rounded-full bg-zinc-700"><span className={`block w-2 rounded-full ${score < 40 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ height: `${score}%` }} /></div><p className="mt-2 text-[10px] font-bold text-zinc-300">{area}</p>{editable && <input className="mt-2 w-full" type="range" min="0" max="100" value={score} onChange={(e) => onChange?.(Number(e.target.value))} />}</div>; }
function Chooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{options.map((o) => <button key={o} onClick={() => onToggle(o)} className={`rounded-full px-3 py-2 text-xs font-bold ${selected.includes(o) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>{o}</button>)}</div></div>; }
