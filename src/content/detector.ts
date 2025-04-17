// コンテンツスクリプトでSupabaseリクエストを検知する機能
const supabaseElements = document.querySelectorAll('[data-supabase]');

// Fetch APIをインターセプトしてSupabaseリクエストを検知
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : input.toString();
  
  if (url.includes('.supabase.co/rest/v1/')) {
    const headers = init?.headers || (input instanceof Request ? input.headers : new Headers());
    let apiKey: string | null = null;
    
    if (headers instanceof Headers) {
      apiKey = headers.get('apikey') || headers.get('Authorization');
    } else if (typeof headers === 'object') {
      apiKey = (headers as Record<string, string>)['apikey'] || 
               (headers as Record<string, string>)['Apikey'] || 
               (headers as Record<string, string>)['APIKey'] || 
               (headers as Record<string, string>)['Authorization'];
    }
    
    if (apiKey) {
      // "Bearer "プレフィックスを削除
      const cleanApiKey = apiKey.startsWith('Bearer ') ? apiKey.substring(7) : apiKey;
      
      // バックグラウンドスクリプトに通知
      chrome.runtime.sendMessage({
        action: 'supabaseRequestDetected',
        url,
        apiKey: cleanApiKey
      });
    }
  }
  
  // 元のfetch関数を呼び出す
  return originalFetch.apply(this, [input, init]);
};

// XMLHttpRequestをインターセプトしてSupabaseリクエストを検知
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(
  method: string, 
  url: string | URL, 
  async: boolean = true, 
  username?: string | null, 
  password?: string | null
) {
  const urlString = url.toString();
  
  // このXHRインスタンスにURLを保存
  (this as any)._supabaseUrl = urlString;
  
  // 元のopen関数を呼び出す
  return originalXhrOpen.call(this, method, url, async, username, password);
};

const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
  // APIキーヘッダーを検出
  if ((name.toLowerCase() === 'apikey' || name.toLowerCase() === 'authorization') && 
      (this as any)._supabaseUrl && 
      (this as any)._supabaseUrl.includes('.supabase.co/rest/v1/')) {
    
    // "Bearer "プレフィックスを削除
    const cleanApiKey = value.startsWith('Bearer ') ? value.substring(7) : value;
    
    // バックグラウンドスクリプトに通知
    chrome.runtime.sendMessage({
      action: 'supabaseRequestDetected',
      url: (this as any)._supabaseUrl,
      apiKey: cleanApiKey
    });
  }
  
  // 元のsetRequestHeader関数を呼び出す
  return originalXhrSetRequestHeader.apply(this, [name, value]);
};

// バックグラウンドスクリプトからのメッセージを受信するリスナーを追加
chrome.runtime.onMessage.addListener((message) => {
  // RLSチェック結果を処理
  if (message.action === 'rlsCheckResult') {
  }
});
