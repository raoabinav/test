import { checkRls } from './common/rlsChecker'
import { decodeJwtAndGetProjectRef, cleanApiKey } from './common/utils'

chrome.webRequest.onBeforeSendHeaders.addListener(
  (info) => {
    if (info.url.includes('.supabase.co/rest/v1/')) {
      const apiKeyHeader = info.requestHeaders?.find(h =>
        h.name.toLowerCase() === 'apikey'
      )?.value;

      if (!apiKeyHeader) {
        return;
      }

      try {
        const { projectRef, payload } = decodeJwtAndGetProjectRef(apiKeyHeader);
        const supabaseUrl = `https://${projectRef}.supabase.co`;
        
        chrome.storage.session.set({ supabaseUrl, supabaseKey: apiKeyHeader }).then(() => {
          chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
            if (!rlsPrompted && info.tabId) {
              chrome.scripting.executeScript({
                target: { tabId: info.tabId },
                files: ['src/content/ui.js']
              }).catch(() => {});
            }
          });
        }).catch(() => {});
      }
      catch (e) {
        return;
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
    if (!msg.apiKey) {
      return;
    }

    try {
      const { projectRef, payload } = decodeJwtAndGetProjectRef(msg.apiKey);
      const supabaseUrl = `https://${projectRef}.supabase.co`;
      
      chrome.storage.session.set({ supabaseUrl, supabaseKey: msg.apiKey }).then(() => {
        chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
          if (!rlsPrompted && sender.tab && sender.tab.id) {
            chrome.scripting.executeScript({
              target: { tabId: sender.tab.id },
              files: ['src/content/ui.js']
            }).catch(() => {});
          }
        });
      }).catch(() => {});
    }
    catch (e) {
      return;
    }

    return;
  }

  if (msg.action === 'execute') {
    checkRls(msg.supabaseKey, msg.tables)
      .then(results => {
        const disabledTables = results.filter(r => r.rlsDisabled);

        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            disabledTables,
            success: true
          }).catch(() => {});
        }
      })
      .catch(e => {
        if (sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            error: (e as Error).message,
            success: false
          }).catch(() => {});
        }
      });

    return true;
  }
});
