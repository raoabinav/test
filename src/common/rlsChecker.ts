import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JwtPayload, decodeJwtAndGetProjectRef, isTokenExpired } from './utils';
import { TABLES } from './constants';

interface RlsCheckResult {
  table: string;
  rlsDisabled: boolean;
  errorMessage?: string;
}

/**
 * 単一テーブルのRLSチェックを実行する関数
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
    return { table, rlsDisabled: false, errorMessage: `例外発生: ${(e as Error).message}` };
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
    throw new Error('無効な Supabase API Key');
  }

  if (isTokenExpired(payload)) {
    throw new Error('API Key 有効期限切れ');
  }

  const supabase: SupabaseClient = createClient(`https://${projectRef}.supabase.co`, supabaseKey);

  // すべてのテーブルに対するRLSチェックを並列で実行
  const checkPromises = TABLES.map(table => checkTableRls(supabase, table));
  const results = await Promise.all(checkPromises);

  return results;
}
