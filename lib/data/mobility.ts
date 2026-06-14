export type MobilityDrill = {
  name: string;
  target: string;
  durationSeconds: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  mistakes: string[];
};

export const mobilityDrills: MobilityDrill[] = [
  { name: 'Worlds Greatest Stretch', target: 'hips', durationSeconds: 60, difficulty: 'beginner', equipment: ['bodyweight'], instructions: ['Step into a long lunge.', 'Place inside hand down.', 'Rotate chest open.', 'Switch sides.'], mistakes: ['Rushing rotation', 'Letting front knee cave'] },
  { name: 'Ankle Knee-to-Wall', target: 'ankles', durationSeconds: 60, difficulty: 'beginner', equipment: ['wall'], instructions: ['Place foot near wall.', 'Drive knee toward wall.', 'Keep heel down.', 'Move closer or farther.'], mistakes: ['Heel lifting', 'Arch collapsing'] },
  { name: '90/90 Hip Switch', target: 'hips', durationSeconds: 60, difficulty: 'beginner', equipment: ['bodyweight'], instructions: ['Sit in 90/90 position.', 'Rotate knees side to side.', 'Stay tall.', 'Control each switch.'], mistakes: ['Using momentum', 'Leaning too far back'] },
  { name: 'Thoracic Open Book', target: 'thoracic spine', durationSeconds: 60, difficulty: 'beginner', equipment: ['bodyweight'], instructions: ['Lie on side.', 'Stack knees.', 'Rotate top arm open.', 'Breathe into the stretch.'], mistakes: ['Letting knees separate', 'Forcing the shoulder'] },
  { name: 'Shoulder Wall Slide', target: 'shoulders', durationSeconds: 60, difficulty: 'beginner', equipment: ['wall'], instructions: ['Back against wall.', 'Slide arms overhead.', 'Keep ribs down.', 'Return slowly.'], mistakes: ['Arching lower back', 'Shrugging'] },
  { name: 'Hamstring Floss', target: 'hamstrings', durationSeconds: 60, difficulty: 'beginner', equipment: ['bodyweight'], instructions: ['Hinge forward lightly.', 'Bend and straighten knee.', 'Keep spine long.', 'Switch sides.'], mistakes: ['Rounding aggressively', 'Locking knee hard'] },
  { name: 'Deep Squat Pry', target: 'hips', durationSeconds: 60, difficulty: 'intermediate', equipment: ['bodyweight'], instructions: ['Sit into squat.', 'Press knees out.', 'Shift side to side.', 'Breathe calmly.'], mistakes: ['Heels lifting', 'Collapsing chest'] },
  { name: 'Couch Stretch', target: 'hips', durationSeconds: 60, difficulty: 'intermediate', equipment: ['wall', 'bench'], instructions: ['Place rear foot on wall or bench.', 'Bring torso tall.', 'Squeeze rear glute.', 'Breathe.'], mistakes: ['Overarching back', 'Holding breath'] }
];
