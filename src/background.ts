import { checkRls } from './common/rlsChecker'
import { decodeJwtAndGetProjectRef, logError } from './common/utils'
import { RlsCheckResult, SupabaseRequestDetectedMessage, GetSupabaseDataMessage, SetRlsPromptedMessage, ExecuteMessage, RlsCheckResultMessage } from './common/types'

/**
 * Process Supabase API key and set session storage
 * @param apiKey Supabase API key
 * @param tabId Optional tab ID to execute script
 * @returns Success status
 */
function processSupabaseKey(apiKey: string, tabId?: number): boolean {
  if (!apiKey) {
    return false;
  }

  try {
    const { projectRef } = decodeJwtAndGetProjectRef(apiKey);
    const supabaseUrl = `https://${projectRef}.supabase.co`;
    
    chrome.storage.session.set({ supabaseUrl, supabaseKey: apiKey }).then(() => {
      chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
        if (!rlsPrompted && tabId) {
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['src/content/ui.js']
          }).catch(error => logError(error, 'Script Execution'));
        }
      }).catch(error => logError(error, 'Storage Get'));
    }).catch(error => logError(error, 'Storage Set'));
    return true;
  }
  catch (error) {
    logError(error, 'JWT Decode');
    return false;
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (info) => {
    if (info.url.includes('.supabase.co/')) {
      const apiKeyHeader = info.requestHeaders?.find(h =>
        h.name.toLowerCase() === 'apikey'
      )?.value;

      if (apiKeyHeader) {
        processSupabaseKey(apiKeyHeader, info.tabId);
      }
      return;
    } else {
      return;
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getSupabaseData') {
    chrome.storage.session.get(['supabaseUrl', 'supabaseKey'])
      .then(data => {
        sendResponse(data);
      })
      .catch(e => {
        sendResponse({ error: e.message });
      });
    return true;
  }

  if (msg.action === 'setRlsPrompted') {
    chrome.storage.session.set({ rlsPrompted: msg.value })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(e => {
        sendResponse({ error: e.message });
      });
    return true;
  }

  if (msg.action === 'supabaseRequestDetected') {
    const request = msg as SupabaseRequestDetectedMessage;
    if (sender.tab && sender.tab.id) {
      processSupabaseKey(request.apiKey, sender.tab.id);
    }
    return;
  }

  if (msg.action === 'execute') {
    const request = msg as ExecuteMessage;
    checkRls(request.supabaseKey)
      .then(results => {
        const disabledTables = results.filter(r => r.rlsDisabled);

        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            disabledTables,
            success: true
          } as RlsCheckResultMessage).catch(error => logError(error, 'Send Result'));
        }
      })
      .catch(error => {
        logError(error, 'RLS Check');
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            error: error instanceof Error ? error.message : String(error),
            success: false
          } as RlsCheckResultMessage).catch(err => logError(err, 'Send Error'));
        }
      });

    return true;
  }
  
  return true;
});
