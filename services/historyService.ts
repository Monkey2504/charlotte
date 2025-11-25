import { SearchResult } from '../types';

const ADMIN_LOGS_KEY = 'charlotte_admin_logs';

export interface AdminLog {
  id: string;
  timestamp: string;
  type: 'search';
  data: SearchResult;
}

// Fallback UUID generator
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const historyService = {
  logSearch: (result: SearchResult) => {
    try {
      const logs = historyService.getLogs();
      const newLog: AdminLog = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        type: 'search',
        data: result
      };
      logs.push(newLog);
      localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save admin log", e);
    }
  },

  getLogs: (): AdminLog[] => {
    try {
      const stored = localStorage.getItem(ADMIN_LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  exportLogsToJSON: () => {
    const logs = historyService.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charlotte_admin_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
