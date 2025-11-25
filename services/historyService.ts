
import { AdminLog, SearchResult } from '../types';
import { persistenceService } from './persistence';

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
  logSearch: async (result: SearchResult) => {
    try {
      const logs = await persistenceService.getAdminLogs();
      const newLog: AdminLog = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        type: 'search',
        data: result,
        synced: false
      };
      
      logs.push(newLog);
      await persistenceService.saveAdminLogs(logs);
      
      // Tentative de synchronisation immédiate (Stub)
      await historyService.syncToCloud(newLog);
      
    } catch (e) {
      console.error("Failed to save admin log", e);
    }
  },

  getLogs: async (): Promise<AdminLog[]> => {
    return await persistenceService.getAdminLogs();
  },

  syncToCloud: async (log: AdminLog) => {
    // Stub pour future connexion DB
    return Promise.resolve();
  },

  exportLogsToJSON: async () => {
    const logs = await persistenceService.getAdminLogs();
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
