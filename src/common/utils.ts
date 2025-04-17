import jwtDecode from 'jwt-decode';

export interface JwtPayload {
  ref?: string;
  exp: number;
  sub?: string;
  iss?: string;
  [key: string]: any;
}

/**
 * JWTトークンをデコードしてプロジェクト参照を抽出する
 * @param apiKey Supabase API Key
 * @returns プロジェクト参照とデコードされたペイロード
 */
export function decodeJwtAndGetProjectRef(apiKey: string): { projectRef: string; payload: JwtPayload } {
  try {
    const payload = jwtDecode<JwtPayload>(apiKey);
    const projectRef = payload.ref ||
      (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
      (payload.iss ? payload.iss.split('/')?.[3] : undefined);

    if (!projectRef) {
      throw new Error('プロジェクト参照を特定できませんでした');
    }

    return { projectRef, payload };
  } catch (e) {
    throw new Error('無効な Supabase API Key');
  }
}

/**
 * APIキーからBearerプレフィックスを削除する
 * @param apiKey 元のAPIキー
 * @returns クリーンなAPIキー
 */
export function cleanApiKey(apiKey: string): string {
  return apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;
}

/**
 * JWTトークンの有効期限をチェックする
 * @param payload JWTペイロード
 * @returns 有効期限切れの場合はtrue
 */
export function isTokenExpired(payload: JwtPayload): boolean {
  return payload.exp < Date.now() / 1000;
}

export const buttonStyles = {
  primary: {
    padding: '4px 8px',
    backgroundColor: '#3ECF8E',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  secondary: {
    padding: '4px 8px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  small: {
    marginLeft: '4px',
    padding: '0px 4px',
    backgroundColor: '#f0f0f0',
    color: '#555',
    border: '1px solid #ddd',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '9px',
    verticalAlign: 'middle'
  }
};
