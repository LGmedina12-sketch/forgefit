'use client';

import { useState } from 'react';

type Pose = 'squat' | 'toeTouch' | 'ankleWall' | 'overheadReach' | 'thoracicTwist' | 'hip90';

type Test = {
  id: string;
  title: string;
  area: string;
  pose: Pose;
  start: string;
  end: string;
  instruction: string;
};

const tests: Test[] = [
  { id: 'squat', title: 'Deep squat depth', area: 'Hips / ankles', pose: 'squat', start: 'Tall squat', end: 'Deep squat', instruction: 'Move the slider to match how deep you can squat while heels stay down.' },
  { id: 'toe', title: 'Toe touch', area: 'Hamstrings', pose: 'toeTouch', start: 'Hands high', end: 'Hands to toes', instruction: 'Move the slider based on how close your hands get to your toes.' },
  { id: 'ankle', title: 'Knee-to-wall', area: 'Ankles', pose: 'ankleWall', start: 'Knee far', end: 'Knee near wall', instruction: 'Move the slider based on how far your knee travels while heel stays planted.' },
  { id: 'overhead', title: 'Overhead reach', area: 'Shoulders', pose: 'overheadReach', start: 'Arms forward', end: 'Arms overhead', instruction: 'Move the slider based on how high your arms reach without arching your back.' },
  { id: 'twist', title: 'Open-book rotation', area: 'Upper back', pose: 'thoracicTwist', start: 'Small turn', end: 'Full open chest', instruction: 'Move the slider based on how far your chest can rotate.' },
  { id: 'hip90', title: '90/90 hip switch', area: 'Hips', pose: 'hip90', start: 'Blocked hips', end: 'Smooth switch', instruction: 'Move the slider based on how close you can get to a clean 90/90 position.' },
];

const initialScores = tests.reduce((acc, test) => ({ ...acc, [test.id]: 60 }), {} as Record<string, number>);

export default function MobilityV2Page() {
  const [scores, setScores] = useState(initialScores);
  const average = Math.round(tests.reduce((total, test) => total + scores[test.id], 0) / tests.length);
  const weakest = [...tests].sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 2);

  return (
    <main className="min-h-screen bg-forge-bg px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">Mobility V2 preview</p>
          <h1 className="mt-2 text-3xl font-black">Animated calibration</h1>
          <p className="mt-2 text-sm text-zinc-300">This is a safe test page. If this looks good, I can move it into the main Mobility tab next.</p>
          <a href="/" className="mt-4 block rounded-2xl bg-orange-500 px-4 py-3 text-center font-black text-black">Back to app</a>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-forge-card p-5">
          <p className="text-sm text-zinc-400">Live score</p>
          <p className="text-5xl font-black text-orange-300">{average}</p>
          <p className="mt-2 text-sm text-zinc-300">Focus next: {weakest.map((item) => item.area).join(' + ')}</p>
        </section>

        {tests.map((test) => (
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
      </section>
    </main>
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
