import jwtDecode from 'jwt-decode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// JWTペイロードの型定義を拡張
interface JwtPayload {
  ref?: string;
  exp: number;
  sub?: string;
  iss?: string;
  [key: string]: any; // その他の可能性のあるプロパティ
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
  console.log(`RLSチェック開始: ${tables.length}件のテーブルをチェックします`);

  let payload: JwtPayload;
  let projectRef: string | undefined;

  try {
    console.log('APIキーをデコードします');
    payload = jwtDecode(supabaseKey);
    console.log('APIキーデコード成功:', payload);
    console.log('ペイロードの内容:', JSON.stringify(payload, null, 2));

    // プロジェクト参照を取得（従来のrefプロパティまたは新しい構造から）
    projectRef = payload.ref ||
      (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
      (payload.iss ? payload.iss.split('/')?.[3] : undefined);
    console.log('プロジェクト参照:', projectRef);

    if (!projectRef) {
      console.error('プロジェクト参照を特定できませんでした');
      throw new Error('プロジェクト参照を特定できませんでした');
    }

    console.log('APIキーデコード成功:', {
      ref: projectRef,
      exp: new Date(payload.exp * 1000).toISOString()
    });
  } catch (e) {
    console.error('APIキーデコード失敗:', e);
    throw new Error('無効な Supabase API Key');
  }

  if (payload.exp < Date.now() / 1000) {
    console.error('APIキー期限切れ:', new Date(payload.exp * 1000).toISOString());
    throw new Error('API Key 有効期限切れ');
  }


  console.log('Supabaseクライアントを作成します:', `https://${payload.ref}.supabase.co`, supabaseKey);
  const supabase: SupabaseClient = createClient(`https://${payload.ref}.supabase.co`, supabaseKey);
  const results: RlsCheckResult[] = [];

  for (const table of tables) {
    console.log(`テーブル "${table}" のRLSをチェックしています...`);
    try {
      console.log(`"${table}" にクエリを実行します`);
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(30);

      if (data && data.length >= 30) {
        console.log(`"${table}" のデータが30件以上あります`);
        results.push({
          table,
          rlsDisabled: true,
        });
      }
    } catch (e) {
      console.error(`"${table}" で例外が発生:`, e);
      results.push({
        table,
        rlsDisabled: false,
        errorMessage: `例外発生: ${(e as Error).message}`
      });
    }
  }

  console.log('RLSチェック完了:', results.length, '件のテーブルをチェックしました');
  return results;
}
