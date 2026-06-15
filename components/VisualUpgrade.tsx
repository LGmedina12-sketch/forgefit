'use client';

import { useEffect } from 'react';

type Pose = 'squat' | 'hip90' | 'ankle' | 'overhead' | 'wall' | 'twist' | 'hamstring' | 'lunge' | 'pushup' | 'row' | 'hinge' | 'jump' | 'core';

function pickPose(label: string): Pose {
  const text = label.toLowerCase();
  if (text.includes('90') || text.includes('pigeon') || text.includes('figure four') || text.includes('hip switch')) return 'hip90';
  if (text.includes('ankle') || text.includes('calf') || text.includes('knee to wall') || text.includes('heel')) return 'ankle';
  if (text.includes('wall slide') || text.includes('low slide') || text.includes('high slide')) return 'wall';
  if (text.includes('shoulder') || text.includes('overhead') || text.includes('pec') || text.includes('arms')) return 'overhead';
  if (text.includes('thoracic') || text.includes('open') || text.includes('thread') || text.includes('twist') || text.includes('rotate') || text.includes('chest')) return 'twist';
  if (text.includes('hamstring') || text.includes('toe') || text.includes('fold') || text.includes('leg raise') || text.includes('hands high')) return 'hamstring';
  if (text.includes('push') || text.includes('conditioning')) return 'pushup';
  if (text.includes('row') || text.includes('pull')) return 'row';
  if (text.includes('hinge') || text.includes('deadlift')) return 'hinge';
  if (text.includes('jump') || text.includes('power')) return 'jump';
  if (text.includes('core') || text.includes('plank') || text.includes('hollow')) return 'core';
  if (text.includes('squat')) return 'squat';
  return 'lunge';
}

function svgMarkup(pose: Pose, label: string, value: number) {
  const p = Math.max(0, Math.min(100, value));
  const skin = '#fed7aa';
  const head = '#fb923c';
  const limb = '#fdba74';
  const floor = 'rgba(255,255,255,.22)';
  const body = poseMarkup(pose, p, skin, head, limb);
  const safeLabel = label.replace(/[<>&]/g, '');
  return `<rect x="8" y="8" width="224" height="124" rx="20" fill="rgba(255,255,255,.04)"/><line x1="25" y1="116" x2="215" y2="116" stroke="${floor}" stroke-width="4"/>${body}<text x="120" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#fed7aa">${safeLabel.slice(0, 20)}</text>`;
}

function poseMarkup(pose: Pose, p: number, skin: string, head: string, limb: string) {
  if (pose === 'squat') {
    const hip = 62 + p * 0.34;
    const headY = 30 + p * 0.12;
    return `<circle cx="120" cy="${headY}" r="12" fill="${head}"/><line x1="120" y1="${headY + 14}" x2="120" y2="${hip}" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="${hip}" x2="${78 - p * .12}" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="${hip}" x2="${162 + p * .12}" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="118" y1="${headY + 28}" x2="72" y2="${66 + p * .24}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="122" y1="${headY + 28}" x2="168" y2="${66 + p * .24}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (pose === 'ankle') {
    const knee = 88 + p * .88;
    return `<line x1="196" y1="20" x2="196" y2="118" stroke="rgba(255,255,255,.2)" stroke-width="5"/><circle cx="82" cy="34" r="11" fill="${head}"/><line x1="82" y1="47" x2="105" y2="74" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="105" y1="74" x2="${knee}" y2="98" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="${knee}" y1="98" x2="158" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="105" y1="74" x2="54" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="96" y1="56" x2="182" y2="55" stroke="${limb}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (pose === 'overhead' || pose === 'wall') {
    const hand = 92 - p * .72;
    const wall = pose === 'wall' ? '<line x1="200" y1="18" x2="200" y2="118" stroke="rgba(255,255,255,.22)" stroke-width="5"/>' : '';
    return `${wall}<circle cx="120" cy="38" r="12" fill="${head}"/><line x1="120" y1="52" x2="120" y2="86" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="64" x2="82" y2="${hand}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="120" y1="64" x2="158" y2="${hand}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="120" y1="86" x2="92" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="120" y1="86" x2="148" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (pose === 'twist') {
    const open = 76 + p * 1.05;
    return `<circle cx="76" cy="48" r="11" fill="${head}"/><line x1="86" y1="58" x2="128" y2="82" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="128" y1="82" x2="74" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="128" y1="82" x2="168" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="105" y1="68" x2="52" y2="84" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="106" y1="68" x2="${open}" y2="${58 - p * .2}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><path d="M88 66 C 122 ${55 - p * .2}, 160 ${48 - p * .15}, 202 38" fill="none" stroke="rgba(251,146,60,.45)" stroke-width="3" stroke-dasharray="6 6"/>`;
  }
  if (pose === 'hamstring') {
    const reach = 112 + p * .78;
    return `<circle cx="${96 + p * .25}" cy="${42 + p * .2}" r="11" fill="${head}"/><line x1="88" y1="66" x2="${112 + p * .38}" y2="${70 + p * .25}" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="88" y1="66" x2="54" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="88" y1="66" x2="188" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="${112 + p * .38}" y1="${70 + p * .25}" x2="${reach}" y2="${72 + p * .38}" stroke="${limb}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (pose === 'hip90') {
    const open = p * .52;
    return `<circle cx="118" cy="42" r="11" fill="${head}"/><line x1="118" y1="55" x2="118" y2="82" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="118" y1="84" x2="${76 - open * .4}" y2="${96 - open * .12}" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="${76 - open * .4}" y1="${96 - open * .12}" x2="48" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="118" y1="84" x2="${160 + open * .55}" y2="${96 - open * .22}" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="${160 + open * .55}" y1="${96 - open * .22}" x2="206" y2="112" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (pose === 'pushup' || pose === 'core') {
    const bodyY = pose === 'core' ? 94 : 82;
    return `<circle cx="70" cy="${bodyY - 18}" r="10" fill="${head}"/><line x1="82" y1="${bodyY - 12}" x2="150" y2="${bodyY}" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="102" y1="${bodyY - 6}" x2="92" y2="116" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="118" y1="${bodyY - 2}" x2="130" y2="116" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="150" y1="${bodyY}" x2="204" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (pose === 'row' || pose === 'hinge') {
    return `<circle cx="94" cy="44" r="11" fill="${head}"/><line x1="100" y1="56" x2="140" y2="82" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="140" y1="82" x2="92" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="140" y1="82" x2="178" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="116" y1="70" x2="58" y2="76" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="118" y1="70" x2="180" y2="66" stroke="${limb}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (pose === 'jump') {
    return `<path d="M160 84 L178 54 L196 84" fill="none" stroke="${head}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="104" cy="34" r="11" fill="${head}"/><line x1="104" y1="48" x2="104" y2="74" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="104" y1="58" x2="70" y2="44" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="104" y1="58" x2="138" y2="44" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="104" y1="74" x2="78" y2="106" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="104" y1="74" x2="136" y2="106" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>`;
  }
  return `<circle cx="108" cy="30" r="10" fill="${head}"/><line x1="108" y1="42" x2="110" y2="70" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="110" y1="70" x2="72" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="110" y1="70" x2="174" y2="116" stroke="${skin}" stroke-width="8" stroke-linecap="round"/><line x1="110" y1="52" x2="68" y2="62" stroke="${limb}" stroke-width="7" stroke-linecap="round"/><line x1="110" y1="52" x2="154" y2="62" stroke="${limb}" stroke-width="7" stroke-linecap="round"/>`;
}

function readScore(svg: SVGSVGElement) {
  const parent = svg.closest('div');
  const text = parent?.textContent ?? '';
  const match = text.match(/(\d{1,3})%|\b(\d{1,3})\b/);
  if (!match) return 80;
  const n = Number(match[1] ?? match[2]);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 80;
}

export default function VisualUpgrade() {
  useEffect(() => {
    function upgrade() {
      document.querySelectorAll('svg[aria-label]').forEach((node) => {
        const svg = node as SVGSVGElement;
        const label = svg.getAttribute('aria-label') || '';
        if (!label || svg.dataset.upgraded === 'true') return;
        const pose = pickPose(label);
        const score = readScore(svg);
        svg.setAttribute('viewBox', '0 0 240 140');
        svg.innerHTML = svgMarkup(pose, label, score);
        svg.dataset.upgraded = 'true';
      });
    }

    upgrade();
    const observer = new MutationObserver(upgrade);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
