'use client';
import { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTrackerStore } from '@/store/useTrackerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { authSignIn, authSignOut } from '@/services/auth.service';
import { BookOpen, Brain, Trash2, ChevronRight, LogIn, LogOut, Loader2, CheckCircle2, CloudOff } from 'lucide-react';
import Link from 'next/link';

function formatSyncTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `aujourd'hui à ${h}:${m}`;
}

export default function ProfilePage() {
  const { settings, reset } = useSettingsStore();
  const { getTotalRevisionCount } = useTrackerStore();
  const { user, profile, syncing, lastSynced } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lectureCount = getTotalRevisionCount('lecture');
  const memoCount = getTotalRevisionCount('memorisation');

  const handleReset = () => {
    if (confirm('Effacer toutes les donnees ? Cette action est irreversible.')) {
      reset();
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('qt:'));
        keys.forEach(k => localStorage.removeItem(k));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authSignIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authSignOut();
  };

  const initials = profile?.avatar_initials || (user?.email ? user.email[0].toUpperCase() : 'U');
  const displayName = profile?.display_name || user?.email || 'Utilisateur';
  const subtitle = user ? (user.email ?? 'Connecte') : 'Mode local';

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-6">
        <div className="mb-6">
          <h1 className="text-[18px] font-bold text-[#1a1714]">Profil</h1>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-5 mb-3 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c92b2b, #b8841a)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-[#1a1714] truncate">{displayName}</p>
            <p className="text-[12px] text-[#9c9890] mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>

        {/* Sync status banner */}
        {user && (
          <div
            className="rounded-xl px-3.5 py-2.5 mb-5 flex items-center gap-2"
            style={{
              background: syncing ? '#f5f3ef' : lastSynced ? '#1a7a3c12' : '#f5f3ef',
              border: `1px solid ${syncing ? '#e2ddd6' : lastSynced ? '#1a7a3c30' : '#e2ddd6'}`,
            }}
          >
            {syncing ? (
              <>
                <Loader2 size={13} className="animate-spin flex-shrink-0" style={{ color: '#9c9890' }} />
                <span className="text-[12px] text-[#9c9890]">Synchronisation en cours...</span>
              </>
            ) : lastSynced ? (
              <>
                <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: '#1a7a3c' }} />
                <span className="text-[12px]" style={{ color: '#1a7a3c' }}>
                  Synchronise · <span className="text-[#5c9070]">{formatSyncTime(lastSynced)}</span>
                </span>
              </>
            ) : (
              <>
                <CloudOff size={13} className="flex-shrink-0" style={{ color: '#9c9890' }} />
                <span className="text-[12px] text-[#9c9890]">Non synchronise</span>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} style={{ color: '#c92b2b' }} />
              <span className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Lecture</span>
            </div>
            <p className="text-[20px] font-bold text-[#1a1714]">{lectureCount}</p>
            <p className="text-[11px] text-[#9c9890]">revisions</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain size={14} style={{ color: '#1a5cd4' }} />
              <span className="text-[10px] font-bold text-[#9c9890] uppercase tracking-wide">Memorisation</span>
            </div>
            <p className="text-[20px] font-bold text-[#1a1714]">{memoCount}</p>
            <p className="text-[11px] text-[#9c9890]">revisions</p>
          </div>
        </div>

        {/* Config links */}
        <div className="bg-white rounded-2xl border border-[#e2ddd6] overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-[#f5f3ef] flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Configurer Lecture</span>
            <Link href="/config" className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#c92b2b' }}>
              Modifier <ChevronRight size={14} />
            </Link>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1a1714]">Configurer Memorisation</span>
            <Link href="/config" className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#1a5cd4' }}>
              Modifier <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 border border-[#c92b2b20] text-[#c92b2b] bg-[#c92b2b08] mb-5"
        >
          <Trash2 size={15} />
          Reinitialiser les donnees
        </button>

        {/* Auth block */}
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 border border-[#e2ddd6] text-[#9c9890] bg-white"
          >
            <LogOut size={15} />
            Se deconnecter
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e2ddd6] p-5">
            <p className="text-[15px] font-bold text-[#1a1714] mb-4">Se connecter</p>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
              />
              {error && <p className="text-[12px] text-[#c92b2b] -mt-1">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #c92b2b, #b8841a)' }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                Connexion
              </button>
            </form>
            <p className="text-[13px] text-[#9c9890] text-center mt-4">
              Pas de compte ?{' '}
              <Link href="/register" className="font-semibold text-[#c92b2b]">
                Creer un compte
              </Link>
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
