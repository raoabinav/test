import jwtDecode from 'jwt-decode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface JwtPayload { exp: number; ref: string; }

export interface RlsCheckResult {
  table: string;
  rlsDisabled: boolean;
  errorMessage?: string;
}

export async function checkRls(
  supabaseUrl: string,
  supabaseKey: string,
  tables: string[]
): Promise<RlsCheckResult[]> {
  let payload: JwtPayload;
  try {
    payload = jwtDecode(supabaseKey);
  } catch {
    throw new Error('無効な Supabase API Key');
  }
  if (payload.exp < Date.now()/1000) {
    throw new Error('API Key 有効期限切れ');
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
  const results: RlsCheckResult[] = [];

  for (const table of tables) {
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        const permErr = status === 401 || status === 403 ||
          /permission|unauthorized/i.test(error.message);
        results.push({
          table,
          rlsDisabled: !permErr,
          errorMessage: error.message
        });
      } else {
        results.push({ table, rlsDisabled: true });
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
