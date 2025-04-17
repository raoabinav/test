import { cleanApiKey } from '../common/utils';

const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : input.toString();
  
  if (url.includes('.supabase.co/')) {
    const headers = init?.headers || (input instanceof Request ? input.headers : new Headers());
    let apiKey: string | null = null;
    
    if (headers instanceof Headers) {
      apiKey = headers.get('apikey') || headers.get('Authorization');
    } else if (typeof headers === 'object') {
      apiKey = (headers as Record<string, string>)['apikey'] || 
               (headers as Record<string, string>)['Apikey'] || 
               (headers as Record<string, string>)['APIKey'] || 
               (headers as Record<string, string>)['Authorization'];
    }
    
    if (apiKey) {
      const apiKeyValue = cleanApiKey(apiKey);
      
      chrome.runtime.sendMessage({
        action: 'supabaseRequestDetected',
        url,
        apiKey: apiKeyValue
      });
    }
  }
  
  return originalFetch.apply(this, [input, init]);
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(
  method: string, 
  url: string | URL, 
  async: boolean = true, 
  username?: string | null, 
  password?: string | null
) {
  const urlString = url.toString();
  
  (this as any)._supabaseUrl = urlString;
  
  return originalXhrOpen.call(this, method, url, async, username, password);
};

const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string) {
  if ((name.toLowerCase() === 'apikey' || name.toLowerCase() === 'authorization') && 
      (this as any)._supabaseUrl && 
      (this as any)._supabaseUrl.includes('.supabase.co/')) {
    
    const apiKeyValue = cleanApiKey(value);
    
    chrome.runtime.sendMessage({
      action: 'supabaseRequestDetected',
      url: (this as any)._supabaseUrl,
      apiKey: apiKeyValue
    });
  }
  
  return originalXhrSetRequestHeader.apply(this, [name, value]);
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'rlsCheckResult') {
  }
});
