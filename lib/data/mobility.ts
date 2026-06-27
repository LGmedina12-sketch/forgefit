import type { MediaFields, StretchLibraryItem, VideoType } from '@/lib/training/types';

type StretchSeed = Omit<StretchLibraryItem, keyof MediaFields | 'description' | 'whenToUse' | 'easierAlternative' | 'harderAlternative' | 'injuryWarnings' | 'isMmaSpecific'> & {
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoType?: VideoType;
  whenToUse?: string;
  easierAlternative?: string;
  harderAlternative?: string;
  injuryWarnings?: string[];
  isMmaSpecific?: boolean;
};

const stretchVideos: Record<string, string> = {
  'worlds-greatest-stretch': 'https://www.youtube.com/watch?v=-CiWQ2IvY34',
  'couch-stretch': 'https://www.youtube.com/watch?v=WPWNaOzZGPo',
  'ninety-ninety-switches': 'https://www.youtube.com/watch?v=t4Zz6-aG8Iw',
};

function stretch(item: StretchSeed): StretchLibraryItem {
  const videoUrl = item.videoUrl ?? stretchVideos[item.id] ?? '';
  const videoType = item.videoType ?? (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? 'youtube' : 'external');

  return {
    ...item,
    description: item.description ?? `${item.category} for ${item.bodyAreas.slice(0, 3).map((area) => area.replaceAll('_', ' ')).join(', ')}.`,
    videoUrl,
    thumbnailUrl: item.thumbnailUrl ?? '',
    videoType,
    videoAvailable: Boolean(videoUrl),
    whenToUse: item.whenToUse ?? (item.phase === 'dynamic' ? 'Use before training or early in a mobility session.' : 'Use after training or during a dedicated mobility session.'),
    easierAlternative: item.easierAlternative ?? '',
    harderAlternative: item.harderAlternative ?? '',
    injuryWarnings: item.injuryWarnings ?? [],
    isMmaSpecific: item.isMmaSpecific ?? item.category === 'MMA/BJJ mobility',
  };
}

const baseStretchLibrary: StretchLibraryItem[] = [
  stretch({
    id: 'worlds-greatest-stretch',
    name: "World's Greatest Stretch",
    category: 'dynamic mobility',
    bodyAreas: ['hips', 'hamstrings', 'thoracic_spine', 'rotation'],
    phase: 'dynamic',
    durationSeconds: 60,
    coachingCues: ['Long lunge', 'Inside elbow drops gently', 'Rotate through upper back'],
    commonMistakes: ['Rushing the rotation', 'Letting front knee collapse', 'Holding breath'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'couch-stretch',
    name: 'Couch Stretch',
    category: 'hip flexor stretch',
    bodyAreas: ['hip_flexors', 'quads', 'lower_back'],
    phase: 'static',
    durationSeconds: 75,
    coachingCues: ['Squeeze rear glute', 'Ribs stacked over pelvis', 'Ease into height slowly'],
    commonMistakes: ['Overarching low back', 'Forcing the knee angle', 'Holding breath'],
    equipment: ['wall', 'bench'],
    difficulty: 'intermediate',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'ninety-ninety-switches',
    name: '90/90 Hip Switches',
    category: 'hip rotation',
    bodyAreas: ['hips', 'rotation'],
    phase: 'dynamic',
    durationSeconds: 60,
    coachingCues: ['Sit tall', 'Control both knees', 'Rotate without throwing the torso'],
    commonMistakes: ['Leaning too far back', 'Using momentum', 'Skipping the weak side'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['bjj', 'mma', 'wrestling'],
  }),
  stretch({
    id: 'hip-flexor-rockback',
    name: 'Half-Kneeling Hip Flexor Rock',
    category: 'hip flexor mobility',
    bodyAreas: ['hip_flexors', 'hips'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['Glute squeezed on down leg', 'Small forward rocks', 'Reach arm overhead if tolerated'],
    commonMistakes: ['Dumping into low back', 'Going too deep too fast', 'Relaxing the glute'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'pigeon-stretch',
    name: 'Pigeon Stretch',
    category: 'hip external rotation',
    bodyAreas: ['hips', 'glutes'],
    phase: 'static',
    durationSeconds: 75,
    coachingCues: ['Square hips gently', 'Use hands for support', 'Breathe into the outside hip'],
    commonMistakes: ['Forcing the knee', 'Twisting low back', 'Chasing pain'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    sportTags: ['bjj', 'mma'],
  }),
  stretch({
    id: 'deep-squat-hold',
    name: 'Deep Squat Hold',
    category: 'squat mobility',
    bodyAreas: ['hips', 'ankles', 'adductors'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['Heels heavy', 'Chest proud', 'Use elbows to gently pry knees out'],
    commonMistakes: ['Heels lifting', 'Collapsing chest', 'Forcing painful depth'],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    sportTags: ['wrestling', 'bjj', 'mma'],
  }),
  stretch({
    id: 'ankle-rocks',
    name: 'Ankle Rocks',
    category: 'ankle dorsiflexion',
    bodyAreas: ['ankles'],
    phase: 'dynamic',
    durationSeconds: 45,
    coachingCues: ['Heel stays down', 'Knee tracks over middle toes', 'Smooth forward rocks'],
    commonMistakes: ['Arch collapsing', 'Heel popping up', 'Twisting the foot'],
    equipment: ['bodyweight', 'wall'],
    difficulty: 'beginner',
    sportTags: ['mma', 'wrestling', 'bjj'],
  }),
  stretch({
    id: 'knee-to-wall-test-drill',
    name: 'Ankle Knee-to-Wall Drill',
    category: 'ankle dorsiflexion',
    bodyAreas: ['ankles'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['Measure distance from wall', 'Keep heel planted', 'Own the end range'],
    commonMistakes: ['Knee drifting inward', 'Foot spinning out', 'Bouncing'],
    equipment: ['wall'],
    difficulty: 'beginner',
    sportTags: ['mma', 'wrestling', 'bjj'],
  }),
  stretch({
    id: 'hamstring-floss',
    name: 'Hamstring Floss',
    category: 'posterior chain',
    bodyAreas: ['hamstrings', 'lower_back'],
    phase: 'dynamic',
    durationSeconds: 60,
    coachingCues: ['Long spine', 'Bend and straighten the knee', 'Stay below nerve pain'],
    commonMistakes: ['Rounding aggressively', 'Locking the knee hard', 'Chasing numbness'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'thoracic-open-books',
    name: 'Thoracic Open Books',
    category: 'thoracic rotation',
    bodyAreas: ['thoracic_spine', 'rotation', 'shoulders'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['Stack knees', 'Reach long', 'Rotate through upper back'],
    commonMistakes: ['Letting knees separate', 'Forcing shoulder to floor', 'Holding breath'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'shoulder-pass-throughs',
    name: 'Shoulder Pass-Throughs',
    category: 'shoulder mobility',
    bodyAreas: ['shoulders', 'thoracic_spine'],
    phase: 'dynamic',
    durationSeconds: 45,
    coachingCues: ['Wide grip', 'Ribs down', 'Move slowly through clean range'],
    commonMistakes: ['Arching the back', 'Grip too narrow', 'Shrugging'],
    equipment: ['resistance band', 'stick'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'wall-slides',
    name: 'Shoulder Wall Slides',
    category: 'overhead mobility',
    bodyAreas: ['shoulders', 'thoracic_spine'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['Low ribs stay down', 'Slide without shrugging', 'Own the top'],
    commonMistakes: ['Back arching', 'Wrists forcing contact', 'Neck tension'],
    equipment: ['wall'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj'],
  }),
  stretch({
    id: 'wrist-rocks',
    name: 'Wrist Rocks',
    category: 'wrist extension',
    bodyAreas: ['wrists'],
    phase: 'dynamic',
    durationSeconds: 45,
    coachingCues: ['Spread fingers', 'Shift weight gradually', 'Rotate hand angles'],
    commonMistakes: ['Dumping weight suddenly', 'Locked elbows if painful', 'Ignoring numbness'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['bjj', 'mma', 'wrestling'],
  }),
  stretch({
    id: 'childs-pose-lat-stretch',
    name: 'Childs Pose Lat Stretch',
    category: 'lat and shoulder reset',
    bodyAreas: ['shoulders', 'thoracic_spine', 'lower_back'],
    phase: 'static',
    durationSeconds: 60,
    coachingCues: ['Reach hands long', 'Sink ribs toward floor', 'Breathe into side ribs'],
    commonMistakes: ['Shrugging', 'Forcing shoulders', 'Shallow breathing'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['bjj', 'mma'],
  }),
  stretch({
    id: 'adductor-rockbacks',
    name: 'Adductor Rockbacks',
    category: 'groin mobility',
    bodyAreas: ['adductors', 'hips'],
    phase: 'main',
    durationSeconds: 60,
    coachingCues: ['One leg long to side', 'Hips rock back', 'Foot stays flat or toes up'],
    commonMistakes: ['Twisting the pelvis', 'Rounding hard', 'Bouncing into discomfort'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['bjj', 'wrestling', 'mma'],
  }),
  stretch({
    id: 'neck-cars',
    name: 'Neck Controlled Circles',
    category: 'neck mobility',
    bodyAreas: ['neck'],
    phase: 'dynamic',
    durationSeconds: 45,
    coachingCues: ['Move slowly', 'Use pain-free range', 'Keep shoulders quiet'],
    commonMistakes: ['Fast circles', 'Cranking end range', 'Holding breath'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'lower-back-breathing-reset',
    name: '90/90 Breathing Reset',
    category: 'breathing cooldown',
    bodyAreas: ['lower_back', 'hips'],
    phase: 'breathing',
    durationSeconds: 90,
    coachingCues: ['Feet on wall or bench', 'Exhale fully', 'Feel ribs drop'],
    commonMistakes: ['Arching low back', 'Breathing only into chest', 'Rushing'],
    equipment: ['wall', 'bench'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'foam-roll-quads',
    name: 'Foam Roll Quads',
    category: 'soft tissue',
    bodyAreas: ['hip_flexors', 'quads'],
    phase: 'foam_roll',
    durationSeconds: 60,
    coachingCues: ['Slow passes', 'Pause on tender spots', 'Breathe normally'],
    commonMistakes: ['Rolling too fast', 'Grinding pain', 'Tensing the leg'],
    equipment: ['foam roller'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
  stretch({
    id: 'foam-roll-lats',
    name: 'Foam Roll Lats',
    category: 'soft tissue',
    bodyAreas: ['shoulders', 'thoracic_spine'],
    phase: 'foam_roll',
    durationSeconds: 60,
    coachingCues: ['Side of rib cage on roller', 'Small rolls', 'Breathe into the lat'],
    commonMistakes: ['Rolling directly on shoulder joint', 'Holding breath', 'Going too hard'],
    equipment: ['foam roller'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj'],
  }),
  stretch({
    id: 'box-breathing-cooldown',
    name: 'Box Breathing Cooldown',
    category: 'downshift breathing',
    bodyAreas: ['neck', 'lower_back'],
    phase: 'breathing',
    durationSeconds: 90,
    coachingCues: ['Inhale four counts', 'Hold four', 'Exhale four', 'Hold four'],
    commonMistakes: ['Forcing big breaths', 'Tensing shoulders', 'Rushing the holds'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    sportTags: ['mma', 'bjj', 'wrestling'],
  }),
];

type QuickStretch = {
  id: string;
  name: string;
  areas: StretchLibraryItem['bodyAreas'];
  phase?: StretchLibraryItem['phase'];
  seconds?: number;
  difficulty?: StretchLibraryItem['difficulty'];
  equipment?: string[];
  sport?: string[];
  easier?: string;
  harder?: string;
  warning?: string;
  mmaSpecific?: boolean;
};

function quickStretch(seed: QuickStretch): StretchLibraryItem {
  return stretch({
    id: seed.id,
    name: seed.name,
    category: seed.sport?.length ? 'MMA/BJJ mobility' : `${seed.areas[0].replaceAll('_', ' ')} mobility`,
    bodyAreas: seed.areas,
    phase: seed.phase ?? 'main',
    durationSeconds: seed.seconds ?? 45,
    coachingCues: ['Move slowly into a pain-free range', 'Keep breathing without forcing the position', 'Finish each rep under control'],
    commonMistakes: ['Bouncing into range', 'Holding the breath', 'Forcing through sharp pain'],
    equipment: seed.equipment ?? ['bodyweight'],
    difficulty: seed.difficulty ?? 'beginner',
    sportTags: seed.sport ?? [],
    whenToUse: seed.phase === 'dynamic' ? 'Use during the warm-up before lifting, conditioning, MMA, or BJJ.' : seed.phase === 'breathing' ? 'Use at the beginning or end of a recovery session.' : 'Use after training or in a focused mobility session.',
    easierAlternative: seed.easier ?? '',
    harderAlternative: seed.harder ?? '',
    injuryWarnings: seed.warning ? [seed.warning] : [],
    isMmaSpecific: seed.mmaSpecific ?? Boolean(seed.sport?.length),
  });
}

const requestedStretchLibrary: StretchLibraryItem[] = [
  quickStretch({ id: 'hip-flexor-lunge-stretch', name: 'Hip Flexor Lunge Stretch', areas: ['hip_flexors', 'quads'], easier: 'couch-stretch', harder: 'couch-stretch', warning: 'Use padding and shorten the range with knee pain.' }),
  quickStretch({ id: 'frog-stretch', name: 'Frog Stretch', areas: ['adductors', 'hips'], difficulty: 'intermediate', easier: 'adductor-rockbacks', harder: 'pancake-stretch', warning: 'Do not force the knees or groin.' }),
  quickStretch({ id: 'cossack-squat-stretch', name: 'Cossack Squat Stretch', areas: ['adductors', 'hips', 'ankles'], phase: 'dynamic', difficulty: 'intermediate', easier: 'adductor-rockbacks', harder: 'cossack-squat-stretch', warning: 'Use support if the knee or ankle feels unstable.' }),
  quickStretch({ id: 'shin-box-transitions', name: 'Shin Box Transitions', areas: ['hips', 'rotation', 'glutes'], phase: 'dynamic', difficulty: 'intermediate', easier: 'ninety-ninety-switches', harder: 'shin-box-get-ups', sport: ['bjj', 'mma'] }),
  quickStretch({ id: 'lizard-stretch', name: 'Lizard Stretch', areas: ['hips', 'hip_flexors', 'adductors'], difficulty: 'intermediate', easier: 'hip-flexor-lunge-stretch', harder: 'active-pigeon' }),
  quickStretch({ id: 'seated-hamstring-stretch', name: 'Seated Hamstring Stretch', areas: ['hamstrings', 'lower_back'], easier: 'standing-hamstring-stretch', harder: 'pancake-stretch', warning: 'Keep the spine long and reduce range with nerve symptoms.' }),
  quickStretch({ id: 'standing-hamstring-stretch', name: 'Standing Hamstring Stretch', areas: ['hamstrings'], easier: 'elephant-walks', harder: 'single-leg-good-morning' }),
  quickStretch({ id: 'banded-hamstring-stretch', name: 'Banded Hamstring Stretch', areas: ['hamstrings'], equipment: ['resistance band'], easier: 'seated-hamstring-stretch', harder: 'banded-hamstring-stretch', warning: 'Do not pull into tingling or numbness.' }),
  quickStretch({ id: 'single-leg-good-morning', name: 'Single-Leg Good Morning', areas: ['hamstrings', 'glutes', 'ankles'], phase: 'dynamic', difficulty: 'intermediate', easier: 'elephant-walks', harder: 'single-leg-good-morning' }),
  quickStretch({ id: 'inchworms', name: 'Inchworms', areas: ['hamstrings', 'shoulders', 'wrists'], phase: 'dynamic', difficulty: 'intermediate', easier: 'elephant-walks', harder: 'inchworms', warning: 'Use fists or handles if wrist extension is uncomfortable.' }),
  quickStretch({ id: 'elephant-walks', name: 'Elephant Walks', areas: ['hamstrings', 'calves'], phase: 'dynamic', easier: 'standing-hamstring-stretch', harder: 'inchworms' }),
  quickStretch({ id: 'calf-stretch', name: 'Calf Stretch', areas: ['ankles'], easier: 'ankle-rocks', harder: 'knee-to-wall-test-drill' }),
  quickStretch({ id: 'soleus-stretch', name: 'Soleus Stretch', areas: ['ankles', 'knees'], easier: 'calf-stretch', harder: 'deep-squat-ankle-shifts' }),
  quickStretch({ id: 'tibialis-raises', name: 'Tibialis Raises', areas: ['ankles'], phase: 'dynamic', easier: 'ankle-rocks', harder: 'tibialis-raises' }),
  quickStretch({ id: 'deep-squat-ankle-shifts', name: 'Deep Squat Ankle Shifts', areas: ['ankles', 'hips'], phase: 'dynamic', difficulty: 'intermediate', easier: 'ankle-rocks', harder: 'deep-squat-pry', warning: 'Hold support and reduce depth with knee pain.' }),
  quickStretch({ id: 'shoulder-cars', name: 'Shoulder CARs', areas: ['shoulders', 'thoracic_spine'], phase: 'dynamic', easier: 'wall-slides', harder: 'band-dislocates', warning: 'Use a small range with shoulder pinching.' }),
  quickStretch({ id: 'band-dislocates', name: 'Band Dislocates', areas: ['shoulders', 'thoracic_spine'], phase: 'dynamic', equipment: ['resistance band'], difficulty: 'intermediate', easier: 'shoulder-pass-throughs', harder: 'band-dislocates', warning: 'Use a wide grip and never force through shoulder pain.' }),
  quickStretch({ id: 'doorway-pec-stretch', name: 'Doorway Pec Stretch', areas: ['shoulders', 'thoracic_spine'], easier: 'wall-slides', harder: 'doorway-pec-stretch', warning: 'Lower the arm if the front of the shoulder pinches.' }),
  quickStretch({ id: 'thread-the-needle', name: 'Thread the Needle', areas: ['thoracic_spine', 'shoulders', 'rotation'], phase: 'dynamic', easier: 'thoracic-open-books', harder: 'quadruped-t-spine-rotation' }),
  quickStretch({ id: 'sleeper-stretch', name: 'Sleeper Stretch', areas: ['shoulders'], difficulty: 'intermediate', easier: 'doorway-pec-stretch', harder: 'sleeper-stretch', warning: 'Use gentle pressure only; stop with front-shoulder pain.' }),
  quickStretch({ id: 'scapular-push-ups', name: 'Scapular Push-Ups', areas: ['shoulders', 'thoracic_spine', 'wrists'], phase: 'dynamic', easier: 'wall-slides', harder: 'scapular-push-ups', warning: 'Perform against a wall if wrists or shoulders are sore.' }),
  quickStretch({ id: 'cat-cow', name: 'Cat Cow', areas: ['thoracic_spine', 'lower_back', 'neck'], phase: 'dynamic', easier: 'lower-back-breathing-reset', harder: 'spinal-waves' }),
  quickStretch({ id: 'thoracic-rotations', name: 'Thoracic Rotations', areas: ['thoracic_spine', 'rotation', 'shoulders'], phase: 'dynamic', easier: 'thoracic-open-books', harder: 'quadruped-t-spine-rotation' }),
  quickStretch({ id: 'cobra-stretch', name: 'Cobra Stretch', areas: ['lower_back', 'hip_flexors'], difficulty: 'intermediate', easier: 'childs-pose', harder: 'cobra-stretch', warning: 'Skip with back pinching or radiating symptoms.' }),
  quickStretch({ id: 'childs-pose', name: "Child's Pose", areas: ['lower_back', 'hips', 'shoulders'], easier: 'lower-back-breathing-reset', harder: 'childs-pose-lat-stretch' }),
  quickStretch({ id: 'quadruped-t-spine-rotation', name: 'Quadruped T-Spine Rotation', areas: ['thoracic_spine', 'rotation', 'shoulders'], phase: 'dynamic', difficulty: 'intermediate', easier: 'thoracic-open-books', harder: 'quadruped-t-spine-rotation' }),
  quickStretch({ id: 'dead-hang-mobility', name: 'Dead Hang Mobility', areas: ['shoulders', 'thoracic_spine'], equipment: ['pull-up bar'], difficulty: 'intermediate', easier: 'childs-pose-lat-stretch', harder: 'dead-hang-mobility', warning: 'Keep feet supported with shoulder or elbow symptoms.' }),
  quickStretch({ id: 'wrist-circles', name: 'Wrist Circles', areas: ['wrists'], phase: 'dynamic', easier: 'wrist-circles', harder: 'wrist-rocks' }),
  quickStretch({ id: 'wrist-flexor-stretch', name: 'Wrist Flexor Stretch', areas: ['wrists', 'elbows'], easier: 'wrist-circles', harder: 'palm-lifts' }),
  quickStretch({ id: 'wrist-extensor-stretch', name: 'Wrist Extensor Stretch', areas: ['wrists', 'elbows'], easier: 'wrist-circles', harder: 'wrist-rocks' }),
  quickStretch({ id: 'palm-lifts', name: 'Palm Lifts', areas: ['wrists'], phase: 'dynamic', difficulty: 'intermediate', easier: 'wrist-rocks', harder: 'palm-lifts' }),
  quickStretch({ id: 'chin-tucks', name: 'Chin Tucks', areas: ['neck', 'thoracic_spine'], phase: 'dynamic', easier: 'box-breathing-cooldown', harder: 'neck-cars', warning: 'Keep the motion small and stop with dizziness or radiating symptoms.' }),
  quickStretch({ id: 'upper-trap-stretch', name: 'Upper Trap Stretch', areas: ['neck', 'shoulders'], easier: 'chin-tucks', harder: 'neck-cars', warning: 'Use no hand pressure if the neck is irritable.' }),
  quickStretch({ id: 'hip-escapes-mobility', name: 'Hip Escapes', areas: ['hips', 'rotation', 'lower_back'], phase: 'dynamic', sport: ['bjj', 'mma'], easier: 'glute-bridge-mobility', harder: 'technical-stand-up-mobility' }),
  quickStretch({ id: 'shin-box-get-ups', name: 'Shin Box Get-Ups', areas: ['hips', 'glutes', 'rotation'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'shin-box-transitions', harder: 'shin-box-get-ups' }),
  quickStretch({ id: 'combat-base-transitions', name: 'Combat Base Transitions', areas: ['hips', 'ankles', 'wrists'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'shin-box-transitions', harder: 'technical-stand-up-mobility', warning: 'Use a pad and shorten the kneeling range with knee pain.' }),
  quickStretch({ id: 'deep-squat-pry', name: 'Deep Squat Pry', areas: ['hips', 'ankles', 'adductors'], difficulty: 'intermediate', sport: ['bjj', 'mma', 'wrestling'], easier: 'deep-squat-hold', harder: 'cossack-squat-stretch', warning: 'Hold support and reduce depth with knee or ankle pain.' }),
  quickStretch({ id: 'spinal-waves', name: 'Spinal Waves', areas: ['thoracic_spine', 'lower_back', 'neck'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'cat-cow', harder: 'spinal-waves', warning: 'Use a small range and never force the neck.' }),
  quickStretch({ id: 'bridge-reach', name: 'Bridge Reach', areas: ['hips', 'thoracic_spine', 'shoulders'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'glute-bridge-mobility', harder: 'bridge-reach', warning: 'Skip if the low back or shoulder pinches.' }),
  quickStretch({ id: 'active-pigeon', name: 'Active Pigeon', areas: ['hips', 'glutes', 'rotation'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'pigeon-stretch', harder: 'ninety-ninety-hip-lift', warning: 'Keep the front knee comfortable and use support.' }),
  quickStretch({ id: 'ninety-ninety-hip-lift', name: '90/90 to Hip Lift', areas: ['hips', 'glutes', 'rotation'], phase: 'dynamic', difficulty: 'advanced', sport: ['bjj', 'mma'], easier: 'ninety-ninety-switches', harder: 'shin-box-get-ups' }),
  quickStretch({ id: 'pancake-stretch', name: 'Pancake Stretch', areas: ['hamstrings', 'adductors', 'hips'], difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'seated-hamstring-stretch', harder: 'straddle-good-mornings', warning: 'Hinge from the hips and avoid rounding into nerve symptoms.' }),
  quickStretch({ id: 'straddle-good-mornings', name: 'Straddle Good Mornings', areas: ['hamstrings', 'adductors', 'hips'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'pancake-stretch', harder: 'straddle-good-mornings' }),
  quickStretch({ id: 'technical-stand-up-mobility', name: 'Technical Stand-Up Mobility Drill', areas: ['hips', 'wrists', 'shoulders', 'ankles'], phase: 'dynamic', difficulty: 'intermediate', sport: ['bjj', 'mma'], easier: 'combat-base-transitions', harder: 'technical-stand-up-mobility', warning: 'Use a supported hand or fist if the wrist is sensitive.' }),
  quickStretch({ id: 'glute-bridge-mobility', name: 'Glute Bridge Mobility', areas: ['hips', 'glutes', 'lower_back'], phase: 'dynamic', easier: 'lower-back-breathing-reset', harder: 'bridge-reach' }),
  quickStretch({ id: 'crocodile-breathing', name: 'Crocodile Breathing', areas: ['lower_back', 'thoracic_spine'], phase: 'breathing', seconds: 60, easier: 'box-breathing-cooldown', harder: 'crocodile-breathing' }),
];

export const stretchLibrary: StretchLibraryItem[] = Array.from(
  new Map([...baseStretchLibrary, ...requestedStretchLibrary].map((item) => [item.id, item])).values(),
);

export type MobilityDrill = {
  name: string;
  target: string;
  durationSeconds: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  mistakes: string[];
};

export const mobilityDrills: MobilityDrill[] = stretchLibrary.map((item) => ({
  name: item.name,
  target: item.bodyAreas[0],
  durationSeconds: item.durationSeconds,
  difficulty: item.difficulty,
  equipment: item.equipment,
  instructions: item.coachingCues,
  mistakes: item.commonMistakes,
}));
