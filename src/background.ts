import { checkRls } from './common/rlsChecker'
import jwtDecode from 'jwt-decode';

interface JwtPayload {
  ref?: string;
  exp: number;
  sub?: string;
  iss?: string;
  [key: string]: any;
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (info) => {
    if (info.url.includes('.supabase.co/rest/v1/')) {
      const cleanApiKey = info.requestHeaders?.find(h =>
        h.name.toLowerCase() === 'apikey'
      )?.value;

      if (!cleanApiKey) {
        return;
      }

      let payload: JwtPayload;
      let projectRef: string | undefined;

      try {
        payload = jwtDecode(cleanApiKey);
        projectRef = payload.ref ||
          (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
          (payload.iss ? payload.iss.split('/')?.[3] : undefined);

        if (!projectRef) {
          return;
        }
      }
      catch (e) {
        return;
      }

      const supabaseUrl = `https://${projectRef}.supabase.co`;
      chrome.storage.session.set({ supabaseUrl, supabaseKey: cleanApiKey }).then(() => {
        chrome.storage.session.get('rlsPrompted').then(({ rlsPrompted }) => {
          if (!rlsPrompted && info.tabId) {
            chrome.scripting.executeScript({
              target: { tabId: info.tabId },
              files: ['src/content/ui.js']
            }).catch(() => {});
          }
        });
      }).catch(() => {});

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

    let payload: JwtPayload;
    let projectRef: string | undefined;

    try {
      payload = jwtDecode(msg.apiKey);
      projectRef = payload.ref ||
        (payload.sub ? payload.sub.split(':')?.[0] : undefined) ||
        (payload.iss ? payload.iss.split('/')?.[3] : undefined);

      if (!projectRef) {
        return;
      }
    }
    catch (e) {
      return;
    }

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
