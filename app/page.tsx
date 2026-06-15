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

type GeneratedExercise = DbExercise & {
  sets: number;
  reps: string;
  restSeconds: number;
};

const equipmentOptions = ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine', 'resistance band', 'bench', 'bar', 'box'];
const goalOptions = ['MMA performance', 'Build muscle', 'Gain strength', 'Lose fat', 'Athletic performance', 'Improve conditioning'];
const muscleOptions = ['back', 'legs', 'core', 'shoulders', 'chest', 'glutes', 'hamstrings', 'quads'];

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('Sign in to start training.');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [mobility, setMobility] = useState<DbMobility[]>([]);
  const [goal, setGoal] = useState('MMA performance');
  const [duration, setDuration] = useState(45);
  const [recovery, setRecovery] = useState(75);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine']);
  const [priorities, setPriorities] = useState<string[]>(['back', 'legs', 'core', 'shoulders']);
  const [generated, setGenerated] = useState<GeneratedExercise[]>([]);
  const [scores, setScores] = useState({ hips: 60, ankles: 60, shoulders: 60, thoracic: 60, hamstrings: 60 });
  const [saveMessage, setSaveMessage] = useState('');
  const [workoutMessage, setWorkoutMessage] = useState('');

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
    }

    loadData();
  }, [supabase]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function signUp() {
    setAuthMessage('Creating your account...');
    const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setUserId(data.session?.user.id ?? null);
    setUserEmail(data.session?.user.email ?? null);
    setAuthMessage(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email, then sign in.');
  }

  async function signIn() {
    setAuthMessage('Signing in...');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? null);
    setAuthMessage(`Welcome back, ${data.user.email}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setGenerated([]);
    setAuthMessage('Signed out.');
  }

  function buildWorkout() {
    const scored = exercises
      .map((exercise) => {
        const hasEquipment = exercise.equipment_needed.some((item) => selectedEquipment.includes(item));
        if (!hasEquipment) return { exercise, score: -999 };
        let score = 10;
        score += exercise.muscle_groups.filter((muscle) => priorities.includes(muscle)).length * 4;
        if (goal.toLowerCase().includes('mma') && ['power', 'conditioning', 'core'].includes(exercise.category)) score += 3;
        if (goal.toLowerCase().includes('strength') && exercise.category === 'strength') score += 3;
        if (goal.toLowerCase().includes('muscle') && exercise.category === 'hypertrophy') score += 3;
        if (recovery < 55 && exercise.difficulty === 'advanced') score -= 4;
        return { exercise, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const count = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;
    const nextWorkout = scored.slice(0, count).map(({ exercise }, index) => ({
      ...exercise,
      sets: recovery < 55 ? 2 : index === 0 ? 4 : 3,
      reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : '8-12',
      restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' ? 120 : 75,
    }));

    setGenerated(nextWorkout);
    setWorkoutMessage(nextWorkout.length ? 'Workout generated. Save it when you like it.' : 'No exercises matched your equipment. Add more equipment or change your goal.');
  }

  async function saveWorkout() {
    if (!userId) {
      setWorkoutMessage('Sign in before saving workouts.');
      return;
    }
    if (!generated.length) {
      setWorkoutMessage('Generate a workout first.');
      return;
    }

    setWorkoutMessage('Saving workout...');
    const { data: workoutRow, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        title: `${goal} session`,
        goal,
        duration_minutes: duration,
        recovery_score: recovery,
        status: 'planned',
      })
      .select('id')
      .single();

    if (workoutError || !workoutRow) {
      setWorkoutMessage(workoutError?.message ?? 'Workout could not be saved.');
      return;
    }

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
    setWorkoutMessage(exerciseError ? exerciseError.message : 'Workout saved to your account.');
  }

  async function saveMobilityAssessment() {
    if (!userId) {
      setSaveMessage('Sign in before saving your mobility score.');
      return;
    }

    const overall = Math.round((scores.hips + scores.ankles + scores.shoulders + scores.thoracic + scores.hamstrings) / 5);
    const { error } = await supabase.from('mobility_assessments').insert({
      user_id: userId,
      overall_score: overall,
      hips_score: scores.hips,
      ankles_score: scores.ankles,
      shoulders_score: scores.shoulders,
      thoracic_score: scores.thoracic,
      hamstrings_score: scores.hamstrings,
      notes: 'ForgeFit mobility calibration',
    });

    setSaveMessage(error ? error.message : `Mobility score saved: ${overall}`);
  }

  const mobilityScore = Math.round((scores.hips + scores.ankles + scores.shoulders + scores.thoracic + scores.hamstrings) / 5);
  const suggestedMobility = mobility.filter((drill) => {
    if (scores.hips < 70 && drill.target_area === 'hips') return true;
    if (scores.ankles < 70 && drill.target_area === 'ankles') return true;
    if (scores.shoulders < 70 && drill.target_area === 'shoulders') return true;
    if (scores.thoracic < 70 && drill.target_area === 'thoracic spine') return true;
    if (scores.hamstrings < 70 && drill.target_area === 'hamstrings') return true;
    return false;
  });

  if (!userId) {
    return (
      <main className="min-h-screen bg-forge-bg px-4 py-8 text-white">
        <section className="mx-auto flex min-h-[90vh] max-w-md flex-col justify-center gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">ForgeFit</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Train smarter every day.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Sign in to generate workouts, save training sessions, track mobility, and build your personal exercise library.</p>
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
        <header className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm text-orange-200/80">Welcome, {userEmail}</p>
            <h1 className="text-3xl font-black tracking-tight">Today&apos;s plan</h1>
          </div>
          <button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold">Sign out</button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<HeartPulse size={18} />} label="Recovery" value={String(recovery)} />
          <Stat icon={<Flame size={18} />} label="Library" value={`${exercises.length}`} />
          <Stat icon={<Dumbbell size={18} />} label="Workout" value={`${generated.length} moves`} />
          <Stat icon={<Trophy size={18} />} label="Mobility" value={String(mobilityScore)} />
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-forge-card p-5 shadow-2xl">
          <p className="text-sm font-semibold text-orange-300">Workout generator</p>
          <h2 className="mt-1 text-2xl font-black">Build today&apos;s session</h2>
          <label className="mt-4 block text-sm font-bold">Goal</label>
          <select className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3" value={goal} onChange={(event) => setGoal(event.target.value)}>
            {goalOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold">Duration: {duration} min</label>
          <input className="w-full" type="range" min="20" max="75" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          <label className="mt-4 block text-sm font-bold">Recovery: {recovery}</label>
          <input className="w-full" type="range" min="25" max="100" step="5" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} />

          <p className="mt-4 text-sm font-bold">Equipment</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {equipmentOptions.map((item) => (
              <button key={item} onClick={() => toggle(selectedEquipment, item, setSelectedEquipment)} className={`rounded-full px-3 py-2 text-xs font-bold ${selectedEquipment.includes(item) ? 'bg-orange-500 text-black' : 'bg-white/10'}`}>{item}</button>
            ))}
          </div>

          <p className="mt-4 text-sm font-bold">Muscle priorities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {muscleOptions.map((item) => (
              <button key={item} onClick={() => toggle(priorities, item, setPriorities)} className={`rounded-full px-3 py-2 text-xs font-bold ${priorities.includes(item) ? 'bg-orange-500 text-black' : 'bg-white/10'}`}>{item}</button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={buildWorkout} className="rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate</button>
            <button onClick={saveWorkout} className="rounded-2xl bg-white px-4 py-4 font-black text-black">Save</button>
          </div>
          {workoutMessage && <p className="mt-3 text-sm text-orange-200">{workoutMessage}</p>}

          <div className="mt-4 flex flex-col gap-3">
            {generated.map((exercise) => (
              <article key={exercise.id} className="rounded-2xl bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{exercise.name}</h3>
                    <p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')}</p>
                  </div>
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-200">{exercise.sets} x {exercise.reps}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Rest {exercise.restSeconds}s • {exercise.category}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Exercise library</p>
          <h2 className="mt-1 text-xl font-black">Available movements</h2>
          <div className="mt-4 flex flex-col gap-2">
            {exercises.slice(0, 18).map((exercise) => (
              <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3">
                <p className="font-semibold">{exercise.name}</p>
                <p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Mobility calibration</p>
          <h2 className="mt-1 text-xl font-black">Score: {mobilityScore}</h2>
          <p className="mt-2 text-sm text-zinc-300">Move each slider based on how restricted that area feels today. Low scores trigger more drills for that area.</p>
          <MobilitySlider label="Hips" value={scores.hips} onChange={(value) => setScores({ ...scores, hips: value })} />
          <MobilitySlider label="Ankles" value={scores.ankles} onChange={(value) => setScores({ ...scores, ankles: value })} />
          <MobilitySlider label="Shoulders" value={scores.shoulders} onChange={(value) => setScores({ ...scores, shoulders: value })} />
          <MobilitySlider label="Thoracic spine" value={scores.thoracic} onChange={(value) => setScores({ ...scores, thoracic: value })} />
          <MobilitySlider label="Hamstrings" value={scores.hamstrings} onChange={(value) => setScores({ ...scores, hamstrings: value })} />
          <button onClick={saveMobilityAssessment} className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Save mobility score</button>
          {saveMessage && <p className="mt-3 text-sm text-orange-200">{saveMessage}</p>}
          <h3 className="mt-5 font-black">Recommended mobility</h3>
          <div className="mt-3 flex flex-col gap-2">
            {(suggestedMobility.length ? suggestedMobility : mobility.slice(0, 4)).slice(0, 6).map((drill) => (
              <div key={drill.id} className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
                <div>
                  <p className="font-semibold">{drill.name}</p>
                  <p className="text-xs text-zinc-400">{drill.target_area}</p>
                </div>
                <p className="text-sm text-orange-200">{drill.duration_seconds}s</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-orange-300">{icon}</div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function MobilitySlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-sm font-bold"><span>{label}</span><span>{value}</span></span>
      <input className="mt-2 w-full" type="range" min="0" max="100" step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
