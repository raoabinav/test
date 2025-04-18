import { checkRls } from './common/rlsChecker'
import { decodeJwtAndGetProjectRef, logError } from './common/utils'
import { SupabaseRequestDetectedMessage,  ExecuteMessage, RlsCheckResultMessage } from './common/types'

interface TabData {
  supabaseUrl?: string;
  supabaseKey?: string;
  rlsPrompted?: boolean;
}

const tabData = new Map<number, TabData>();

function getTabData(tabId: number): TabData {
  return tabData.get(tabId) || {};
}

function setTabData(tabId: number, data: Partial<TabData>): boolean {
  const current = tabData.get(tabId) || {};
  tabData.set(tabId, {...current, ...data});
  return true;
}

const globalData: TabData = {};

function getGlobalData(): TabData {
  return globalData;
}

function setGlobalData(data: Partial<TabData>): boolean {
  Object.assign(globalData, data);
  return true;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});

/**
 * Process Supabase API key and set tab data
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
    
    if (tabId !== undefined && tabId >= 0) {
      setTabData(tabId, { supabaseUrl, supabaseKey: apiKey });
      const { rlsPrompted } = getTabData(tabId);
      
      if (!rlsPrompted) {
        try {
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
              logError(chrome.runtime.lastError, 'Tab Get');
              return; 
            }
            
            const currentUrl = tab.url || '';
            // supabase-client-playground-six.vercel.app ではポップアップを表示しない
            if (!currentUrl.includes('supabase-client-playground-six.vercel.app')) {
              chrome.scripting.executeScript({
                target: { tabId },
                files: ['src/content/ui.js']
              }).catch((error: Error) => logError(error, 'Script Execution'));
            }
          });
        } catch (error) {
          logError(error as Error, 'Tab Get Exception');
        }
      }
    } else {
      setGlobalData({ supabaseUrl, supabaseKey: apiKey });
    }
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
        if (info.tabId !== undefined && info.tabId >= 0) {
          processSupabaseKey(apiKeyHeader, info.tabId);
        } else {
          processSupabaseKey(apiKeyHeader);
        }
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
    if (sender.tab && sender.tab.id !== undefined && sender.tab.id >= 0) {
      const data = getTabData(sender.tab.id);
      sendResponse({
        supabaseUrl: data.supabaseUrl,
        supabaseKey: data.supabaseKey
      });
    } else {
      const data = getGlobalData();
      sendResponse({
        supabaseUrl: data.supabaseUrl,
        supabaseKey: data.supabaseKey
      });
    }
    return true;
  }

  if (msg.action === 'setRlsPrompted') {
    if (sender.tab && sender.tab.id !== undefined && sender.tab.id >= 0) {
      setTabData(sender.tab.id, { rlsPrompted: msg.value });
    } else {
      setGlobalData({ rlsPrompted: msg.value });
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'supabaseRequestDetected') {
    const request = msg as SupabaseRequestDetectedMessage;
    if (sender.tab && sender.tab.id !== undefined && sender.tab.id >= 0) {
      processSupabaseKey(request.apiKey, sender.tab.id);
    }
    return;
  }

  if (msg.action === 'execute') {
    const request = msg as ExecuteMessage;
    checkRls(request.supabaseKey)
      .then(results => {
        const disabledTables = results.filter(r => r.rlsDisabled);

        if (sender.tab && sender.tab.id !== undefined && sender.tab.id >= 0) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'rlsCheckResult',
            disabledTables,
            success: true
          } as RlsCheckResultMessage).catch(error => logError(error, 'Send Result'));
        }
      })
      .catch(error => {
        logError(error, 'RLS Check');
        if (sender.tab && sender.tab.id !== undefined && sender.tab.id >= 0) {
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
