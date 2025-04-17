import jwtDecode from 'jwt-decode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface JwtPayload {
  ref?: string;
  exp: number;
  sub?: string;
  iss?: string;
  [key: string]: any;
}

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
  let projectRef: string | undefined;

  try {
    payload = jwtDecode(supabaseKey);
    projectRef = payload.ref ||
      (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
      (payload.iss ? payload.iss.split('/')?.[3] : undefined);

    if (!projectRef) {
      throw new Error('プロジェクト参照を特定できませんでした');
    }
  } catch (e) {
    throw new Error('無効な Supabase API Key');
  }

  if (payload.exp < Date.now() / 1000) {
    throw new Error('API Key 有効期限切れ');
  }

  const supabase: SupabaseClient = createClient(`https://${payload.ref}.supabase.co`, supabaseKey);
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
