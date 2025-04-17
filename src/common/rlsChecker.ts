import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JwtPayload, decodeJwtAndGetProjectRef, isTokenExpired } from './utils';
import { TABLES } from './constants';

interface RlsCheckResult {
  table: string;
  rlsDisabled: boolean;
  errorMessage?: string;
}

/**
 * Function to check RLS for a single table
 */
async function checkTableRls(supabase: SupabaseClient, table: string): Promise<RlsCheckResult> {
  try {
    const { data } = await supabase
      .from(table)
      .select('*')
      .limit(30);

    if (data && data.length >= 30) {
      return { table, rlsDisabled: true };
    }

    return { table, rlsDisabled: false };
  } catch (e) {
    return { table, rlsDisabled: false, errorMessage: `Exception: ${(e as Error).message}` };
  }
}

export async function checkRls(supabaseKey: string): Promise<RlsCheckResult[]> {
  let payload: JwtPayload;
  let projectRef: string;

  try {
    const result = decodeJwtAndGetProjectRef(supabaseKey);
    payload = result.payload;
    projectRef = result.projectRef;
  } catch (e) {
    throw new Error('Invalid Supabase API Key');
  }

  if (isTokenExpired(payload)) {
    throw new Error('API Key expired');
  }

  const supabase: SupabaseClient = createClient(`https://${projectRef}.supabase.co`, supabaseKey);

  // すべてのテーブルに対するRLSチェックを並列で実行
  const checkPromises = TABLES.map(table => checkTableRls(supabase, table));
  const results = await Promise.all(checkPromises);

  return results;
}
