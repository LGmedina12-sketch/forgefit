import type { CalibrationSelfTest, CalibrationTestKey, MobilityArea } from '@/lib/training/types';

export const scoringAreas: MobilityArea[] = [
  'hips',
  'ankles',
  'hamstrings',
  'shoulders',
  'thoracic_spine',
  'neck',
  'wrists',
  'lower_back',
  'adductors',
  'hip_flexors',
  'rotation',
];

export const calibrationTests: CalibrationSelfTest[] = [
  {
    id: 'deep_squat',
    name: 'Deep Squat Test',
    area: 'hips',
    instructions: [
      'Stand with feet just outside hip width.',
      'Squat as low as you can while heels stay down.',
      'Keep chest tall and knees tracking over toes.',
    ],
    scoring: 'Score 90-100 for full depth with heels down and no pain, 60-80 for depth with compensation, below 60 for major restriction or discomfort.',
    example: 'A clean deep squat with heels down and torso controlled is around 90.',
  },
  {
    id: 'shoulder_overhead_reach',
    name: 'Shoulder Overhead Reach',
    area: 'shoulders',
    instructions: [
      'Stand with ribs down and arms straight.',
      'Reach both arms overhead without arching your lower back.',
      'Check if biceps can finish near ears comfortably.',
    ],
    scoring: 'Score 90-100 for arms overhead without rib flare, 60-80 for slight arch or tightness, below 60 for pain or limited range.',
    example: 'Arms near ears with ribs controlled is around 90.',
  },
  {
    id: 'ankle_knee_to_wall',
    name: 'Ankle Knee-to-Wall Test',
    area: 'ankles',
    instructions: [
      'Place toes a few inches from a wall.',
      'Drive knee toward the wall while heel stays down.',
      'Move the foot back until you find your clean limit.',
    ],
    scoring: 'Score 90-100 for 4 inches or more cleanly, 70-85 for 2-4 inches, below 70 for less than 2 inches or heel lift.',
    example: 'Four inches with heel down is around 90.',
  },
  {
    id: 'hip_rotation',
    name: 'Hip Internal/External Rotation Check',
    area: 'rotation',
    instructions: [
      'Sit tall in a 90/90 position.',
      'Check how easily both knees can rotate side to side.',
      'Compare left and right without forcing the knee.',
    ],
    scoring: 'Score 90-100 for smooth control both ways, 60-80 for stiffness or asymmetry, below 60 for pinching or major restriction.',
    example: 'Smooth 90/90 switches with little hand support are around 85-95.',
  },
  {
    id: 'hamstring_reach',
    name: 'Hamstring Reach Test',
    area: 'hamstrings',
    instructions: [
      'Sit with one leg straight and one knee bent.',
      'Hinge forward with a long spine.',
      'Note how close you can reach without nerve symptoms.',
    ],
    scoring: 'Score 90-100 for reaching foot with a long spine, 60-80 for shin or ankle reach, below 60 for major rounding or nerve-like symptoms.',
    example: 'Reaching the toes without aggressive rounding is around 90.',
  },
  {
    id: 'thoracic_rotation',
    name: 'Thoracic Rotation Test',
    area: 'thoracic_spine',
    instructions: [
      'Sit or kneel with hips still.',
      'Rotate your chest left and right.',
      'Compare sides and avoid twisting through the low back.',
    ],
    scoring: 'Score 90-100 for even rotation both sides, 60-80 for asymmetry or stiffness, below 60 for blocked range or discomfort.',
    example: 'Even side-to-side rotation with hips still is around 90.',
  },
  {
    id: 'wrist_extension',
    name: 'Wrist Extension Test',
    area: 'wrists',
    instructions: [
      'Place palms on the floor or a bench with fingers forward.',
      'Gently shift shoulders forward over hands.',
      'Stop before sharp pain or numbness.',
    ],
    scoring: 'Score 90-100 for comfortable extension with mild load, 60-80 for tightness, below 60 for pain, numbness, or very limited load.',
    example: 'Comfortable quadruped wrist loading is around 85-95.',
  },
];

export const defaultCalibrationScores: Record<CalibrationTestKey, number> = {
  deep_squat: 70,
  shoulder_overhead_reach: 72,
  ankle_knee_to_wall: 68,
  hip_rotation: 70,
  hamstring_reach: 62,
  thoracic_rotation: 74,
  wrist_extension: 76,
};
