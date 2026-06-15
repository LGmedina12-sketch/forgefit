import { Dumbbell, Flame, HeartPulse, Trophy } from 'lucide-react';
import { generateWorkout } from '@/lib/generators/workout';
import { generateMobilityRoutine } from '@/lib/generators/mobility';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createServerSupabaseClient();

  const [{ data: dbExercises }, { data: dbMobility }] = supabase
    ? await Promise.all([
        supabase.from('exercises').select('name, muscle_groups, equipment_needed, category').limit(8),
        supabase.from('mobility_drills').select('name, target_area, duration_seconds').limit(6),
      ])
    : [{ data: null }, { data: null }];

  const workout = generateWorkout({
    goal: 'MMA Performance',
    equipment: ['bodyweight', 'dumbbell', 'machine', 'cable', 'smith machine'],
    durationMinutes: 45,
    musclePriorities: ['back', 'legs', 'core', 'shoulders'],
    recoveryScore: 76,
    recentExerciseNames: ['Push-Up'],
  });

  const mobility = generateMobilityRoutine(['hips', 'ankles', 'thoracic spine'], 5);
  const libraryCount = dbExercises?.length ?? workout.exercises.length;
  const mobilityCount = dbMobility?.length ?? mobility.drills.length;

  return (
    <main className="min-h-screen bg-forge-bg px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-200/80">ForgeFit Phase 1</p>
            <h1 className="text-3xl font-black tracking-tight">Today&apos;s training</h1>
          </div>
          <div className="rounded-2xl bg-orange-500 px-3 py-2 text-sm font-bold text-black">Supabase</div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<HeartPulse size={18} />} label="Recovery" value="76" />
          <Stat icon={<Flame size={18} />} label="Exercise DB" value={`${libraryCount}+`} />
          <Stat icon={<Dumbbell size={18} />} label="Split" value="MMA hybrid" />
          <Stat icon={<Trophy size={18} />} label="Mobility DB" value={`${mobilityCount}+`} />
        </div>

        <section className="rounded-3xl border border-white/10 bg-forge-card p-5 shadow-2xl">
          <p className="text-sm font-semibold text-orange-300">Generated workout</p>
          <h2 className="mt-1 text-2xl font-black">{workout.title}</h2>
          <p className="mt-2 text-sm text-zinc-300">{workout.recoveryAdjustment}</p>
          <div className="mt-4 flex flex-col gap-3">
            {workout.exercises.map((exercise) => (
              <article key={exercise.name} className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{exercise.name}</h3>
                    <p className="text-xs text-zinc-400">{exercise.muscles.join(' • ')}</p>
                  </div>
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-200">{exercise.sets} x {exercise.reps}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">Rest {exercise.restSeconds}s • {exercise.category}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Supabase library preview</p>
          <h2 className="mt-1 text-xl font-black">Database connected</h2>
          <div className="mt-4 flex flex-col gap-2">
            {(dbExercises ?? []).slice(0, 5).map((exercise) => (
              <div key={exercise.name} className="rounded-2xl bg-black/25 px-4 py-3">
                <p className="font-semibold">{exercise.name}</p>
                <p className="text-xs text-zinc-400">{exercise.muscle_groups?.join(' • ')}</p>
              </div>
            ))}
            {!dbExercises?.length && <p className="text-sm text-zinc-400">Add Supabase environment variables in Vercel to load database rows here.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Mobility routine</p>
          <h2 className="mt-1 text-xl font-black">{mobility.title}</h2>
          <div className="mt-4 flex flex-col gap-2">
            {mobility.drills.map((drill) => (
              <div key={drill.name} className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3">
                <div>
                  <p className="font-semibold">{drill.name}</p>
                  <p className="text-xs text-zinc-400">{drill.target}</p>
                </div>
                <p className="text-sm text-orange-200">{drill.durationSeconds}s</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-orange-300">{icon}</div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
