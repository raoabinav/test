/**
 * Message types for communication between background, content scripts and UI
 */

export interface RlsCheckResult {
  table: string;
  rlsDisabled: boolean;
  errorMessage?: string;
}

export interface Message {
  action: string;
}

export interface SupabaseRequestDetectedMessage extends Message {
  action: 'supabaseRequestDetected';
  url: string;
  apiKey: string;
}

export interface GetSupabaseDataMessage extends Message {
  action: 'getSupabaseData';
}

export interface GetSupabaseDataResponse {
  supabaseUrl?: string;
  supabaseKey?: string;
  error?: string;
}

export interface SetRlsPromptedMessage extends Message {
  action: 'setRlsPrompted';
  value: boolean;
}

export interface SetRlsPromptedResponse {
  success: boolean;
  error?: string;
}

export interface ExecuteMessage extends Message {
  action: 'execute';
  supabaseUrl: string;
  supabaseKey: string;
}

export interface RlsCheckResultMessage extends Message {
  action: 'rlsCheckResult';
  disabledTables?: RlsCheckResult[];
  error?: string;
  success: boolean;
}
