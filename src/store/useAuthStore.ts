'use client';
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { pushLocalToSupabase, pushLocalSections } from '../services/sync.service';
import { addRevisionLog, upsertDailyProgress, getProfile } from '../lib/supabase/queries';
import { localGetDailyProgress } from '../lib/providers/LocalTrackerProvider';
import { LOCAL_USER_ID } from '../config/features';
import type { DbProfile } from '../types/database.dto';
import { useTrackerStore } from './useTrackerStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  loading: boolean;
  syncing: boolean;
  lastSynced: Date | null;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  syncing: false,
  lastSynced: null,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      const profile = user ? await getProfile(user.id) : null;
      set({ session, user, profile, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      set({ session, user, loading: false });

      if (event === 'SIGNED_IN' && user) {
        set({ syncing: true });
        try {
          const profile = await getProfile(user.id);
          set({ profile });
          if (profile) {
            await pushLocalToSupabase(user.id);
            set({ lastSynced: new Date() });
          }
        } catch (e) {
          console.error('[sync] push local failed:', e);
        } finally {
          set({ syncing: false });
        }
      }

      if (event === 'INITIAL_SESSION' && user) {
        try {
          const profile = await getProfile(user.id);
          set({ profile });
          if (profile) {
            await pushLocalSections(user.id);
            set({ lastSynced: new Date() });
          }
        } catch (e) {
          console.error('[sync] initial session sync failed:', e);
        }
      }

      if (event === 'SIGNED_OUT') {
        set({ profile: null, lastSynced: null });
      }
    });

    // Real-time sync: watch tracker store for new revisions and section changes
    const unsubTracker = useTrackerStore.subscribe(async (state, prevState) => {
      const { user: currentUser, profile: currentProfile } = get();
      if (!currentUser || !currentProfile) return;

      // Sync new revisions + today's daily_progress
      if (state.revisions !== prevState.revisions && state.revisions.length > prevState.revisions.length) {
        const prevIds = new Set(prevState.revisions.map(r => r.id));
        const newRevs = state.revisions.filter(r => !prevIds.has(r.id));
        const modesAffected = new Set<string>();
        for (const rev of newRevs) {
          addRevisionLog({
            userId: currentUser.id,
            modeKey: rev.modeKey,
            sectionType: rev.sectionType,
            sectionId: rev.sectionId,
            revisionDate: rev.revisionDate,
            cycleId: rev.cycleId,
            difficultyAtRevision: rev.difficultyAtRevision,
            sourceAction: rev.sourceAction,
          }).catch(() => {});
          modesAffected.add(rev.modeKey);
        }
        // Sync today's daily_progress for affected modes
        for (const modeKey of Array.from(modesAffected)) {
          const dp = localGetDailyProgress(LOCAL_USER_ID, modeKey, 1)[0];
          if (dp) upsertDailyProgress({ ...dp, userId: currentUser.id }).catch(() => {});
        }
        set({ lastSynced: new Date() });
      }

      // Sync section metadata changes (difficulty, multiplier, notes)
      if (state.sections !== prevState.sections) {
        pushLocalSections(currentUser.id)
          .then(() => set({ lastSynced: new Date() }))
          .catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubTracker();
    };
  },
}));
