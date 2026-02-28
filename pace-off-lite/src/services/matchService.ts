import type { TablesInsert } from '@/types/database.types';
import { supabase } from '@/utils/supabase';

type MatchResultInsert = TablesInsert<'match_results'>;

type InsertMatchResultParams = {
  matchId: string;
  userId: string;
  totalDistanceMeters: number;
  finishedAt?: string;
};

export const insertMatchResult = async ({
  matchId,
  userId,
  totalDistanceMeters,
  finishedAt,
}: InsertMatchResultParams) => {
  const payload: MatchResultInsert = {
    match_id: matchId,
    user_id: userId,
    total_distance_meters: totalDistanceMeters,
    progress_value: totalDistanceMeters,
    finished_at: finishedAt ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('match_results')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

