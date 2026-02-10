import { ONUStatus } from '@/types';

const ONU_STATUS_KEY = 'isp_onu_status';

export const onuService = {
  getAllONUStatus: (): ONUStatus[] => {
    const statusStr = localStorage.getItem(ONU_STATUS_KEY);
    return statusStr ? JSON.parse(statusStr) : [];
  },

  getCustomerONU: (customerId: string): ONUStatus | undefined => {
    return onuService.getAllONUStatus().find(o => o.customerId === customerId);
  },

  getONUByOnuId: (onuId: string): ONUStatus | undefined => {
    return onuService.getAllONUStatus().find(o => o.onuId === onuId);
  },

  checkONUStatus: async (onuId: string, customerId: string): Promise<ONUStatus> => {
    // Simulated ONU check via SNMP/API
    return new Promise((resolve) => {
      setTimeout(() => {
        const isOnline = Math.random() > 0.2;
        const rxPower = isOnline ? -((Math.random() * 10) + 15) : -40; // -15 to -25 dBm normal
        const txPower = isOnline ? (Math.random() * 3) + 1 : 0; // 1-4 dBm normal
        
        const status: ONUStatus = {
          id: `onu-${Date.now()}`,
          customerId,
          onuId,
          status: isOnline 
            ? (rxPower < -28 ? 'los' : 'online')
            : 'offline',
          rxPower: parseFloat(rxPower.toFixed(2)),
          txPower: parseFloat(txPower.toFixed(2)),
          temperature: Math.floor(Math.random() * 20) + 35, // 35-55°C
          distance: Math.floor(Math.random() * 10000) + 100, // meters
          lastUpdate: new Date().toISOString(),
        };

        // Store status
        onuService.updateONUStatus(status);
        
        resolve(status);
      }, 800);
    });
  },

  updateONUStatus: (status: ONUStatus): void => {
    const allStatus = onuService.getAllONUStatus();
    const index = allStatus.findIndex(o => o.onuId === status.onuId);
    
    if (index !== -1) {
      allStatus[index] = status;
    } else {
      allStatus.push(status);
    }
    
    localStorage.setItem(ONU_STATUS_KEY, JSON.stringify(allStatus));
  },

  getSignalQuality: (rxPower: number): { level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'; color: string } => {
    if (rxPower >= -20) return { level: 'excellent', color: '#10b981' };
    if (rxPower >= -23) return { level: 'good', color: '#22c55e' };
    if (rxPower >= -27) return { level: 'fair', color: '#eab308' };
    if (rxPower >= -30) return { level: 'poor', color: '#f97316' };
    return { level: 'critical', color: '#ef4444' };
  },
};
