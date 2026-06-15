'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Area = 'Hips' | 'Ankles' | 'Shoulders' | 'Upper back' | 'Hamstrings';
type Source = 'forgefit' | 'gowod';

type Drill = {
  id: string;
  name: string;
  target_area: string;
  duration_seconds: number;
  instructions: string[];
};

type SavedImport = {
  id: string;
  overall_score: number | null;
  hips_score: number | null;
  ankles_score: number | null;
  shoulders_score: number | null;
  thoracic_score: number | null;
  hamstrings_score: number | null;
  raw_notes: string | null;
  created_at: string;
};

type Scores = Record<Area, number>;

const areaTargets: Record<Area, string> = {
  Hips: 'hips',
  Ankles: 'ankles',
  Shoulders: 'shoulders',
  'Upper back': 'thoracic spine',
  Hamstrings: 'hamstrings',
};

const defaultScores: Scores = {
  Hips: 60,
  Ankles: 60,
  Shoulders: 60,
  'Upper back': 60,
  Hamstrings: 60,
};

export default function MobilityImportPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('gowod');
  const [gowodScores, setGowodScores] = useState<Scores>(defaultScores);
  const [forgeFitScores, setForgeFitScores] = useState<Scores>(defaultScores);
  const [overall, setOverall] = useState(60);
  const [notes, setNotes] = useState('');
  const [drills, setDrills] = useState<Drill[]>([]);
  const [message, setMessage] = useState('Loading...');
  const [saved, setSaved] = useState<SavedImport | null>(null);

  const activeScores = source === 'gowod' ? gowodScores : forgeFitScores;
  const activeOverall = source === 'gowod' ? overall : averageScore(forgeFitScores);
  const sortedAreas = (Object.entries(activeScores) as [Area, number][]).sort((a, b) => a[1] - b[1]);
  const weakestAreas = sortedAreas.slice(0, 2).map(([area]) => area);
  const weakestTargets = weakestAreas.map((area) => areaTargets[area]);
  const recommended = drills
    .filter((drill) => weakestTargets.some((target) => drill.target_area === target || drill.name.toLowerCase().includes(target)))
    .slice(0, 8);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;
      setUserId(currentUser?.id ?? null);
      if (!currentUser) {
        setMessage('Sign in from the main app first, then come back here.');
        return;
      }

      const [{ data: drillRows }, { data: importRow }] = await Promise.all([
        supabase.from('mobility_drills').select('id, name, target_area, duration_seconds, instructions').order('target_area'),
        supabase
          .from('mobility_score_imports')
          .select('id, overall_score, hips_score, ankles_score, shoulders_score, thoracic_score, hamstrings_score, raw_notes, created_at')
          .eq('source', 'gowod')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setDrills((drillRows as Drill[]) ?? []);
      const row = importRow as SavedImport | null;
      if (row) {
        setSaved(row);
        setOverall(row.overall_score ?? 60);
        setGowodScores({
          Hips: row.hips_score ?? 60,
          Ankles: row.ankles_score ?? 60,
          Shoulders: row.shoulders_score ?? 60,
          'Upper back': row.thoracic_score ?? 60,
          Hamstrings: row.hamstrings_score ?? 60,
        });
        setNotes(row.raw_notes ?? '');
        setMessage('Loaded your saved GOWOD import.');
      } else {
        setMessage('No GOWOD result saved yet. Enter it below.');
      }
    }

    load();
  }, [supabase]);

  async function saveGowod() {
    if (!userId) return setMessage('Sign in first.');
    setMessage('Saving GOWOD result...');

    await supabase
      .from('mobility_score_imports')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('source', 'gowod');

    const { data, error } = await supabase
      .from('mobility_score_imports')
      .insert({
        user_id: userId,
        source: 'gowod',
        overall_score: clamp(overall),
        hips_score: clamp(gowodScores.Hips),
        ankles_score: clamp(gowodScores.Ankles),
        shoulders_score: clamp(gowodScores.Shoulders),
        thoracic_score: clamp(gowodScores['Upper back']),
        hamstrings_score: clamp(gowodScores.Hamstrings),
        raw_notes: notes,
        is_active: true,
      })
      .select('id, overall_score, hips_score, ankles_score, shoulders_score, thoracic_score, hamstrings_score, raw_notes, created_at')
      .single();

    if (error) return setMessage(error.message);
    setSaved(data as SavedImport);
    setSource('gowod');
    setMessage('Saved. Your recommended routine is now using your imported GOWOD scores.');
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-300">ForgeFit mobility</p>
          <h1 className="mt-2 text-3xl font-black">GOWOD score source</h1>
          <p className="mt-2 text-sm text-zinc-300">Keep ForgeFit&apos;s interface, but let your imported GOWOD result drive the stretch routine when selected.</p>
          <a href="/" className="mt-4 block rounded-2xl bg-white px-4 py-3 text-center font-black text-black">Back to app</a>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Active source</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setSource('gowod')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'gowod' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>GOWOD import</button>
            <button onClick={() => setSource('forgefit')} className={`rounded-2xl px-3 py-3 text-sm font-black ${source === 'forgefit' ? 'bg-orange-500 text-black' : 'bg-white/10 text-white'}`}>ForgeFit sliders</button>
          </div>
          <p className="mt-3 text-sm text-zinc-300">Routine below uses: <span className="font-black text-orange-300">{source === 'gowod' ? 'GOWOD scores' : 'ForgeFit manual scores'}</span></p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Current score</p>
          <p className="mt-1 text-5xl font-black text-orange-300">{activeOverall}</p>
          <p className="mt-2 text-sm text-zinc-300">Weakest areas: {sortedAreas.slice(0, 2).map(([area, score]) => `${area} ${score}`).join(' + ')}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(Object.entries(activeScores) as [Area, number][]).map(([area, score]) => (
              <div key={area} className="rounded-2xl bg-black/25 p-3">
                <p className="text-xs text-zinc-400">{area}</p>
                <p className="text-2xl font-black">{score}</p>
              </div>
            ))}
          </div>
        </section>

        <ScoreEditor
          title="GOWOD import"
          scores={gowodScores}
          overall={overall}
          setOverall={setOverall}
          setScores={setGowodScores}
          showOverall
        />

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Screenshot notes</p>
          <p className="mt-1 text-sm text-zinc-300">Upload the GOWOD screenshot in this chat and I can read the numbers. Paste any notes here if you want them saved with your account.</p>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none" placeholder="Paste result notes here" />
          <button onClick={saveGowod} className="mt-3 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Save GOWOD result to my account</button>
          <p className="mt-3 text-sm text-orange-200">{message}</p>
          {saved && <p className="mt-2 text-xs text-zinc-500">Last saved: {new Date(saved.created_at).toLocaleDateString()}</p>}
        </section>

        <ScoreEditor title="ForgeFit manual backup" scores={forgeFitScores} setScores={setForgeFitScores} />

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Recommended routine</p>
          <h2 className="mt-1 text-xl font-black">Based on selected source</h2>
          <div className="mt-4 flex flex-col gap-3">
            {(recommended.length ? recommended : drills.slice(0, 8)).map((drill) => (
              <article key={drill.id} className="rounded-2xl bg-black/25 p-4">
                <p className="text-xs font-bold text-orange-300">{drill.target_area} · {Math.max(1, Math.round(drill.duration_seconds / 60))} min</p>
                <h3 className="font-black">{drill.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{drill.instructions?.[0] ?? 'Move slowly, breathe, and avoid sharp pain.'}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function ScoreEditor({ title, scores, setScores, overall, setOverall, showOverall = false }: { title: string; scores: Scores; setScores: (next: Scores) => void; overall?: number; setOverall?: (next: number) => void; showOverall?: boolean }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-orange-300">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {showOverall && setOverall && <ScoreInput label="Overall" value={overall ?? averageScore(scores)} onChange={setOverall} />}
        {(Object.entries(scores) as [Area, number][]).map(([area, score]) => (
          <ScoreInput key={area} label={area} value={score} onChange={(value) => setScores({ ...scores, [area]: value })} />
        ))}
      </div>
    </section>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rounded-2xl bg-black/30 p-3">
      <span className="text-xs text-zinc-400">{label}</span>
      <input type="number" min="0" max="100" value={value} onChange={(event) => onChange(clamp(Number(event.target.value)))} className="mt-1 w-full bg-transparent text-2xl font-black outline-none" />
    </label>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function averageScore(scores: Scores) {
  const values = Object.values(scores);
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
