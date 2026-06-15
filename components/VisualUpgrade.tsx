'use client';

import { useEffect, useState } from 'react';

type Pose = 'squat' | 'hip90' | 'ankle' | 'overhead' | 'wall' | 'twist' | 'hamstring' | 'lunge' | 'pushup' | 'row' | 'hinge' | 'jump' | 'core';

function pickPose(label: string): Pose {
  const text = label.toLowerCase();
  if (text.includes('90') || text.includes('pigeon') || text.includes('figure four') || text.includes('hip')) return 'hip90';
  if (text.includes('ankle') || text.includes('calf') || text.includes('knee') || text.includes('heel')) return 'ankle';
  if (text.includes('wall')) return 'wall';
  if (text.includes('shoulder') || text.includes('overhead') || text.includes('pec') || text.includes('arm')) return 'overhead';
  if (text.includes('thoracic') || text.includes('open') || text.includes('thread') || text.includes('twist') || text.includes('rotate') || text.includes('chest')) return 'twist';
  if (text.includes('hamstring') || text.includes('toe') || text.includes('fold') || text.includes('leg raise') || text.includes('hands')) return 'hamstring';
  if (text.includes('push') || text.includes('burpee') || text.includes('climber') || text.includes('conditioning')) return 'pushup';
  if (text.includes('row') || text.includes('pull')) return 'row';
  if (text.includes('hinge') || text.includes('deadlift') || text.includes('romanian')) return 'hinge';
  if (text.includes('jump') || text.includes('power')) return 'jump';
  if (text.includes('core') || text.includes('plank') || text.includes('hollow')) return 'core';
  if (text.includes('squat')) return 'squat';
  return 'lunge';
}

function scoreFromCard(svg: SVGSVGElement) {
  const text = svg.parentElement?.textContent ?? '';
  const match = text.match(/(\d{1,3})%|\b(\d{1,3})\b/);
  const value = Number(match?.[1] ?? match?.[2] ?? 80);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 80;
}

function art(pose: Pose, label: string, value: number) {
  const p = Math.max(0, Math.min(100, value));
  const skin = '#fed7aa';
  const head = '#fb923c';
  const limb = '#fdba74';
  const safe = label.replace(/[<>&]/g, '').slice(0, 22);
  let body = '';

  if (pose === 'squat') {
    const hip = 58 + p * 0.38;
    const headY = 30 + p * 0.12;
    body = `<circle cx="120" cy="${headY}" r="12" fill="${head}"/><line x1="120" y1="${headY + 14}" x2="120" y2="${hip}" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="120" y1="${hip}" x2="${76 - p * .14}" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="120" y1="${hip}" x2="${164 + p * .14}" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="118" y1="${headY + 28}" x2="72" y2="${64 + p * .24}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="122" y1="${headY + 28}" x2="168" y2="${64 + p * .24}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (pose === 'ankle') {
    const knee = 82 + p * 1.05;
    body = `<line x1="198" y1="20" x2="198" y2="122" stroke="rgba(255,255,255,.25)" stroke-width="7"/><circle cx="78" cy="36" r="12" fill="${head}"/><line x1="78" y1="50" x2="106" y2="76" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="106" y1="76" x2="${knee}" y2="100" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="${knee}" y1="100" x2="158" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="106" y1="76" x2="52" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="96" y1="58" x2="184" y2="58" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (pose === 'overhead' || pose === 'wall') {
    const hand = 96 - p * .78;
    const wall = pose === 'wall' ? '<line x1="202" y1="16" x2="202" y2="122" stroke="rgba(255,255,255,.28)" stroke-width="7"/>' : '';
    body = `${wall}<circle cx="120" cy="42" r="12" fill="${head}"/><line x1="120" y1="56" x2="120" y2="90" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="120" y1="66" x2="80" y2="${hand}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="66" x2="160" y2="${hand}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="90" x2="92" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="120" y1="90" x2="150" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (pose === 'twist') {
    const open = 78 + p * 1.12;
    body = `<circle cx="74" cy="52" r="12" fill="${head}"/><line x1="86" y1="62" x2="128" y2="84" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="128" y1="84" x2="72" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="128" y1="84" x2="170" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="104" y1="72" x2="50" y2="88" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="106" y1="72" x2="${open}" y2="${62 - p * .22}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><path d="M88 70 C 122 ${58 - p * .2}, 165 ${50 - p * .15}, 205 38" fill="none" stroke="rgba(251,146,60,.55)" stroke-width="4" stroke-dasharray="6 6"/>`;
  } else if (pose === 'hamstring') {
    const reach = 112 + p * .82;
    body = `<circle cx="${96 + p * .28}" cy="${44 + p * .2}" r="12" fill="${head}"/><line x1="88" y1="68" x2="${112 + p * .42}" y2="${72 + p * .25}" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="88" y1="68" x2="54" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="88" y1="68" x2="190" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="${112 + p * .42}" y1="${72 + p * .25}" x2="${reach}" y2="${74 + p * .40}" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (pose === 'hip90') {
    const open = p * .58;
    body = `<circle cx="118" cy="44" r="12" fill="${head}"/><line x1="118" y1="58" x2="118" y2="86" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="118" y1="88" x2="${76 - open * .45}" y2="${98 - open * .12}" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="${76 - open * .45}" y1="${98 - open * .12}" x2="48" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="118" y1="88" x2="${160 + open * .6}" y2="${98 - open * .24}" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="${160 + open * .6}" y1="${98 - open * .24}" x2="208" y2="114" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (pose === 'pushup' || pose === 'core') {
    const y = pose === 'core' ? 96 : 84;
    body = `<circle cx="68" cy="${y - 18}" r="11" fill="${head}"/><line x1="82" y1="${y - 12}" x2="152" y2="${y}" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="102" y1="${y - 6}" x2="92" y2="118" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="118" y1="${y - 2}" x2="130" y2="118" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="152" y1="${y}" x2="206" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (pose === 'row' || pose === 'hinge') {
    body = `<circle cx="94" cy="46" r="12" fill="${head}"/><line x1="100" y1="58" x2="142" y2="84" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="142" y1="84" x2="92" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="142" y1="84" x2="180" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="116" y1="72" x2="58" y2="78" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="118" y1="72" x2="182" y2="68" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (pose === 'jump') {
    body = `<path d="M160 86 L178 54 L198 86" fill="none" stroke="${head}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="104" cy="36" r="12" fill="${head}"/><line x1="104" y1="50" x2="104" y2="76" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="104" y1="60" x2="68" y2="44" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="104" y1="60" x2="140" y2="44" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="104" y1="76" x2="78" y2="108" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="104" y1="76" x2="138" y2="108" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`;
  } else {
    body = `<circle cx="108" cy="34" r="12" fill="${head}"/><line x1="108" y1="48" x2="110" y2="72" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="110" y1="72" x2="72" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="110" y1="72" x2="176" y2="118" stroke="${skin}" stroke-width="9" stroke-linecap="round"/><line x1="110" y1="56" x2="68" y2="64" stroke="${limb}" stroke-width="8" stroke-linecap="round"/><line x1="110" y1="56" x2="156" y2="64" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  }

  return `<rect x="4" y="4" width="232" height="132" rx="22" fill="rgba(251,146,60,.08)" stroke="#fb923c" stroke-width="3"/><line x1="24" y1="120" x2="216" y2="120" stroke="rgba(255,255,255,.24)" stroke-width="4"/>${body}<text x="120" y="24" text-anchor="middle" font-size="11" font-weight="900" fill="#fed7aa">${safe}</text><text x="120" y="134" text-anchor="middle" font-size="9" font-weight="900" fill="#fb923c">ART V2</text>`;
}

export default function VisualUpgrade() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function upgrade() {
      let upgraded = 0;
      document.querySelectorAll('svg[aria-label]').forEach((node) => {
        const svg = node as SVGSVGElement;
        const label = svg.getAttribute('aria-label') || svg.parentElement?.textContent || 'movement';
        const p = scoreFromCard(svg);
        const pose = pickPose(label);
        svg.setAttribute('viewBox', '0 0 240 140');
        svg.innerHTML = art(pose, label, p);
        upgraded += 1;
      });
      setCount(upgraded);
    }

    upgrade();
    const interval = window.setInterval(upgrade, 800);
    const observer = new MutationObserver(upgrade);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed left-3 top-3 z-50 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black text-black shadow-xl">
      ART V2 ACTIVE
    </div>
  );
}
