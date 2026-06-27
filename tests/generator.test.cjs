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
const { exerciseLibrary } = require('../.test-build/data/exercises.js');
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
assert(push.exercises.every((entry) => entry.item.goalTags.includes('strength')), 'Strength must hard-filter to strength-tagged exercises');
assert(push.exercises.every((entry) => !entry.item.isMmaSpecific), 'Strength must block MMA-specific drills');
assert(push.exercises.every((entry) => !entry.item.isConditioning), 'Pure strength must block conditioning work');
assert(push.exercises.every((entry) => entry.item.equipment.every((item) => item === 'bodyweight')),
  'bodyweight-only sessions must not display unselected equipment');

const strengthMain = push.exercises.filter((entry) => entry.phase === 'main');
assert(strengthMain.every((entry) => entry.sets >= 3 && entry.sets <= 5), 'Strength main work must use 3-5 sets');
assert(strengthMain.every((entry) => entry.reps && Number(entry.reps.split('-')[0]) >= 3 && Number(entry.reps.match(/\d+/g).at(-1)) <= 8),
  'Strength main work must use 3-8 reps');
assert(strengthMain.every((entry) => entry.restSeconds >= 90 && entry.restSeconds <= 180),
  'Strength main work must use 90-180 seconds rest');
assert(push.exercises.filter((entry) => entry.phase === 'accessory').every((entry) => entry.reps && Number(entry.reps.match(/\d+/g).at(-1)) <= 12),
  'Strength accessories must stay in the 6-12 rep range');

const pushRegenerated = workout(baseProfile, { workoutTypeOverride: 'push', generationIndex: 1 });
assert.notDeepEqual(pushRegenerated.exercises.map((entry) => entry.item.id), push.exercises.map((entry) => entry.item.id),
  'regenerate must change the exercise mix');
assert(pushRegenerated.exercises.every((entry) => entry.item.goalTags.includes('strength') && !entry.item.isMmaSpecific && !entry.item.isConditioning),
  'regenerated strength must keep the same strength-only filters');

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
const dumbbellStrength = workout(dumbbellProfile, { workoutTypeOverride: 'push', generationIndex: 2 });
assert(dumbbellStrength.exercises.every((entry) => entry.item.goalTags.includes('strength') && !entry.item.isMmaSpecific),
  'strength plus dumbbells must remain strength-focused');

const mmaProfile = { ...baseProfile, goal: 'mma_bjj', trainingPlan: 'mma_bjj_athletic' };
const mmaWorkout = workout(mmaProfile, { workoutTypeOverride: 'mma_bjj' });
assert(mmaWorkout.exercises.some((entry) => entry.item.isMmaSpecific), 'MMA/BJJ must allow an MMA-specific drill');
assert(mmaWorkout.exercises.some((entry) => entry.item.isConditioning), 'MMA/BJJ must include conditioning when matches exist');

const hybridProfile = { ...baseProfile, goal: 'strength', trainingPlan: 'hybrid' };
const hybridWorkout = workout(hybridProfile, { workoutTypeOverride: 'full_body' });
const hybridAthleticCount = hybridWorkout.exercises.filter((entry) => entry.item.isMmaSpecific || entry.item.isConditioning || entry.item.movementPattern === 'power').length;
const hybridStrengthCount = hybridWorkout.exercises.filter((entry) => entry.item.goalTags.includes('strength') && !entry.item.isMmaSpecific).length;
assert(hybridAthleticCount >= 1 && hybridAthleticCount <= 3, 'Hybrid must use only 1-3 athletic or MMA movements');
assert(hybridStrengthCount > hybridAthleticCount, 'Hybrid must stay mostly strength-focused');

const fatLossWorkout = workout({ ...baseProfile, goal: 'fat_loss' }, { workoutTypeOverride: 'full_body' });
assert(fatLossWorkout.exercises.some((entry) => entry.item.isConditioning), 'Fat loss must include conditioning');
assert(fatLossWorkout.exercises.every((entry) => !entry.item.isMmaSpecific), 'Fat loss must not add random MMA-specific drills');
assert(fatLossWorkout.exercises.filter((entry) => entry.item.isConditioning).every((entry) => entry.restSeconds <= 45),
  'Fat-loss conditioning must use short rest');

const conditioningWorkout = workout({ ...baseProfile, goal: 'conditioning' }, { workoutTypeOverride: 'full_body' });
assert(conditioningWorkout.exercises.some((entry) => entry.item.isConditioning && entry.timeSeconds),
  'Conditioning goal must produce timed conditioning work');

const recoveryWorkout = workout({ ...baseProfile, goal: 'recovery', sorenessLevel: 9, readinessLevel: 35 }, { workoutTypeOverride: 'recovery' });
assert.equal(recoveryWorkout.intensity, 'easy');
assert(recoveryWorkout.exercises.length > 0 && recoveryWorkout.exercises.every((entry) => entry.item.intensity === 'easy'),
  'Recovery must contain only easy work');
assert(recoveryWorkout.exercises.every((entry) => !entry.item.isMmaSpecific && !entry.item.isMainLift),
  'Recovery must block MMA drills and hard main lifts');

const muscleWorkout = workout({ ...dumbbellProfile, goal: 'muscle' }, { workoutTypeOverride: 'push' });
const muscleWork = muscleWorkout.exercises.filter((entry) => entry.phase === 'main' || entry.phase === 'accessory');
assert(muscleWork.every((entry) => entry.sets >= 3 && entry.sets <= 4 && entry.reps === '8-15'),
  'Build-muscle work must use 3-4 sets of 8-15 reps');

const pushUp = exerciseLibrary.find((item) => item.id === 'push-up');
assert(pushUp, 'push-up fixture must exist');
const limitedWorkout = workout(baseProfile, { workoutTypeOverride: 'push', library: [pushUp] });
assert(limitedWorkout.exercises.length < 8 && limitedWorkout.limitedMatchMessage.includes('Limited matching exercises'),
  'undersized eligible pools must reduce session size and report the limited match');

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
assert.deepEqual(hipShoulderRegenerated.targetAreas, hipShoulder.targetAreas,
  'mobility regenerate must preserve the same target areas');
assert(hipShoulder.steps.every((step) => !step.item.isMmaSpecific), 'Strength mobility must block MMA-specific mobility drills');

const mmaMobility = mobility(mmaProfile);
assert(mmaMobility.steps.some((step) => step.item.isMmaSpecific), 'MMA/BJJ mobility must allow MMA-specific mobility drills');

const world = stretchLibrary.find((item) => item.id === 'worlds-greatest-stretch');
assert(world && world.videoAvailable && !world.videoUrl.includes('example.com'));
assert(exerciseLibrary.every((item) => item.intensity && item.workoutTypes.length
  && typeof item.isMainLift === 'boolean' && typeof item.isAccessory === 'boolean'
  && typeof item.isConditioning === 'boolean' && typeof item.isMmaSpecific === 'boolean'),
  'every exercise must expose the required role, intensity, and workout-type metadata');
assert(stretchLibrary.every((item) => typeof item.isMmaSpecific === 'boolean'),
  'every mobility drill must expose MMA-specific classification');
assert.equal(validateVideoUrl(world.videoUrl, true).status, 'valid');
assert.equal(validateVideoUrl('', false).message, 'Video example coming soon.');
assert.equal(validateVideoLibrary().filter((item) => item.status === 'placeholder' || item.status === 'invalid').length, 0);

console.log('Generator tests passed: goal filtering, prescriptions, fallbacks, regeneration, mobility, progression, and video checks.');
