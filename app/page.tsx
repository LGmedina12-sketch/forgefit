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
  const [authMessage, setAuthMessage] = useState('Not signed in yet.');
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

  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      setAuthMessage(sessionData.session?.user.email ? `Signed in as ${sessionData.session.user.email}` : 'Not signed in yet.');

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
    setAuthMessage('Creating account...');
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } });
    setAuthMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled, then sign in.');
  }

  async function signIn() {
    setAuthMessage('Signing in...');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? error.message : `Signed in as ${data.user.email}`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthMessage('Signed out.');
  }

  function generateWorkout() {
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
    setGenerated(
      scored.slice(0, count).map(({ exercise }, index) => ({
        ...exercise,
        sets: recovery < 55 ? 2 : index === 0 ? 4 : 3,
        reps: exercise.category === 'power' ? '3-5' : exercise.category === 'conditioning' ? '30-45 sec' : '8-12',
        restSeconds: exercise.category === 'conditioning' ? 45 : exercise.category === 'power' ? 120 : 75,
      })),
    );
  }

  async function saveMobilityAssessment() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      setSaveMessage('Sign in before saving your mobility score.');
      return;
    }

    const overall = Math.round((scores.hips + scores.ankles + scores.shoulders + scores.thoracic + scores.hamstrings) / 5);
    const { error } = await supabase.from('mobility_assessments').insert({
      user_id: data.session.user.id,
      overall_score: overall,
      hips_score: scores.hips,
      ankles_score: scores.ankles,
      shoulders_score: scores.shoulders,
      thoracic_score: scores.thoracic,
      hamstrings_score: scores.hamstrings,
      notes: 'Phase 1 self calibration test',
    });

    setSaveMessage(error ? error.message : `Saved mobility score: ${overall}`);
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

  return (
    <main className="min-h-screen bg-forge-bg px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-200/80">ForgeFit Phase 1</p>
            <h1 className="text-3xl font-black tracking-tight">ForgeFit</h1>
          </div>
          <div className="rounded-2xl bg-orange-500 px-3 py-2 text-sm font-bold text-black">Live DB</div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<HeartPulse size={18} />} label="Recovery" value={String(recovery)} />
          <Stat icon={<Flame size={18} />} label="Exercise DB" value={`${exercises.length}`} />
          <Stat icon={<Dumbbell size={18} />} label="Generated" value={`${generated.length}`} />
          <Stat icon={<Trophy size={18} />} label="Mobility" value={String(mobilityScore)} />
        </div>

        <section className="rounded-3xl border border-white/10 bg-forge-card p-5 shadow-2xl">
          <p className="text-sm font-semibold text-orange-300">Account</p>
          <h2 className="mt-1 text-2xl font-black">Sign in or create account</h2>
          <p className="mt-2 text-sm text-zinc-300">{authMessage}</p>
          <div className="mt-4 flex flex-col gap-3">
            <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <button onClick={signIn} className="rounded-2xl bg-orange-500 px-3 py-3 font-black text-black">Sign in</button>
              <button onClick={signUp} className="rounded-2xl bg-white px-3 py-3 font-black text-black">Sign up</button>
              <button onClick={signOut} className="rounded-2xl bg-white/10 px-3 py-3 font-black">Out</button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
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

          <button onClick={generateWorkout} className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Generate workout</button>
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Workout database</p>
          <h2 className="mt-1 text-xl font-black">Exercise library from Supabase</h2>
          <div className="mt-4 flex flex-col gap-2">
            {exercises.slice(0, 18).map((exercise) => (
              <div key={exercise.id} className="rounded-2xl bg-black/25 px-4 py-3">
                <p className="font-semibold">{exercise.name}</p>
                <p className="text-xs text-zinc-400">{exercise.muscle_groups.join(' • ')} · {exercise.equipment_needed.join(', ')}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Mobility calibration</p>
          <h2 className="mt-1 text-xl font-black">Score: {mobilityScore}</h2>
          <MobilitySlider label="Hips" value={scores.hips} onChange={(value) => setScores({ ...scores, hips: value })} />
          <MobilitySlider label="Ankles" value={scores.ankles} onChange={(value) => setScores({ ...scores, ankles: value })} />
          <MobilitySlider label="Shoulders" value={scores.shoulders} onChange={(value) => setScores({ ...scores, shoulders: value })} />
          <MobilitySlider label="Thoracic spine" value={scores.thoracic} onChange={(value) => setScores({ ...scores, thoracic: value })} />
          <MobilitySlider label="Hamstrings" value={scores.hamstrings} onChange={(value) => setScores({ ...scores, hamstrings: value })} />
          <button onClick={saveMobilityAssessment} className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Save mobility test</button>
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
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
