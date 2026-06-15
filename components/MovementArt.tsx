type Pose = 'squat' | 'hip90' | 'ankle' | 'overhead' | 'wall' | 'twist' | 'hamstring' | 'lunge' | 'pushup' | 'row' | 'hinge' | 'jump' | 'core';

export function getMobilityPose(name: string, target: string): Pose {
  const text = `${name} ${target}`.toLowerCase();
  if (text.includes('90') || text.includes('pigeon') || text.includes('figure four')) return 'hip90';
  if (text.includes('ankle') || text.includes('calf') || text.includes('wall')) return 'ankle';
  if (text.includes('shoulder') || text.includes('overhead') || text.includes('pec')) return text.includes('wall') ? 'wall' : 'overhead';
  if (text.includes('thoracic') || text.includes('open book') || text.includes('thread') || text.includes('windmill') || text.includes('scorpion')) return 'twist';
  if (text.includes('hamstring') || text.includes('fold') || text.includes('down dog') || text.includes('straddle')) return 'hamstring';
  if (text.includes('squat')) return 'squat';
  return 'lunge';
}

export function getExercisePose(name: string, category: string, muscles: string[] = []): Pose {
  const text = `${name} ${category} ${muscles.join(' ')}`.toLowerCase();
  if (text.includes('push-up') || text.includes('burpee') || text.includes('climber')) return 'pushup';
  if (text.includes('row') || text.includes('pulldown') || text.includes('pull')) return 'row';
  if (text.includes('romanian') || text.includes('hinge') || text.includes('deadlift')) return 'hinge';
  if (text.includes('jump') || text.includes('power')) return 'jump';
  if (text.includes('plank') || text.includes('hollow') || text.includes('core')) return 'core';
  if (text.includes('lunge') || text.includes('split')) return 'lunge';
  if (text.includes('squat') || text.includes('leg press')) return 'squat';
  if (text.includes('press') || text.includes('shoulder')) return 'overhead';
  return 'squat';
}

export default function MovementArt({ pose, value = 80, label = 'movement', small = false }: { pose: Pose; value?: number; label?: string; small?: boolean }) {
  const p = Math.max(0, Math.min(100, value));
  const h = small ? 84 : 132;
  const skin = '#fed7aa';
  const head = '#fb923c';
  const limb = '#fdba74';
  const floor = 'rgba(255,255,255,.22)';

  const figure = drawPose(pose, p, skin, head, limb);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
      <svg viewBox="0 0 240 140" className="w-full" style={{ height: h }} role="img" aria-label={label}>
        <rect x="8" y="8" width="224" height="124" rx="20" fill="rgba(255,255,255,.04)" />
        <line x1="25" y1="116" x2="215" y2="116" stroke={floor} strokeWidth="4" />
        {figure}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <span className="truncate text-zinc-400">{label}</span>
        <span className="font-black text-orange-300">{Math.round(p)}%</span>
      </div>
    </div>
  );
}

function drawPose(pose: Pose, p: number, skin: string, head: string, limb: string) {
  if (pose === 'squat') {
    const hip = 62 + p * 0.34;
    const headY = 30 + p * 0.12;
    return <><circle cx="120" cy={headY} r="12" fill={head}/><line x1="120" y1={headY+14} x2="120" y2={hip} stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="120" y1={hip} x2={78-p*.12} y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="120" y1={hip} x2={162+p*.12} y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="118" y1={headY+28} x2="72" y2={66+p*.24} stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="122" y1={headY+28} x2="168" y2={66+p*.24} stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'ankle') {
    const knee = 88 + p * .88;
    return <><line x1="196" y1="20" x2="196" y2="118" stroke="rgba(255,255,255,.2)" strokeWidth="5"/><circle cx="82" cy="34" r="11" fill={head}/><line x1="82" y1="47" x2="105" y2="74" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="105" y1="74" x2={knee} y2="98" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1={knee} y1="98" x2="158" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="105" y1="74" x2="54" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="96" y1="56" x2="182" y2="55" stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'overhead' || pose === 'wall') {
    const hand = 92 - p * .72;
    return <><line x1="200" y1="18" x2="200" y2="118" stroke={pose === 'wall' ? 'rgba(255,255,255,.22)' : 'transparent'} strokeWidth="5"/><circle cx="120" cy="38" r="12" fill={head}/><line x1="120" y1="52" x2="120" y2="86" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="120" y1="64" x2="82" y2={hand} stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="120" y1="64" x2="158" y2={hand} stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="120" y1="86" x2="92" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="120" y1="86" x2="148" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>;
  }
  if (pose === 'twist') {
    const open = 76 + p * 1.05;
    return <><circle cx="76" cy="48" r="11" fill={head}/><line x1="86" y1="58" x2="128" y2="82" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="128" y1="82" x2="74" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="128" y1="82" x2="168" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="105" y1="68" x2="52" y2="84" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="106" y1="68" x2={open} y2={58-p*.2} stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'hamstring') {
    const reach = 112 + p * .78;
    return <><circle cx={96+p*.25} cy={42+p*.2} r="11" fill={head}/><line x1="88" y1="66" x2={112+p*.38} y2={70+p*.25} stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="88" y1="66" x2="54" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="88" y1="66" x2="188" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1={112+p*.38} y1={70+p*.25} x2={reach} y2={72+p*.38} stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'hip90') {
    const open = p * .52;
    return <><circle cx="118" cy="42" r="11" fill={head}/><line x1="118" y1="55" x2="118" y2="82" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="118" y1="84" x2={76-open*.4} y2={96-open*.12} stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1={76-open*.4} y1={96-open*.12} x2="48" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="118" y1="84" x2={160+open*.55} y2={96-open*.22} stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1={160+open*.55} y1={96-open*.22} x2="206" y2="112" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>;
  }
  if (pose === 'pushup' || pose === 'core') {
    const bodyY = pose === 'core' ? 94 : 82;
    return <><circle cx="70" cy={bodyY-18} r="10" fill={head}/><line x1="82" y1={bodyY-12} x2="150" y2={bodyY} stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="102" y1={bodyY-6} x2="92" y2="116" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="118" y1={bodyY-2} x2="130" y2="116" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="150" y1={bodyY} x2="204" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>;
  }
  if (pose === 'row') {
    return <><circle cx="94" cy="44" r="11" fill={head}/><line x1="100" y1="56" x2="132" y2="86" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="132" y1="86" x2="88" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="132" y1="86" x2="170" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="116" y1="70" x2="58" y2="76" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="118" y1="70" x2="178" y2="66" stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'hinge') {
    return <><circle cx="90" cy="44" r="11" fill={head}/><line x1="100" y1="56" x2="146" y2="80" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="146" y1="80" x2="96" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="146" y1="80" x2="176" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="120" y1="66" x2="80" y2="90" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="124" y1="68" x2="168" y2="94" stroke={limb} strokeWidth="7" strokeLinecap="round"/></>;
  }
  if (pose === 'jump') {
    return <><path d="M160 84 L178 54 L196 84" fill="none" stroke={head} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="104" cy="34" r="11" fill={head}/><line x1="104" y1="48" x2="104" y2="74" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="104" y1="58" x2="70" y2="44" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="104" y1="58" x2="138" y2="44" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="104" y1="74" x2="78" y2="106" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="104" y1="74" x2="136" y2="106" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>;
  }
  return <><circle cx="112" cy="36" r="11" fill={head}/><line x1="112" y1="50" x2="112" y2="78" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="112" y1="60" x2="72" y2="70" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="112" y1="60" x2="152" y2="70" stroke={limb} strokeWidth="7" strokeLinecap="round"/><line x1="112" y1="78" x2="76" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/><line x1="112" y1="78" x2="166" y2="116" stroke={skin} strokeWidth="8" strokeLinecap="round"/></>;
}
