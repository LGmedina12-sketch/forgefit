const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/lib/')) {
    request = path.join(process.cwd(), '.test-build', request.slice(6));
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

const {
  generateWorkoutPlan,
  generateMobilityPlan,
} = require('../.test-build/training/recommendationEngine.js');
const { validateVideoLibrary, validateVideoUrl } = require('../.test-build/training/media.js');
const { stretchLibrary } = require('../.test-build/data/mobility.js');

const now = new Date().toISOString();
const baseProfile = {
  goal: 'strength',
  trainingPlan: 'push_pull_legs',
  equipment: ['bodyweight'],
  trainingDaysPerWeek: 3,
  combatSchedule: { mma: 0, bjj: 0, wrestling: 0, striking: 0 },
  sorenessLevel: 3,
  readinessLevel: 82,
  painAreas: [],
  tightAreas: ['hips', 'shoulders'],
  injuryLimitations: [],
  experienceLevel: 'intermediate',
  workoutLength: 30,
  mobilityMinutes: 20,
  onboardingComplete: true,
};
const scores = ['hips', 'ankles', 'hamstrings', 'shoulders', 'thoracic_spine', 'neck', 'wrists', 'lower_back', 'adductors', 'hip_flexors', 'rotation']
  .map((area, index) => ({ area, score: 55 + index, updatedAt: now, source: 'manual' }));

function workout(profile = baseProfile, options = {}) {
  return generateWorkoutPlan({ profile, mobilityScores: scores, history: [], feedback: [], ...options });
}

function mobility(profile = baseProfile, options = {}) {
  return generateMobilityPlan({ profile, mobilityScores: scores, mode: 'recovery_day', timeAvailable: 20, feedback: [], history: [], mobilityHistory: [], ...options });
}

const push = workout(baseProfile, { workoutTypeOverride: 'push' });
assert.equal(push.workoutType, 'push');
assert.equal(push.exercises.length, 8, '30-minute workout must have 6-8 exercises');
assert(push.exercises.some((entry) => entry.phase === 'main' && entry.item.movementPattern === 'push'), 'Push sessions need push strength work');
assert(push.exercises.every((entry) => entry.item.equipment.every((item) => item === 'bodyweight')),
  'bodyweight-only sessions must not display unselected equipment');

const pushRegenerated = workout(baseProfile, { workoutTypeOverride: 'push', generationIndex: 1 });
assert.notDeepEqual(pushRegenerated.exercises.map((entry) => entry.item.id), push.exercises.map((entry) => entry.item.id),
  'regenerate must change the exercise mix');

const pullHistory = [{ completedAt: now, sessionTitle: 'Pull', workoutType: 'pull', muscles: ['back'], movementPatterns: ['pull'], rpe: 7, pain: false }];
const pullStart = workout(baseProfile);
assert(pullStart.exercises.some((entry) => entry.phase === 'main' && entry.item.movementPattern === 'pull'), 'Pull sessions need pull strength work');
assert.equal(workout(baseProfile, { history: pullHistory }).workoutType, 'push', 'Pull must advance to Push');
const pushHistory = [{ completedAt: now, sessionTitle: 'Push', workoutType: 'push', muscles: ['chest'], movementPatterns: ['push'], rpe: 7, pain: false }, ...pullHistory];
assert.equal(workout(baseProfile, { history: pushHistory }).workoutType, 'legs', 'Push must advance to Legs');

const missedDate = new Date(Date.now() - 3 * 86400000).toISOString();
const missed = workout(baseProfile, { history: [{ ...pullHistory[0], completedAt: missedDate }] });
assert.equal(missed.workoutType, 'push');
assert(missed.missedDays >= 2, 'missed days must not advance the split');

const hipShoulder = mobility(baseProfile);
assert.equal(hipShoulder.steps.length, 8, '20-minute mobility must have 6-8 movements');
assert(hipShoulder.targetAreas.includes('hips') && hipShoulder.targetAreas.includes('shoulders'));
const hipShoulderRegenerated = mobility(baseProfile, { generationIndex: 1 });
assert.notDeepEqual(hipShoulderRegenerated.steps.map((step) => step.item.id), hipShoulder.steps.map((step) => step.item.id),
  'mobility regenerate must change the drill mix');

const highSoreness = workout({ ...baseProfile, sorenessLevel: 9, readinessLevel: 35 });
assert(['recovery', 'rest'].includes(highSoreness.workoutType));
assert.equal(highSoreness.intensity, 'easy');

const dumbbellProfile = { ...baseProfile, equipment: ['bodyweight', 'dumbbell', 'bench'] };
const dumbbellAppears = Array.from({ length: 8 }, (_, generationIndex) => workout(dumbbellProfile, { workoutTypeOverride: 'push', generationIndex }))
  .some((session) => session.exercises.some((entry) => entry.item.equipment.includes('dumbbell')));
assert(dumbbellAppears, 'dumbbell exercises should appear when dumbbells are selected');

const progressed = workout(dumbbellProfile, {
  workoutTypeOverride: 'push',
  history: Array.from({ length: 10 }, (_, index) => ({ ...pullHistory[0], completedAt: new Date(Date.now() - index * 86400000).toISOString() })),
  feedback: [0, 1].map((index) => ({ sessionId: String(index), sessionType: 'workout', rpe: 6, pain: false, painAreas: [], formQuality: 'good', completed: true, createdAt: now })),
});
assert(progressed.exercises.some((entry) => (entry.sets ?? 0) >= 4 || entry.restSeconds < 60), 'completed history should progress volume or rest');

const mobilityAfterCompletion = mobility(baseProfile, {
  mobilityHistory: [{ completedAt: now, sessionTitle: hipShoulder.title, targetAreas: hipShoulder.targetAreas, drillIds: hipShoulder.steps.map((step) => step.item.id), durationMinutes: 20, rpe: 5, pain: false }],
});
assert.notDeepEqual(mobilityAfterCompletion.steps.map((step) => step.item.id), hipShoulder.steps.map((step) => step.item.id),
  'completed mobility history should update the next session');

const world = stretchLibrary.find((item) => item.id === 'worlds-greatest-stretch');
assert(world && world.videoAvailable && !world.videoUrl.includes('example.com'));
assert.equal(validateVideoUrl(world.videoUrl, true).status, 'valid');
assert.equal(validateVideoUrl('', false).message, 'Video example coming soon.');
assert.equal(validateVideoLibrary().filter((item) => item.status === 'placeholder' || item.status === 'invalid').length, 0);

console.log('Generator tests passed: 16 adaptive workout, mobility, persistence-shape, and video checks.');
