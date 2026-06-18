import { supabase } from '../lib/supabase/client';

export async function authSignUp(email: string, password: string, nom: string, prenom: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      nom,
      prenom,
      display_name: `${prenom} ${nom}`,
      avatar_initials: ((prenom[0] ?? '') + (nom[0] ?? '')).toUpperCase(),
    });
    if (profileError) throw profileError;
  }

  return data;
}

export async function authSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function authSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
