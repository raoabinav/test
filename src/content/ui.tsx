import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buttonStyles } from '../common/utils'


const App = () => {
  const [url, setUrl] = useState<string | undefined>()
  const [key, setKey] = useState<string | undefined>()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{
    success: boolean;
    disabledTables?: any[];
    error?: string;
  } | null>(null)

  useEffect(() => {
    // バックグラウンドスクリプトにストレージデータ取得をリクエスト
    chrome.runtime.sendMessage({
      action: 'getSupabaseData'
    }).then(response => {
      if (response) {
        setUrl(response.supabaseUrl);
        setKey(response.supabaseKey);
      }
    }).catch(() => { });

    const messageListener = (message: any) => {
      if (message.action === 'rlsCheckResult') {
        setChecking(false)
        setResult(message)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [])

  const removePopup = () => {
    const popupContainer = document.getElementById('supabase-rls-checker-popup');
    if (popupContainer) {
      document.body.removeChild(popupContainer);
    }
  }

  const execute = () => {
    if (!url || !key) {
      return;
    }
    setChecking(true)
    setResult(null)

    chrome.runtime.sendMessage({
      action: 'execute',
      supabaseUrl: url,
      supabaseKey: key,
    });
  }

  const cancel = () => {
    chrome.runtime.sendMessage({
      action: 'setRlsPrompted',
      value: true
    }).catch(() => { });
    removePopup();
  }

  const renderContent = () => {
    if (checking) {
      return (
        <>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ED8936' }}>
            RLSチェック中...
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={cancel}
              style={buttonStyles.secondary}
            >
              閉じる
            </button>
          </div>
        </>
      )
    }

    if (result) {
      return (
        <>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: result.success ? '#3ECF8E' : '#E53E3E' }}>
            {result.success ? 'RLSチェック結果' : 'エラー'}
          </div>
          <div style={{ marginBottom: '8px', fontSize: '11px', maxHeight: '80px', overflowY: 'auto' }}>
            {result.success ? (
              result.disabledTables && result.disabledTables.length > 0 ? (
                <>
                  <div style={{ color: '#E53E3E' }}>RLS無効テーブル:</div>
                  <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                    {result.disabledTables.map((item: any, i: number) => (
                      <li key={i} style={{ color: '#555', listStyleType: 'disc' }}>
                        <a href={`https://supabase-client-playground-six.vercel.app/?supabaseUrl=${url}&supabaseKey=${key}&query=supabase.from('${item.table}').select()`} target='_blank' rel="noopener noreferrer" style={{ color: '#3ECF8E', textDecoration: 'none' }}>
                          {item.table} 🚀
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <span style={{ color: '#3ECF8E' }}>全テーブルでRLSが有効です</span>
            ) : <span style={{ color: '#E53E3E' }}>{result.error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={removePopup}
              style={buttonStyles.secondary}
            >
              閉じる
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
          RLSのチェックを行いますか？
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
          <button
            onClick={execute}
            style={buttonStyles.primary}
          >
            実行
          </button>
          <button
            onClick={cancel}
            style={buttonStyles.secondary}
          >
            キャンセル
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '10px',
      boxShadow: '0 1px 5px rgba(0,0,0,0.15)',
      zIndex: 9999,
      fontFamily: 'sans-serif',
      fontSize: '12px',
      maxWidth: '220px'
    }}>
      {renderContent()}
    </div>
  );
}

// 既存のポップアップをチェック
let container = document.getElementById('supabase-rls-checker-popup');

// 存在しない場合のみ新しく作成
if (!container) {
  container = document.createElement('div');
  container.id = 'supabase-rls-checker-popup';
  document.body.appendChild(container);
  createRoot(container).render(<App />);
}
