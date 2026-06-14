import { mobilityDrills } from '@/lib/data/mobility';

export function generateMobilityRoutine(targets: string[], minutes: 3 | 5 | 10) {
  const totalSeconds = minutes * 60;
  const filtered = mobilityDrills.filter((drill) => targets.includes(drill.target));
  const pool = filtered.length ? filtered : mobilityDrills;
  const routine = [];
  let usedSeconds = 0;

  for (const drill of pool) {
    if (usedSeconds + drill.durationSeconds > totalSeconds + 30) break;
    routine.push(drill);
    usedSeconds += drill.durationSeconds;
  }

  return {
    title: `${minutes}-Minute Mobility Reset`,
    targets,
    minutes,
    drills: routine,
  };
}
