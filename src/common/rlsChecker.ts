import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JwtPayload, decodeJwtAndGetProjectRef, isTokenExpired } from './utils';

export interface RlsCheckResult {
  table: string;
  rlsDisabled: boolean;
  errorMessage?: string;
}

export async function checkRls(
  supabaseKey: string,
  tables: string[]
): Promise<RlsCheckResult[]> {
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
  const results: RlsCheckResult[] = [];

  for (const table of tables) {
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(30);

      if (data && data.length >= 30) {
        results.push({
          table,
          rlsDisabled: true,
        });
      }
    } catch (e) {
      results.push({
        table,
        rlsDisabled: false,
        errorMessage: `例外発生: ${(e as Error).message}`
      });
    }
  }

  return results;
}
