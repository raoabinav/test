import { checkRls, RlsCheckResult } from './common/rlsChecker'
import jwtDecode from 'jwt-decode';

// webRequestリスナーをバックグラウンドスクリプトに移動
chrome.webRequest.onBeforeSendHeaders.addListener(
  (info) => {
    const apiKey = info.requestHeaders?.find(h=>h.name.toLowerCase()==='apikey')?.value;
    if (!apiKey) return;

    let payload: { ref: string; exp: number };
    try { payload = jwtDecode(apiKey); }
    catch { return; }

    const supabaseUrl = `https://${payload.ref}.supabase.co`;
    chrome.storage.session.set({ supabaseUrl, supabaseKey: apiKey }).then(() => {
      chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
        if (!rlsPrompted && info.tabId) {
          chrome.scripting.executeScript({
            target: { tabId: info.tabId },
            files: ['src/content/ui.js']
          });
        }
      });
    });
    
    return;
  },
  { urls: ['*://*.supabase.co/*'] },
  ['requestHeaders']
);

// 既存のメッセージハンドラ
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action !== 'execute') return;
  try {
    const results: RlsCheckResult[] = await checkRls(msg.supabaseUrl, msg.supabaseKey, msg.tables);
    const disabledTables = results.filter(r => r.rlsDisabled);
    console.log('RLS 無効テーブル:', disabledTables);
    
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'rlsCheckResult',
        disabledTables,
        success: true
      });
    }
  } catch (e) {
    console.error('RLSチェック失敗:', (e as Error).message);
    
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'rlsCheckResult',
        error: (e as Error).message,
        success: false
      });
    }
  }
});
