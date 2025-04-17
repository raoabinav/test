import { checkRls } from './common/rlsChecker'
import jwtDecode from 'jwt-decode';

// JWTペイロードの型定義を拡張
interface JwtPayload {
  ref?: string;
  exp: number;
  sub?: string;
  iss?: string;
  [key: string]: any; // その他の可能性のあるプロパティ
}

// webRequestリスナーをバックグラウンドスクリプトに移動
chrome.webRequest.onBeforeSendHeaders.addListener(
  (info) => {
    // Supabaseリクエストかどうかを確認（URLパターンで判断）
    if (info.url.includes('.supabase.co/rest/v1/')) {
      console.log('Supabaseリクエスト検知:', info.url);

      // APIキーの検出（複数のヘッダー名をチェック）
      const cleanApiKey = info.requestHeaders?.find(h =>
        h.name.toLowerCase() === 'apikey'
      )?.value;


      if (!cleanApiKey) {
        console.log('APIキーが見つかりませんでした');
        return;
      }
      console.log('APIキーを検出しました');

      let payload: JwtPayload;
      let projectRef: string | undefined;

      try {
        payload = jwtDecode(cleanApiKey);
        console.log('APIキーのデコードに成功:', payload);
        console.log('ペイロードの内容:', JSON.stringify(payload, null, 2));

        // プロジェクト参照を取得（従来のrefプロパティまたは新しい構造から）
        projectRef = payload.ref ||
          (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
          (payload.iss ? payload.iss.split('/')?.[3] : undefined);
        console.log('プロジェクト参照:', projectRef);

        if (!projectRef) {
          console.error('プロジェクト参照を特定できませんでした');
          return;
        }
      }
      catch (e) {
        console.error('APIキーのデコードに失敗:', e);
        return;
      }

      const supabaseUrl = `https://${projectRef}.supabase.co`;
      console.log('Supabase URL設定:', supabaseUrl);
      chrome.storage.session.set({ supabaseUrl, supabaseKey: cleanApiKey }).then(() => {
        console.log('セッションストレージに保存完了');
        chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
          console.log('RLSプロンプト状態:', rlsPrompted ? 'すでに表示済み' : '未表示');
          if (!rlsPrompted && info.tabId) {
            console.log('UIスクリプトを実行します:', info.tabId);
            chrome.scripting.executeScript({
              target: { tabId: info.tabId },
              files: ['src/content/ui.js']
            }).then(() => {
              console.log('UIスクリプト実行完了');
            }).catch(e => {
              console.error('UIスクリプト実行エラー:', e);
            });
          }
        });
      }).catch(e => {
        console.error('セッションストレージ保存エラー:', e);
      });

      return;
    } else {
      // Supabaseリクエストでない場合は何もしない
      return;
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// メッセージハンドラ
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('メッセージを受信:', msg.action);

  // Supabaseデータ取得メッセージを処理
  if (msg.action === 'getSupabaseData') {
    console.log('Supabaseデータ取得リクエストを受信');
    chrome.storage.session.get(['supabaseUrl', 'supabaseKey'])
      .then(data => {
        console.log('セッションストレージからデータを取得:', data.supabaseUrl ? '成功' : '失敗');
        sendResponse(data);
      })
      .catch(e => {
        console.error('セッションストレージ取得エラー:', e);
        sendResponse({ error: e.message });
      });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }

  // rlsPromptedフラグ設定メッセージを処理
  if (msg.action === 'setRlsPrompted') {
    console.log('rlsPromptedフラグ設定リクエストを受信:', msg.value);
    chrome.storage.session.set({ rlsPrompted: msg.value })
      .then(() => {
        console.log('rlsPromptedフラグを設定しました:', msg.value);
        sendResponse({ success: true });
      })
      .catch(e => {
        console.error('rlsPromptedフラグ設定エラー:', e);
        sendResponse({ error: e.message });
      });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }

  // コンテンツスクリプトからのSupabaseリクエスト検知メッセージを処理
  if (msg.action === 'supabaseRequestDetected') {
    console.log('コンテンツスクリプトからSupabaseリクエスト検知:', msg.url);

    if (!msg.apiKey) {
      console.log('APIキーが見つかりませんでした');
      return;
    }

    let payload: JwtPayload;
    let projectRef: string | undefined;

    try {
      payload = jwtDecode(msg.apiKey);
      console.log('APIキーのデコードに成功:', payload);
      console.log('ペイロードの内容:', JSON.stringify(payload, null, 2));

      // プロジェクト参照を取得（従来のrefプロパティまたは新しい構造から）
      projectRef = payload.ref ||
        (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
        (payload.iss ? payload.iss.split('/')?.[3] : undefined);
      console.log('プロジェクト参照:', projectRef);

      if (!projectRef) {
        console.error('プロジェクト参照を特定できませんでした');
        return;
      }
    }
    catch (e) {
      console.error('APIキーのデコードに失敗:', e);
      return;
    }

    const supabaseUrl = `https://${projectRef}.supabase.co`;
    console.log('Supabase URL設定:', supabaseUrl);
    chrome.storage.session.set({ supabaseUrl, supabaseKey: msg.apiKey }).then(() => {
      console.log('セッションストレージに保存完了');
      chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
        console.log('RLSプロンプト状態:', rlsPrompted ? 'すでに表示済み' : '未表示');
        if (!rlsPrompted && sender.tab && sender.tab.id) {
          console.log('UIスクリプトを実行します:', sender.tab.id);
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: ['src/content/ui.js']
          }).then(() => {
            console.log('UIスクリプト実行完了');
          }).catch(e => {
            console.error('UIスクリプト実行エラー:', e);
          });
        }
      });
    }).catch(e => {
      console.error('セッションストレージ保存エラー:', e);
    });

    return;
  }

  // RLSチェック実行メッセージを処理
  if (msg.action === 'execute') {
    console.log('RLSチェック開始:', {
      url: msg.supabaseUrl,
      tablesCount: msg.tables.length
    });

    // 非同期処理を開始
    checkRls(msg.supabaseKey, msg.tables)
      .then(results => {
        console.log('RLSチェック完了:', results.length, '件のテーブルをチェックしました');

        const disabledTables = results.filter(r => r.rlsDisabled);
        console.log('RLS 無効テーブル:', disabledTables.length, '件');
        disabledTables.forEach(table => {
          console.log(`- ${table.table} (RLS無効)`);
        });

        if (sender.tab && sender.tab.id) {
          console.log('タブにメッセージを送信します:', sender.tab.id);
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            disabledTables,
            success: true
          }).then(() => {
            console.log('結果送信完了');
          }).catch(e => {
            console.error('結果送信エラー:', e);
          });
        } else {
          console.warn('送信先のタブIDが見つかりません');
        }
      })
      .catch(e => {
        console.error('RLSチェック失敗:', (e as Error).message, e);

        if (sender.tab && sender.tab.id) {
          console.log('エラーをタブに送信します:', sender.tab.id);
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            error: (e as Error).message,
            success: false
          }).then(() => {
            console.log('エラー送信完了');
          }).catch(sendErr => {
            console.error('エラー送信失敗:', sendErr);
          });
        } else {
          console.warn('エラー送信先のタブIDが見つかりません');
        }
      });

    return true; // 非同期レスポンスを示すためにtrueを返す
  }
});
