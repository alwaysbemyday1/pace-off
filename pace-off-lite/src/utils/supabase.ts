import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import type { Database, TablesInsert } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
});

type UserInsert = TablesInsert<'users'>;

export const ensureUserProfile = async (user: User) => {
  const nicknameFallback = user.email?.split('@')[0] || 'Runner';

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { error };
  }

  if (data) {
    return { error: null };
  }

  const payload: UserInsert = {
    id: user.id,
    nickname: nicknameFallback,
  };

  const { error: insertError } = await supabase.from('users').insert(payload);

  return { error: insertError ?? null };
};


