import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buttonStyles, logError } from '../common/utils'
import { RlsCheckResult, RlsCheckResultMessage } from '../common/types'


const App = () => {
  const [url, setUrl] = useState<string | undefined>()
  const [key, setKey] = useState<string | undefined>()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<RlsCheckResultMessage | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({
      action: 'getSupabaseData'
    }).then(response => {
      if (response) {
        setUrl(response.supabaseUrl);
        setKey(response.supabaseKey);
      }
    }).catch(error => logError(error, 'Get Supabase Data'));

    const messageListener = (message: RlsCheckResultMessage) => {
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
    }).catch(error => logError(error, 'Set RLS Prompted'));
    removePopup();
  }

  const renderContent = () => {
    if (checking) {
      return (
        <>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ED8936' }}>
            Checking RLS...
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={cancel}
              style={buttonStyles.secondary}
            >
              Close
            </button>
          </div>
        </>
      )
    }

    if (result) {
      return (
        <>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: result.success ? '#3ECF8E' : '#E53E3E' }}>
            {result.success ? 'RLS Check Results' : 'Error'}
          </div>
          <div style={{ marginBottom: '8px', fontSize: '11px', maxHeight: '80px', overflowY: 'auto' }}>
            {result.success ? (
              result.disabledTables && result.disabledTables.length > 0 ? (
                <>
                  <div style={{ color: '#E53E3E' }}>Tables with RLS disabled:</div>
                  <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                    {result.disabledTables?.map((item: RlsCheckResult, i: number) => (
                      <li key={i} style={{ color: '#555', listStyleType: 'disc' }}>
                        <a href={`https://supabase-client-playground-six.vercel.app/?supabaseUrl=${url}&supabaseKey=${key}&query=supabase.from('${item.table}').select()`} target='_blank' rel="noopener noreferrer" style={{ color: '#3ECF8E', textDecoration: 'none' }}>
                          {item.table} 🚀
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <span style={{ color: '#3ECF8E' }}>RLS is enabled for all tables</span>
            ) : <span style={{ color: '#E53E3E' }}>{result.error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={removePopup}
              style={buttonStyles.secondary}
            >
              Close
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
          Do you want to check RLS?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
          <button
            onClick={execute}
            style={buttonStyles.primary}
          >
            Execute
          </button>
          <button
            onClick={cancel}
            style={buttonStyles.secondary}
          >
            Cancel
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
      <p>
        <a href="https://github.com/hand-dot/supabase-rls-checker" target='_blank'>
          <strong
            style={{
              color: '#333',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ marginRight: '0.25rem' }}>Supabase RLS Checker</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
          </strong>
        </a>
        <span style={{
          display: 'block',
          height: '1px',
          backgroundColor: '#ddd',
          margin: '5px 0',
          width: '100%'
        }}></span>
      </p>
      {renderContent()}
    </div>
  );
}

let container = document.getElementById('supabase-rls-checker-popup');

if (!container) {
  container = document.createElement('div');
  container.id = 'supabase-rls-checker-popup';
  document.body.appendChild(container);
  createRoot(container).render(<App />);
}
