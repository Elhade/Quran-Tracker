'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { authSignUp } from '@/services/auth.service';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authSignUp(form.email, form.password, form.nom, form.prenom);
      router.push('/profile');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/profile" className="text-[#9c9890]">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-[18px] font-bold text-[#1a1714]">Creer un compte</h1>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2ddd6] p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom"
              value={form.nom}
              onChange={set('nom')}
              required
              className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
            />
            <input
              type="text"
              placeholder="Prenom"
              value={form.prenom}
              onChange={set('prenom')}
              required
              className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
            />
            <input
              type="email"
              placeholder="Adresse e-mail"
              value={form.email}
              onChange={set('email')}
              required
              className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-[#e2ddd6] text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none focus:border-[#c92b2b] transition-colors"
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={form.confirm}
              onChange={set('confirm')}
              required
              className={`w-full px-4 py-3 rounded-xl border text-[14px] text-[#1a1714] placeholder:text-[#c4bfb8] outline-none transition-colors ${
                error && error.includes('correspondent') ? 'border-[#c92b2b]' : 'border-[#e2ddd6] focus:border-[#c92b2b]'
              }`}
            />
            {error && <p className="text-[12px] text-[#c92b2b] -mt-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #c92b2b, #b8841a)' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Creer mon compte
            </button>
          </form>
          <p className="text-[13px] text-[#9c9890] text-center mt-4">
            Deja un compte ?{' '}
            <Link href="/profile" className="font-semibold text-[#c92b2b]">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
