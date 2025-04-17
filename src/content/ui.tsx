import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buttonStyles } from '../common/utils'

export const TABLES = [
  'users',                 // 基本ユーザー情報（メールアドレス、名前）
  'profiles',              // プロフィール詳細（住所、電話番号、生年月日）
  'customers',             // 顧客マスタ（連絡先、請求先情報）
  'orders',                // 注文情報（注文者の氏名・住所）
  'order_items',           // 注文内訳（商品情報と紐づく顧客注文）
  'payments',              // 支払い情報（クレジットカード末尾、取引ID）
  'payment_methods',       // ユーザーの支払い手段（カード情報の一部）
  'credit_cards',          // クレジットカード詳細（トークン化された情報）
  'addresses',             // 住所情報（配送先／請求先）
  'shipping_addresses',    // 配送専用住所
  'billing_addresses',     // 請求専用住所
  'invoices',              // 請求書（請求先・金額・発行日）
  'invoice_items',         // 請求書明細
  'subscriptions',         // サブスクリプション履歴（ユーザーID、プラン、支払い情報）
  'transactions',          // 金銭取引ログ（取引ID、金額）
  'sessions',              // セッション管理（ログイン履歴、IPアドレス）
  'login_attempts',        // ログイン試行履歴（日時、結果、IPアドレス）
  'oauth_tokens',          // OAuth トークン（アクセストークン、リフレッシュトークン）
  'api_keys',              // API キー管理
  'security_questions',    // セキュリティ質問と回答
  'employees',             // 社員情報（社員ID、住所、緊急連絡先）
  'employee_records',      // 人事記録（給与、評価）
  'payroll',               // 給与データ（銀行口座、税情報）
  'tax_records',           // 税務データ（納税者番号、申告情報）
  'medical_records',       // 医療記録（診断、処方）
  'insurance_claims',      // 保険請求情報（保険番号、症状）
  'contacts',              // 問い合わせ履歴（氏名、メール、電話）
  'support_tickets',       // サポートチケット（ユーザー情報と問い合わせ内容）
  'messages',              // メッセージ履歴（送信者・受信者・内容）
  'chat_threads',          // チャットスレッド（参加ユーザー）
  'feedback',              // ユーザーフィードバック（氏名、連絡先）
  'reviews',               // レビュー（レビュワー情報）
  'comments',              // コメント（投稿者アカウント）
  'leads',                 // 見込み客情報（氏名、企業、連絡先）
  'newsletter_subscribers',// メルマガ登録者
  'event_registrations',   // イベント申込情報（参加者情報、連絡先）
  'attendees',             // イベント参加者一覧
  'vendors',               // 取引先（会社名、住所、連絡先）
  'partners',              // パートナー情報（担当者連絡先）
];

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
      tables: TABLES
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
                      <li key={i} style={{ color: '#555',listStyleType: 'disc' }}>
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
