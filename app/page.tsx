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
type MobilityActivity = 'lifting' | 'legs' | 'push' | 'pull' | 'running' | 'mma' | 'general';
type RoutineKey = 'mma_pre' | 'legs_pre' | 'upper_pre' | 'running_pre' | 'post_lift' | 'daily_reset' | 'recovery';
type SplitDay = { label: string; split: SplitKey; muscles: string[]; activity: MobilityActivity };
type RoutineGoal = { label: string; activity: MobilityActivity; mode: 'pre' | 'post' | 'daily' | 'recovery'; areas: Area[]; description: string };
type RoutineStep = { phase: 'Prep' | 'Main restriction' | 'Support' | 'Reset'; seconds: number; drill: Drill; why: string };

const tabs = ['train', 'mobility', 'library', 'history'] as const;
const goals = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const equipment = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box', 'medicine ball'];
const mobilityEquipment = ['bodyweight', 'wall', 'bench', 'resistance band', 'foam roller', 'dumbbell', 'box'];
const muscles = ['back', 'legs', 'arms', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];
const gowodBase: Record<Area, number> = { Shoulders: 91, Overhead: 88, Thorax: 99, Hips: 98, Postchain: 22, Ankles: 100 };
const areaTarget: Record<Area, string> = { Shoulders: 'shoulders', Overhead: 'shoulders', Thorax: 'thoracic spine', Hips: 'hips', Postchain: 'hamstrings', Ankles: 'ankles' };
const activityBoost: Record<MobilityActivity, Area[]> = { lifting: ['Hips', 'Thorax', 'Shoulders', 'Postchain'], legs: ['Postchain', 'Hips', 'Ankles'], push: ['Shoulders', 'Overhead', 'Thorax'], pull: ['Thorax', 'Shoulders', 'Postchain'], running: ['Ankles', 'Postchain', 'Hips'], mma: ['Hips', 'Thorax', 'Shoulders', 'Postchain', 'Ankles'], general: ['Postchain', 'Hips', 'Shoulders'] };
const routineGoals: Record<RoutineKey, RoutineGoal> = {
  mma_pre: { label: 'MMA / BJJ warm-up', activity: 'mma', mode: 'pre', areas: ['Hips', 'Thorax', 'Shoulders', 'Postchain'], description: 'Dynamic hips, spine, shoulders, and posterior chain before training.' },
  legs_pre: { label: 'Leg day warm-up', activity: 'legs', mode: 'pre', areas: ['Postchain', 'Hips', 'Ankles'], description: 'Hamstrings, hips, ankles, then squat/hinge-ready flow.' },
  upper_pre: { label: 'Upper warm-up', activity: 'lifting', mode: 'pre', areas: ['Shoulders', 'Overhead', 'Thorax'], description: 'Shoulders, overhead range, thoracic rotation, and upper-back prep.' },
  running_pre: { label: 'Run warm-up', activity: 'running', mode: 'pre', areas: ['Ankles', 'Postchain', 'Hips'], description: 'Ankles, calves, hamstrings, and hips before running.' },
  post_lift: { label: 'Post-workout reset', activity: 'general', mode: 'post', areas: ['Postchain', 'Hips', 'Thorax'], description: 'Slower holds and breathing after lifting.' },
  daily_reset: { label: 'Daily mobility', activity: 'general', mode: 'daily', areas: ['Postchain', 'Hips', 'Shoulders', 'Thorax'], description: 'Balanced daily work with your weakest area first.' },
  recovery: { label: 'Recovery / soreness', activity: 'general', mode: 'recovery', areas: ['Postchain', 'Hips', 'Thorax'], description: 'Low-intensity reset when you feel beat up.' },
};
const programLabels: Record<ProgramKey, string> = { ppl: 'Push / Pull / Legs', upper_lower: 'Upper / Lower', arnold: 'Arnold-ish', mma: 'MMA hybrid', custom: 'My custom split' };
const defaultCustom: SplitDay[] = [
  { label: 'Custom 1', split: 'full', muscles: ['back', 'legs', 'core'], activity: 'lifting' },
  { label: 'Custom 2', split: 'push', muscles: ['chest', 'shoulders', 'arms', 'core'], activity: 'push' },
  { label: 'Custom 3', split: 'pull', muscles: ['back', 'arms', 'shoulders', 'core'], activity: 'pull' },
];
const programs: Record<Exclude<ProgramKey, 'custom'>, SplitDay[]> = {
  ppl: [
    { label: 'Push', split: 'push', muscles: ['chest', 'shoulders', 'arms', 'core'], activity: 'push' },
    { label: 'Pull', split: 'pull', muscles: ['back', 'arms', 'shoulders', 'core'], activity: 'pull' },
    { label: 'Legs', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
  ],
  upper_lower: [
    { label: 'Upper', split: 'upper', muscles: ['back', 'chest', 'shoulders', 'arms', 'core'], activity: 'lifting' },
    { label: 'Lower', split: 'lower', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
  ],
  arnold: [
    { label: 'Chest + Back', split: 'upper', muscles: ['chest', 'back', 'core'], activity: 'lifting' },
    { label: 'Shoulders + Arms', split: 'push', muscles: ['shoulders', 'arms', 'core'], activity: 'push' },
    { label: 'Legs', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads'], activity: 'legs' },
  ],
  mma: [
    { label: 'MMA strength', split: 'mma', muscles: ['back', 'legs', 'core', 'shoulders'], activity: 'mma' },
    { label: 'Upper power', split: 'upper', muscles: ['back', 'chest', 'shoulders', 'arms', 'core'], activity: 'mma' },
    { label: 'Explosive lower', split: 'legs', muscles: ['legs', 'glutes', 'hamstrings', 'quads', 'core'], activity: 'legs' },
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
  const [saved, setSaved] = useState<SavedWorkout[]>([]);
  const [muscleSessions, setMuscleSessions] = useState<MuscleSession[]>([]);
  const [goal, setGoal] = useState('MMA performance');
  const [duration, setDuration] = useState(45);
  const [recovery, setRecovery] = useState(75);
  const [program, setProgram] = useState<ProgramKey>('ppl');
  const [dayIndex, setDayIndex] = useState(0);
  const [customDays, setCustomDays] = useState<SplitDay[]>(defaultCustom);
  const [split, setSplit] = useState<SplitKey>('push');
  const [focus, setFocus] = useState<string[]>(['chest', 'shoulders', 'arms', 'core']);
  const [workoutEquipment, setWorkoutEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [generated, setGenerated] = useState<GenExercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [workoutRerolls, setWorkoutRerolls] = useState(0);
  const [workoutMessage, setWorkoutMessage] = useState('');
  const [gowod, setGowod] = useState<Record<Area, number>>(gowodBase);
  const [routineKey, setRoutineKey] = useState<RoutineKey>('mma_pre');
  const [mobilityMinutes, setMobilityMinutes] = useState(8);
  const [mobEquipment, setMobEquipment] = useState<string[]>(['bodyweight', 'wall', 'bench']);
  const [generatedMobility, setGeneratedMobility] = useState<RoutineStep[]>([]);
  const [mobilityHistory, setMobilityHistory] = useState<string[][]>([]);
  const [mobilityReroll, setMobilityReroll] = useState(0);
  const [routineMessage, setRoutineMessage] = useState('Pick one routine type, then generate.');

  const days = program === 'custom' ? customDays : programs[program];
  const muscleRecovery = getMuscleRecovery(muscleSessions);
  const recoveryMap = Object.fromEntries(muscleRecovery.map((x) => [x.muscle, x]));
  const tiredFocus = focus.filter((m) => (recoveryMap[m]?.readiness ?? 100) < 80);
  const areaScores = Object.entries(gowod).map(([area, score]) => ({ area: area as Area, score }));
  const routineGoal = routineGoals[routineKey];
  const mobilityPlan = buildMobilityRoutine(areaScores, drills, routineGoal, mobilityMinutes, mobilityReroll, mobEquipment, mobilityHistory.flat());
  const shownSteps = generatedMobility.length ? generatedMobility : mobilityPlan.steps;

  useEffect(() => {
    const c = localStorage.getItem('forgefit-custom-days');
    const p = localStorage.getItem('forgefit-program') as ProgramKey | null;
    const r = localStorage.getItem('forgefit-routine-type') as RoutineKey | null;
    if (c) { try { setCustomDays(JSON.parse(c)); } catch {} }
    if (p && Object.keys(programLabels).includes(p)) setProgram(p);
    if (r && Object.keys(routineGoals).includes(r)) setRoutineKey(r);
  }, []);
  useEffect(() => { localStorage.setItem('forgefit-custom-days', JSON.stringify(customDays)); }, [customDays]);
  useEffect(() => { localStorage.setItem('forgefit-program', program); }, [program]);
  useEffect(() => { localStorage.setItem('forgefit-routine-type', routineKey); }, [routineKey]);
  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const u = session.session?.user;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      const [{ data: ex }, { data: mob }] = await Promise.all([
        supabase.from('exercises').select('*').order('name'),
        supabase.from('mobility_drills').select('*').order('target_area'),
      ]);
      setExercises((ex as Exercise[]) ?? []);
      setDrills((mob as Drill[]) ?? []);
      if (u) await Promise.all([loadSaved(), loadMuscleHistory(), loadMobilityHistory()]);
    }
    load();
  }, [supabase]);

  async function loadSaved() { const { data } = await supabase.from('workouts').select('id,title,goal,duration_minutes,recovery_score,status,created_at').order('created_at', { ascending: false }).limit(8); setSaved((data as SavedWorkout[]) ?? []); }
  async function loadMuscleHistory() { const { data } = await supabase.from('workout_muscle_sessions').select('trained_muscles,created_at').order('created_at', { ascending: false }).limit(8); setMuscleSessions(((data as MuscleSession[]) ?? []).map((r) => ({ trained_muscles: expandMuscles(r.trained_muscles ?? []), created_at: r.created_at }))); }
  async function loadMobilityHistory() { const { data } = await supabase.from('mobility_sessions').select('id,mobility_session_drills(mobility_drill_id,position)').order('created_at', { ascending: false }).limit(3); const rows = (data ?? []) as { mobility_session_drills?: { mobility_drill_id: string; position: number }[] }[]; setMobilityHistory(rows.map((s) => (s.mobility_session_drills ?? []).sort((a, b) => a.position - b.position).map((d) => d.mobility_drill_id)).filter((x) => x.length).slice(0, 3)); }
  async function signUp() { const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } }); if (error) return setAuthMessage(error.message); setUserId(data.session?.user.id ?? null); setUserEmail(data.session?.user.email ?? null); setAuthMessage(data.session ? 'Account created.' : 'Account created. Check your email.'); }
  async function signIn() { const { error, data } = await supabase.auth.signInWithPassword({ email, password }); if (error) return setAuthMessage(error.message); setUserId(data.user.id); setUserEmail(data.user.email ?? null); await Promise.all([loadSaved(), loadMuscleHistory(), loadMobilityHistory()]); }
  async function signOut() { await supabase.auth.signOut(); setUserId(null); setUserEmail(null); setGenerated([]); setGeneratedMobility([]); setSaved([]); setMuscleSessions([]); setMobilityHistory([]); }
  function pickDay(day: SplitDay, i: number) { setDayIndex(i); setSplit(day.split); setFocus(day.muscles); setRoutineKey(day.activity === 'legs' ? 'legs_pre' : day.activity === 'push' || day.activity === 'pull' ? 'upper_pre' : day.activity === 'mma' ? 'mma_pre' : 'daily_reset'); setWorkoutMessage(`${day.label} selected. Muscle focus and mobility routine type updated.`); }
  function saveCustomDay() { const next = [...customDays]; const i = Math.min(dayIndex, next.length - 1); next[i] = { label: next[i]?.label ?? `Custom ${i + 1}`, split, muscles: focus, activity: routineGoal.activity }; setCustomDays(next); setProgram('custom'); setWorkoutMessage(`Saved current focus to ${next[i].label}.`); }
  function toggle(list: string[], value: string, setter: (next: string[]) => void) { setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]); }

  function generateWorkout() {
    const count = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const goalText = goal.toLowerCase();
    const scored = exercises.map((ex) => {
      if (!matchesEquipment(ex.equipment_needed, workoutEquipment)) return { ex, score: -999, readiness: 100 };
      const readiness = getExerciseReadiness(ex, recoveryMap);
      let score = 10 + Math.random() * 12;
      score += ex.muscle_groups.filter((m) => focus.includes(m) || (focus.includes('arms') && ['biceps', 'triceps', 'forearms'].includes(m))).length * 7;
      if (goalText.includes('mma') && ['power', 'conditioning', 'core'].includes(ex.category)) score += 6;
      if ((split === 'legs' || split === 'lower') && ex.muscle_groups.some((m) => ['legs', 'glutes', 'hamstrings', 'quads'].includes(m))) score += 8;
      if (split === 'push' && ex.muscle_groups.some((m) => ['chest', 'shoulders', 'arms', 'triceps'].includes(m))) score += 8;
      if (split === 'pull' && ex.muscle_groups.some((m) => ['back', 'arms', 'biceps'].includes(m))) score += 8;
      if (goalText.includes('strength') && ex.category === 'strength') score += 6;
      if (goalText.includes('muscle') && ex.category === 'hypertrophy') score += 6;
      if (goalText.includes('conditioning') && ex.category === 'conditioning') score += 7;
      if (recentExerciseIds.includes(ex.id)) score -= 9;
      if (readiness < 90) score -= (90 - readiness) / 3;
      if (readiness < 55) score -= 12;
      return { ex, score, readiness };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    const ready = scored.filter((x) => x.readiness >= 65);
    const source = ready.length >= count ? ready : scored;
    const chosen: { ex: Exercise; readiness: number }[] = [];
    getWorkoutCategoryPlan(split, goal, count).forEach((cat) => {
      const pool = source.filter((x) => !chosen.some((p) => p.ex.id === x.ex.id) && (x.ex.category === cat || cat === 'any'));
      const fallback = source.filter((x) => !chosen.some((p) => p.ex.id === x.ex.id));
      const use = (pool.length ? pool : fallback).slice(0, 6);
      if (use.length) chosen.push(use[Math.floor(Math.random() * use.length)]);
    });
    while (chosen.length < count) { const pool = source.filter((x) => !chosen.some((p) => p.ex.id === x.ex.id)).slice(0, 10); if (!pool.length) break; chosen.push(pool[Math.floor(Math.random() * pool.length)]); }
    const workout = chosen.map(({ ex, readiness }, i) => ({ ...ex, readiness, sets: readiness < 60 || recovery < 55 ? 2 : goalText.includes('muscle') ? 4 : i === 0 ? 4 : 3, reps: ex.category === 'power' ? '3-5' : ex.category === 'conditioning' ? '30-45 sec' : goalText.includes('strength') ? '4-6' : '8-12', restSeconds: ex.category === 'conditioning' ? 45 : ex.category === 'power' || goalText.includes('strength') ? 120 : 75 }));
    const r = workoutRerolls + 1; setGenerated(workout); setWorkoutRerolls(r); setRecentExerciseIds((old) => [...workout.map((x) => x.id), ...old].slice(0, 14)); setWorkoutMessage(workout.length ? `Workout #${r}.${tiredFocus.length ? ` ${tiredFocus.join(', ')} still needs rest, so volume shifted when possible.` : ''}` : 'No exercises matched your equipment.');
  }
  async function saveWorkout() { if (!userId) return setWorkoutMessage('Sign in before saving.'); if (!generated.length) return setWorkoutMessage('Generate a workout first.'); const { data: row, error } = await supabase.from('workouts').insert({ user_id: userId, title: `${goal} ${days[dayIndex]?.label ?? split} session`, goal, duration_minutes: duration, recovery_score: recovery, status: 'planned' }).select('id').single(); if (error || !row) return setWorkoutMessage(error?.message ?? 'Workout could not be saved.'); await supabase.from('workout_exercises').insert(generated.map((ex, i) => ({ workout_id: row.id, exercise_id: ex.id, position: i + 1, target_sets: ex.sets, target_reps: ex.reps, rest_seconds: ex.restSeconds, notes: ex.instructions?.[0] ?? '' }))); const trained = getWorkoutMuscles(generated); await supabase.from('workout_muscle_sessions').insert({ user_id: userId, workout_id: row.id, trained_muscles: trained, source: 'saved_workout' }); setMuscleSessions((old) => [{ trained_muscles: trained, created_at: new Date().toISOString() }, ...old].slice(0, 8)); setWorkoutMessage('Workout saved. Muscles are now on recovery cooldown.'); await loadSaved(); }
  function generateMobilityRoutine() { const next = mobilityReroll + 1; const plan = buildMobilityRoutine(areaScores, drills, routineGoal, mobilityMinutes, next, mobEquipment, mobilityHistory.flat()); setMobilityReroll(next); setGeneratedMobility(plan.steps); setMobilityHistory((old) => [plan.steps.map((s) => s.drill.id), ...old].slice(0, 3)); setRoutineMessage(plan.steps.length ? `Generated ${routineGoal.label}. Prep → main restriction → support → reset.` : 'No matching mobility drills. Add equipment or change routine type.'); }
  async function completeMobilitySession() { if (!userId || !shownSteps.length) return setRoutineMessage('Generate a routine first.'); const { data: row, error } = await supabase.from('mobility_sessions').insert({ user_id: userId, title: routineGoal.label, target_areas: mobilityPlan.weakestAreas, duration_minutes: mobilityMinutes, completed_at: new Date().toISOString() }).select('id').single(); if (error || !row) return setRoutineMessage(error?.message ?? 'Could not save mobility.'); await supabase.from('mobility_session_drills').insert(shownSteps.map((s, i) => ({ mobility_session_id: row.id, mobility_drill_id: s.drill.id, position: i + 1, target_seconds: s.seconds, completed: true }))); setRoutineMessage('Mobility session saved.'); }

  if (!userId) return <AuthScreen email={email} password={password} authMessage={authMessage} setEmail={setEmail} setPassword={setPassword} signIn={signIn} signUp={signUp} />;

  return <main className="min-h-screen bg-[#080a0f] px-4 py-5 text-white"><section className="mx-auto flex max-w-md flex-col gap-5 pb-28"><header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-orange-200/80">Welcome, {userEmail}</p><h1 className="mt-1 text-3xl font-black">Today&apos;s plan</h1><p className="mt-2 text-sm text-zinc-300">Smarter workout recovery and one-choice mobility routines.</p></div><button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button></div><div className="mt-4 grid grid-cols-4 gap-2">{tabs.map((t) => <button key={t} onClick={() => setActiveTab(t)} className={`rounded-2xl px-3 py-3 text-xs font-black ${activeTab === t ? 'bg-white text-black' : 'bg-white/10 text-zinc-200'}`}>{t}</button>)}</div></header>
  {activeTab === 'train' && <section className="flex flex-col gap-5"><Panel eyebrow="Set it once" title="Split program"><div className="grid grid-cols-2 gap-2">{(Object.keys(programLabels) as ProgramKey[]).map((key) => <button key={key} onClick={() => { setProgram(key); setDayIndex(0); pickDay((key === 'custom' ? customDays : programs[key])[0], 0); }} className={`rounded-2xl px-3 py-3 text-xs font-black ${program === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{programLabels[key]}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{days.map((d, i) => <button key={`${d.label}-${i}`} onClick={() => pickDay(d, i)} className={`rounded-2xl px-3 py-3 text-xs font-black ${dayIndex === i ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{d.label}</button>)}</div><p className="mt-3 text-xs text-zinc-400">Focus: <span className="font-black text-orange-300">{focus.join(', ')}</span></p><button onClick={saveCustomDay} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">Save current focus to custom day</button></Panel><Panel eyebrow="Smart cooldown" title="Muscle recovery"><div className="grid grid-cols-2 gap-2">{muscleRecovery.map((m) => <div key={m.muscle} className={`rounded-2xl p-3 ${m.status === 'Rest' ? 'bg-red-500/15' : m.status === 'Light' ? 'bg-yellow-500/15' : 'bg-emerald-500/15'}`}><p className="text-xs font-black uppercase text-zinc-300">{m.muscle}</p><p className="mt-1 text-lg font-black">{m.lastTrainedAt ? `${m.readiness}%` : 'fresh'}</p><p className="text-xs text-zinc-400">{m.status}{m.hoursSince !== null ? ` · ${m.hoursSince}h ago` : ''}</p></div>)}</div></Panel><Panel eyebrow="Recovery-aware generator" title="Build workout"><select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3">{goals.map((g) => <option key={g}>{g}</option>)}</select><div className="mt-4 grid grid-cols-2 gap-3"><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Minutes</span><input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label><label className="rounded-2xl bg-black/30 p-3"><span className="text-xs text-zinc-400">Recovery</span><input type="number" value={recovery} onChange={(e) => setRecovery(Number(e.target.value))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" /></label></div><Chooser title="Workout equipment" options={equipment} selected={workoutEquipment} onToggle={(v) => toggle(workoutEquipment, v, setWorkoutEquipment)} /><Chooser title="Specific muscle focus" options={muscles} selected={focus} onToggle={(v) => toggle(focus, v, setFocus)} /><button onClick={generateWorkout} className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate new workout</button>{workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}</Panel>{!!generated.length && <Panel eyebrow={`Reroll #${workoutRerolls}`} title="Generated workout"><div className="flex flex-col gap-3">{generated.map((ex, i) => <article key={`${ex.id}-${workoutRerolls}`} className="rounded-2xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-orange-300">#{i + 1} · {ex.category} · muscle ready {Math.round(ex.readiness)}%</p><h3 className="text-lg font-black">{ex.name}</h3><p className="text-sm text-zinc-300">{ex.sets} sets · {ex.reps} · rest {ex.restSeconds}s</p><p className="mt-1 text-xs text-zinc-500">Needs: {ex.equipment_needed.join(', ') || 'bodyweight'}</p></article>)}</div><button onClick={saveWorkout} className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-black text-black">Save workout / log muscles</button></Panel>}</section>}
  {activeTab === 'mobility' && <section className="flex flex-col gap-5"><Panel eyebrow="GOWOD-style" title="Mobility score"><div className="flex items-center justify-center py-3"><div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-400 text-center"><div><p className="text-5xl font-black">{getGowodGlobal(gowod)}</p><p className="text-sm text-zinc-300">global</p></div></div></div><div className="grid grid-cols-3 gap-2">{areaScores.map((x) => <ScoreBar key={x.area} area={x.area} score={x.score} editable onChange={(n) => setGowod((old) => ({ ...old, [x.area]: n }))} />)}</div></Panel><Panel eyebrow="One main option" title="Routine type"><div className="grid grid-cols-1 gap-2">{(Object.keys(routineGoals) as RoutineKey[]).map((key) => <button key={key} onClick={() => { setRoutineKey(key); setGeneratedMobility([]); }} className={`rounded-2xl px-3 py-3 text-left text-xs font-black ${routineKey === key ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}><span className="block text-sm">{routineGoals[key].label}</span><span className="block text-[10px] font-semibold opacity-80">{routineGoals[key].description}</span></button>)}</div><div className="mt-3 grid grid-cols-4 gap-2">{[5, 8, 12, 15].map((n) => <button key={n} onClick={() => setMobilityMinutes(n)} className={`rounded-2xl px-2 py-3 text-xs font-black ${mobilityMinutes === n ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>{n}m</button>)}</div><Chooser title="Mobility equipment" options={mobilityEquipment} selected={mobEquipment} onToggle={(v) => toggle(mobEquipment, v, setMobEquipment)} /></Panel><Panel eyebrow="Smarter sequence" title={`Recommended ${mobilityMinutes} min`}><button onClick={generateMobilityRoutine} className="mb-3 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black">Generate mobility routine</button><div className="flex flex-col gap-3">{shownSteps.map((s, i) => <div key={`${s.drill.id}-${mobilityReroll}`} className="rounded-2xl bg-black/25 p-4"><p className="text-xs font-bold text-orange-300">{i + 1}. {s.phase} · {s.drill.target_area} · {s.seconds}s</p><h3 className="font-black">{s.drill.name}</h3><p className="text-xs text-zinc-500">Needs: {s.drill.equipment_needed.join(', ') || 'bodyweight'} · {s.why}</p><p className="mt-1 text-sm text-zinc-400">{s.drill.instructions?.[0] ?? 'Move slowly and breathe.'}</p></div>)}</div>{!!shownSteps.length && <button onClick={completeMobilitySession} className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">Complete and save mobility session</button>}<p className="mt-3 text-sm text-orange-200">{routineMessage}</p></Panel></section>}
  {activeTab === 'library' && <Panel eyebrow="Exercise library" title="Available movements"><div className="flex flex-col gap-2">{exercises.map((ex) => <div key={ex.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{ex.name}</p><p className="text-xs text-zinc-400">{ex.muscle_groups.join(' • ')} · {ex.equipment_needed.join(', ')}</p></div>)}</div></Panel>}{activeTab === 'history' && <Panel eyebrow="Saved history" title="Your saved workouts"><div className="flex flex-col gap-2">{saved.map((w) => <div key={w.id} className="rounded-2xl bg-black/25 px-4 py-3"><p className="font-semibold">{w.title}</p><p className="text-xs text-zinc-400">{w.goal} · {w.duration_minutes} min · recovery {w.recovery_score ?? 'n/a'}</p></div>)}{!saved.length && <p className="text-sm text-zinc-400">No saved workouts yet.</p>}</div></Panel>}</section></main>;
}

function AuthScreen({ email, password, authMessage, setEmail, setPassword, signIn, signUp }: { email: string; password: string; authMessage: string; setEmail: (v: string) => void; setPassword: (v: string) => void; signIn: () => void; signUp: () => void }) { return <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl"><p className="text-sm font-semibold text-orange-300">ForgeFit</p><h1 className="mt-2 text-4xl font-black">Sign in to train</h1><div className="mt-6 flex flex-col gap-3"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none" /><button onClick={signIn} className="rounded-2xl bg-orange-500 px-4 py-3 font-black text-black">Sign in</button><button onClick={signUp} className="rounded-2xl border border-white/10 px-4 py-3 font-black">Create account</button><p className="text-sm text-orange-200">{authMessage}</p></div></section></main>; }
function matchesEquipment(required: string[] = [], selected: string[]) { return !required.length || required.every((item) => item.toLowerCase() === 'bodyweight' || selected.includes(item.toLowerCase())); }
function expandMuscles(list: string[]) { const set = new Set<string>(); list.forEach((m) => { set.add(m); if (m === 'legs') ['quads', 'hamstrings', 'glutes'].forEach((x) => set.add(x)); if (m === 'arms') ['biceps', 'triceps', 'forearms'].forEach((x) => set.add(x)); if (['biceps', 'triceps', 'forearms'].includes(m)) set.add('arms'); }); return Array.from(set); }
function getWorkoutMuscles(workout: GenExercise[]) { return expandMuscles(Array.from(new Set(workout.flatMap((ex) => ex.muscle_groups)))); }
function getMuscleRecovery(sessions: MuscleSession[]) { const now = Date.now(); const cooldown: Record<string, number> = { core: 24, arms: 36, biceps: 36, triceps: 36, forearms: 24, chest: 48, back: 48, shoulders: 48, legs: 48, glutes: 48, hamstrings: 48, quads: 48 }; return muscles.map((muscle) => { const found = sessions.find((s) => expandMuscles(s.trained_muscles).includes(muscle)); if (!found) return { muscle, readiness: 100, hoursSince: null, status: 'Ready' as const, lastTrainedAt: null }; const hoursSince = Math.max(0, Math.floor((now - new Date(found.created_at).getTime()) / 36e5)); const readiness = Math.min(100, Math.round((hoursSince / (cooldown[muscle] ?? 48)) * 100)); return { muscle, readiness, hoursSince, status: readiness >= 90 ? 'Ready' as const : readiness >= 60 ? 'Light' as const : 'Rest' as const, lastTrainedAt: found.created_at }; }); }
function getExerciseReadiness(ex: Exercise, rec: Record<string, { readiness: number }>) { return Math.min(...expandMuscles(ex.muscle_groups).map((m) => rec[m]?.readiness ?? 100), 100); }
function getWorkoutCategoryPlan(split: SplitKey, goal: string, count: number) { const g = goal.toLowerCase(); let p = split === 'mma' ? ['power', 'strength', 'conditioning', 'core', 'hypertrophy', 'any'] : ['strength', 'hypertrophy', 'hypertrophy', 'core', 'conditioning', 'any']; if (g.includes('conditioning') || g.includes('lose')) p = ['conditioning', 'strength', 'core', 'hypertrophy', 'conditioning', 'any']; if (g.includes('strength')) p = ['strength', 'strength', 'hypertrophy', 'core', 'conditioning', 'any']; return p.slice(0, count); }
function seededNoise(text: string) { let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 9973; return (h % 100) / 100; }
function drillPhase(d: Drill) { const n = d.name.toLowerCase(); if (/breathing|reset|legs up|child|rib/.test(n)) return 'Reset'; if (/walk|march|flow|rock|switch|cars|pogo|rotation|sweep|pedal|inchworm/.test(n)) return 'Prep'; if (d.duration_seconds >= 90 || /stretch|fold|couch|pigeon|prayer|distraction/.test(n)) return 'Main restriction'; return 'Support'; }
function buildMobilityRoutine(areaScores: { area: Area; score: number }[], drills: Drill[], goal: RoutineGoal, minutes: number, shuffle: number, eq: string[], recent: string[]) { const boosted = [...goal.areas, ...activityBoost[goal.activity]]; const rankedAreas = areaScores.map((x) => ({ ...x, priority: (100 - x.score) + (boosted.includes(x.area) ? 24 : 0) + (goal.mode === 'recovery' && x.score < 70 ? 10 : 0) })).sort((a, b) => b.priority - a.priority); const weak = rankedAreas.slice(0, goal.mode === 'daily' ? 3 : 2).map((x) => x.area); const targets = Array.from(new Set([...weak, ...goal.areas])).map((a) => areaTarget[a]); const count = minutes <= 5 ? 4 : minutes <= 8 ? 5 : minutes <= 12 ? 6 : 8; const seconds = Math.max(35, Math.round((minutes * 60) / count)); const pool = drills.filter((d) => matchesEquipment(d.equipment_needed, eq)); const fresh = pool.filter((d) => !recent.includes(d.id)); const source = fresh.length >= count ? fresh : pool; const phases: RoutineStep['phase'][] = count <= 4 ? ['Prep', 'Main restriction', 'Support', 'Reset'] : ['Prep', 'Prep', 'Main restriction', 'Main restriction', 'Support', 'Reset', 'Support', 'Reset'].slice(0, count); const used = new Set<string>(); const steps = phases.map((phase, index) => { const scored = source.filter((d) => !used.has(d.id)).map((d) => { let score = seededNoise(`${d.id}-${shuffle}-${phase}-${index}`) * 28; const dPhase = drillPhase(d); if (dPhase === phase) score += 28; targets.forEach((t, i) => { if (d.target_area === t || d.name.toLowerCase().includes(t)) score += 40 - i * 7; }); if (goal.mode === 'pre' && dPhase === 'Prep') score += 12; if (goal.mode === 'post' && ['Main restriction', 'Reset'].includes(dPhase)) score += 10; if (goal.mode === 'recovery' && d.difficulty !== 'advanced') score += 10; if (recent.includes(d.id) && fresh.length < count) score -= 65; return { d, score }; }).sort((a, b) => b.score - a.score); const picked = scored[0]?.d ?? source.find((d) => !used.has(d.id)) ?? source[0]; if (picked) used.add(picked.id); return picked ? { phase, seconds, drill: picked, why: `${phase.toLowerCase()} for ${picked.target_area}` } : null; }).filter(Boolean) as RoutineStep[]; return { weakestAreas: weak, steps }; }
function getGowodGlobal(scores: Record<Area, number>) { const oldAvg = Math.round(Object.values(gowodBase).reduce((a, b) => a + b, 0) / 6); const nowAvg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6); return Math.max(0, Math.min(100, 89 + (nowAvg - oldAvg))); }
function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) { return <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5"><p className="text-sm font-semibold text-orange-300">{eyebrow}</p><h2 className="mt-1 text-xl font-black">{title}</h2><div className="mt-4">{children}</div></section>; }
function ScoreBar({ area, score, editable, onChange }: { area: Area; score: number; editable?: boolean; onChange?: (next: number) => void }) { return <div className="rounded-2xl bg-black/25 p-3 text-center"><p className="mx-auto rounded-lg bg-black/40 px-2 py-1 text-sm font-black">{score}</p><div className="mx-auto mt-2 flex h-20 w-2 items-end rounded-full bg-zinc-700"><span className={`block w-2 rounded-full ${score < 40 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ height: `${score}%` }} /></div><p className="mt-2 text-[10px] font-bold text-zinc-300">{area}</p>{editable && <input className="mt-2 w-full" type="range" min="0" max="100" value={score} onChange={(e) => onChange?.(Number(e.target.value))} />}</div>; }
function Chooser({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{title}</p><div className="mt-2 flex flex-wrap gap-2">{options.map((o) => <button key={o} onClick={() => onToggle(o)} className={`rounded-full px-3 py-2 text-xs font-bold ${selected.includes(o) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}>{o}</button>)}</div></div>; }
