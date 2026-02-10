import { MikrotikServer } from '@/types';

const SERVERS_KEY = 'isp_mikrotik_servers';

export const mikrotikService = {
  getAllServers: (): MikrotikServer[] => {
    const serversStr = localStorage.getItem(SERVERS_KEY);
    return serversStr ? JSON.parse(serversStr) : [];
  },

  addServer: (server: Omit<MikrotikServer, 'id' | 'status' | 'totalCustomers' | 'activeCustomers'>): MikrotikServer => {
    const servers = mikrotikService.getAllServers();
    const newServer: MikrotikServer = {
      ...server,
      id: `server-${Date.now()}`,
      status: 'offline',
      totalCustomers: 0,
      activeCustomers: 0,
    };

    servers.push(newServer);
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));

    // Simulate connection check
    setTimeout(() => {
      mikrotikService.updateServerStatus(newServer.id, 'online');
    }, 1000);

    return newServer;
  },

  updateServer: (id: string, updates: Partial<MikrotikServer>): void => {
    const servers = mikrotikService.getAllServers();
    const index = servers.findIndex(s => s.id === id);
    if (index !== -1) {
      servers[index] = { ...servers[index], ...updates };
      localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
    }
  },

  updateServerStatus: (id: string, status: 'online' | 'offline'): void => {
    mikrotikService.updateServer(id, { status });
  },

  deleteServer: (id: string): void => {
    const servers = mikrotikService.getAllServers();
    const filtered = servers.filter(s => s.id !== id);
    localStorage.setItem(SERVERS_KEY, JSON.stringify(filtered));
  },

  // Simulate Mikrotik API calls
  createPPPoEUser: async (serverId: string, username: string, password: string, profile: string): Promise<boolean> => {
    // Simulated API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Created PPPoE user ${username} on server ${serverId} with profile ${profile}`);
        resolve(true);
      }, 500);
    });
  },

  updatePPPoEUser: async (serverId: string, username: string, enabled: boolean): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Updated PPPoE user ${username} - enabled: ${enabled}`);
        resolve(true);
      }, 500);
    });
  },

  deletePPPoEUser: async (serverId: string, username: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Deleted PPPoE user ${username} from server ${serverId}`);
        resolve(true);
      }, 500);
    });
  },

  pingHost: async (host: string): Promise<{ success: boolean; latency?: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          success,
          latency: success ? Math.floor(Math.random() * 50) + 10 : undefined,
        });
      }, 1000);
    });
  },

  getActiveConnections: async (serverId: string): Promise<number> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.floor(Math.random() * 50) + 10);
      }, 500);
    });
  },
};
