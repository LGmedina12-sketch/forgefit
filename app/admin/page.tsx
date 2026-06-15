'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  access_status: string;
  access_expires_at: string | null;
  access_notes: string | null;
  created_at: string;
};

function expiresIn(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [me, setMe] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [message, setMessage] = useState('Loading owner controls...');
  const [isLoading, setIsLoading] = useState(true);

  async function loadAdmin() {
    setIsLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setMessage('Sign in with the owner account first.');
      setIsLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,display_name,is_admin,access_status,access_expires_at,access_notes,created_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      setMessage(profileError?.message ?? 'Could not load your profile.');
      setIsLoading(false);
      return;
    }

    const currentProfile = profileData as Profile;
    setMe(currentProfile);

    if (!currentProfile.is_admin) {
      setMessage('Blocked. Only the owner account can manage access.');
      setIsLoading(false);
      return;
    }

    const { data: userRows, error: userError } = await supabase
      .from('profiles')
      .select('id,email,display_name,is_admin,access_status,access_expires_at,access_notes,created_at')
      .order('created_at', { ascending: false });

    if (userError) {
      setMessage(userError.message);
    } else {
      setUsers((userRows as Profile[]) ?? []);
      setMessage('Owner controls ready.');
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadAdmin();
  }, [supabase]);

  async function updateAccess(profile: Profile, status: string, days?: number) {
    if (!me?.is_admin) return;

    const updates = {
      access_status: status,
      access_expires_at: status === 'active' && days ? expiresIn(days) : status === 'active' ? null : profile.access_expires_at,
      access_notes: status === 'active' ? `Approved by Luis${days ? ` for ${days} days` : ''}` : `Set to ${status} by Luis`,
      approved_by: me.id,
      approved_at: status === 'active' ? new Date().toISOString() : profile.access_expires_at,
    };

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
    setMessage(error ? error.message : `${profile.email ?? profile.display_name ?? 'User'} is now ${status}.`);
    await loadAdmin();
  }

  async function recordCash(profile: Profile, amount: number, days: number) {
    if (!me?.is_admin) return;

    const start = new Date();
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const { error: paymentError } = await supabase.from('access_payments').insert({
      user_id: profile.id,
      amount,
      method: 'cash',
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      notes: 'Cash payment recorded by Luis',
      recorded_by: me.id,
    });

    if (paymentError) {
      setMessage(paymentError.message);
      return;
    }

    await updateAccess(profile, 'active', days);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (isLoading) {
    return <main className="min-h-screen bg-forge-bg px-4 py-8 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-6"><p className="text-orange-300">Loading...</p></section></main>;
  }

  if (!me?.is_admin) {
    return (
      <main className="min-h-screen bg-forge-bg px-4 py-8 text-white">
        <section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-forge-card p-6 shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">ForgeFit</p>
          <h1 className="mt-3 text-3xl font-black">Owner only</h1>
          <p className="mt-3 text-sm text-zinc-300">{message}</p>
          <a href="/" className="mt-5 block rounded-2xl bg-orange-500 px-4 py-4 text-center font-black text-black">Back to app</a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-forge-bg px-4 py-5 text-white">
      <section className="mx-auto flex max-w-md flex-col gap-5 pb-24">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">Owner tab</p>
          <h1 className="mt-2 text-3xl font-black">Access control</h1>
          <p className="mt-2 text-sm text-zinc-300">Approve cash users, pause access, or block accounts.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href="/" className="rounded-2xl bg-orange-500 px-4 py-3 text-center font-black text-black">Back</a>
            <button onClick={signOut} className="rounded-2xl bg-white/10 px-4 py-3 font-black">Sign out</button>
          </div>
        </header>

        <div className="rounded-2xl bg-black/30 p-4 text-sm text-orange-200">{message}</div>

        <section className="flex flex-col gap-3">
          {users.map((profile) => (
            <article key={profile.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">{profile.email ?? profile.display_name ?? 'No email'}</h2>
                  <p className="mt-1 text-xs text-zinc-400">Status: {profile.access_status}{profile.is_admin ? ' · owner/admin' : ''}</p>
                  <p className="text-xs text-zinc-500">Expires: {profile.access_expires_at ? new Date(profile.access_expires_at).toLocaleDateString() : 'none'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${profile.access_status === 'active' ? 'bg-green-500/20 text-green-200' : profile.access_status === 'banned' ? 'bg-red-500/20 text-red-200' : 'bg-white/10 text-zinc-200'}`}>{profile.access_status}</span>
              </div>

              {profile.access_notes && <p className="mt-3 rounded-2xl bg-black/25 p-3 text-xs text-zinc-300">{profile.access_notes}</p>}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => recordCash(profile, 20, 30)} className="rounded-xl bg-white px-3 py-3 text-xs font-black text-black">Cash $20 / 30d</button>
                <button onClick={() => updateAccess(profile, 'active', 90)} className="rounded-xl bg-orange-500 px-3 py-3 text-xs font-black text-black">Activate 90d</button>
                <button onClick={() => updateAccess(profile, 'paused')} className="rounded-xl bg-white/10 px-3 py-3 text-xs font-black">Pause</button>
                <button onClick={() => updateAccess(profile, 'banned')} className="rounded-xl bg-red-500/20 px-3 py-3 text-xs font-black text-red-100">Block</button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
