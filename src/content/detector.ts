// コンテンツスクリプトでは、バックグラウンドスクリプトからのメッセージを受信するだけにします
// webRequestリスナーはバックグラウンドスクリプトに移動しました

// バックグラウンドスクリプトからのメッセージを受信するリスナーを追加
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'rlsCheckResult') {
    // RLSチェック結果を処理するコード
    console.log('RLSチェック結果を受信:', message);
  }
});

// 必要に応じて、ページロード時に何か処理を行うコードをここに追加できます
console.log('Supabase RLS チェッカーのコンテンツスクリプトが読み込まれました');
