'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type AthleteProfile = {
  training_experience: string;
  fitness_level: string;
  training_background: string;
  cardio_level: string;
  mobility_level: string;
  limitations: string[];
};

const defaultProfile: AthleteProfile = {
  training_experience: 'Intermediate',
  fitness_level: 'Active',
  training_background: 'General Fitness',
  cardio_level: 'Good',
  mobility_level: 'Good',
  limitations: ['None'],
};

const trainingExperiences = ['Beginner', 'Intermediate', 'Advanced', 'Competitive Athlete'];
const fitnessLevels = ['Deconditioned', 'Average', 'Active', 'Athletic', 'Highly Athletic'];
const backgrounds = ['General Fitness', 'Bodybuilding', 'Powerlifting', 'Running', 'MMA', 'BJJ', 'Wrestling', 'Boxing', 'Football', 'Basketball', 'Other'];
const levelOptions = ['Poor', 'Average', 'Good', 'Excellent'];
const limitationOptions = ['Shoulder Issues', 'Knee Issues', 'Back Issues', 'Ankle Issues', 'None'];

function getAthleteTier(profile: AthleteProfile) {
  let tier = 3;
  if (profile.training_experience === 'Beginner' || profile.fitness_level === 'Deconditioned') tier = 1;
  else if (profile.fitness_level === 'Average') tier = 2;
  else if (profile.fitness_level === 'Active') tier = 3;
  else if (profile.fitness_level === 'Athletic' || profile.training_experience === 'Advanced') tier = 4;
  if (profile.fitness_level === 'Highly Athletic' || profile.training_experience === 'Competitive Athlete') tier = 5;
  return ['','Tier 1 Beginner','Tier 2 General Fitness','Tier 3 Active','Tier 4 Athletic','Tier 5 Competitive Athlete'][tier];
}

export default function AthleteProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfile>(defaultProfile);
  const [message, setMessage] = useState('Loading profile...');

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        setMessage('Sign in on the main ForgeFit page first.');
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? null);
      const { data, error } = await supabase
        .from('profiles')
        .select('training_experience,fitness_level,training_background,cardio_level,mobility_level,limitations')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        setMessage(`Profile load failed: ${error.message}`);
        return;
      }
      if (data) {
        setProfile({
          ...defaultProfile,
          ...data,
          limitations: Array.isArray(data.limitations) && data.limitations.length ? data.limitations : ['None'],
        });
      }
      setMessage('Profile loaded. Update it, then save.');
    }
    load();
  }, [supabase]);

  function update<K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) {
    setProfile((old) => ({ ...old, [key]: value }));
  }

  function toggleLimitation(value: string) {
    if (value === 'None') return update('limitations', ['None']);
    const next = profile.limitations.includes(value)
      ? profile.limitations.filter((x) => x !== value)
      : [...profile.limitations.filter((x) => x !== 'None'), value];
    update('limitations', next.length ? next : ['None']);
  }

  async function saveProfile() {
    if (!userId) return setMessage('You must sign in first.');
    const { error } = await supabase.from('profiles').update(profile).eq('id', userId);
    setMessage(error ? `Profile save failed: ${error.message}` : `Profile saved. ${getAthleteTier(profile)} will be used by the next generator wiring update.`);
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-6 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-20">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">ForgeFit Profile</p>
          <h1 className="mt-1 text-3xl font-black">Athlete Profile</h1>
          <p className="mt-2 text-sm text-zinc-300">This is the profile system for tailoring difficulty, fat-loss style, mobility, and sport focus.</p>
          <p className="mt-2 text-xs text-zinc-400">Signed in as {email ?? 'not signed in'}</p>
          <Link href="/" className="mt-4 inline-block rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">Back to ForgeFit</Link>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-orange-300">Current tier</p>
          <h2 className="mt-1 text-2xl font-black">{getAthleteTier(profile)}</h2>
          <p className="mt-2 text-sm text-zinc-300">Beginner users should get easier movements. Athletic users should get harder bodyweight, calisthenics, and conditioning options.</p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <Select label="Training experience" value={profile.training_experience} options={trainingExperiences} onChange={(v) => update('training_experience', v)} />
          <Select label="Fitness level" value={profile.fitness_level} options={fitnessLevels} onChange={(v) => update('fitness_level', v)} />
          <Select label="Training background" value={profile.training_background} options={backgrounds} onChange={(v) => update('training_background', v)} />
          <Select label="Cardio level" value={profile.cardio_level} options={levelOptions} onChange={(v) => update('cardio_level', v)} />
          <Select label="Mobility level" value={profile.mobility_level} options={levelOptions} onChange={(v) => update('mobility_level', v)} />

          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Limitations</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {limitationOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleLimitation(item)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${profile.limitations.includes(item) ? 'bg-orange-500 text-black' : 'bg-white/10 text-zinc-200'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveProfile} className="mt-5 w-full rounded-2xl bg-orange-500 px-4 py-4 font-black text-black">Save Profile</button>
          <p className="mt-3 text-sm text-orange-200">{message}</p>
        </section>
      </section>
    </main>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block rounded-2xl bg-black/25 p-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
