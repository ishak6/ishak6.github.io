import { Customer, Package } from '@/types';
import { mikrotikService } from './mikrotikService';
import { messagingService } from './messagingService';

const CUSTOMERS_KEY = 'isp_customers';
const PACKAGES_KEY = 'isp_packages';

// Default packages
const DEFAULT_PACKAGES: Package[] = [
  { id: 'pkg-1', name: 'Basic 5 Mbps', speed: '5M/5M', price: 500, duration: 30, description: '5 Mbps unlimited' },
  { id: 'pkg-2', name: 'Standard 10 Mbps', speed: '10M/10M', price: 800, duration: 30, description: '10 Mbps unlimited' },
  { id: 'pkg-3', name: 'Premium 20 Mbps', speed: '20M/20M', price: 1200, duration: 30, description: '20 Mbps unlimited' },
  { id: 'pkg-4', name: 'Ultra 50 Mbps', speed: '50M/50M', price: 2000, duration: 30, description: '50 Mbps unlimited' },
];

export const customerService = {
  // Package management
  getAllPackages: (): Package[] => {
    const packagesStr = localStorage.getItem(PACKAGES_KEY);
    if (!packagesStr) {
      localStorage.setItem(PACKAGES_KEY, JSON.stringify(DEFAULT_PACKAGES));
      return DEFAULT_PACKAGES;
    }
    return JSON.parse(packagesStr);
  },

  addPackage: (pkg: Omit<Package, 'id'>): Package => {
    const packages = customerService.getAllPackages();
    const newPackage: Package = {
      ...pkg,
      id: `pkg-${Date.now()}`,
    };
    packages.push(newPackage);
    localStorage.setItem(PACKAGES_KEY, JSON.stringify(packages));
    return newPackage;
  },

  // Customer management
  getAllCustomers: (): Customer[] => {
    const customersStr = localStorage.getItem(CUSTOMERS_KEY);
    return customersStr ? JSON.parse(customersStr) : [];
  },

  getCustomersByCreator: (creatorId: string): Customer[] => {
    return customerService.getAllCustomers().filter(c => c.createdBy === creatorId);
  },

  createCustomer: async (
    data: Omit<Customer, 'id' | 'status' | 'createdAt' | 'billDueDate'>,
    createOnMikrotik: boolean = true,
    sendCredentials: boolean = true,
    createdByUsername: string = 'admin'
  ): Promise<Customer> => {
    const customers = customerService.getAllCustomers();
    const pkg = customerService.getAllPackages().find(p => p.id === data.packageId);

    const billDueDate = new Date();
    billDueDate.setDate(billDueDate.getDate() + (pkg?.duration || 30));

    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      packageName: pkg?.name || '',
      status: data.balance > 0 ? 'active' : 'inactive',
      billDueDate: billDueDate.toISOString(),
      autoRenew: data.autoRenew || false,
      createdAt: new Date().toISOString(),
    };

    // Create on Mikrotik
    if (createOnMikrotik && pkg) {
      const profile = pkg.speed;
      await mikrotikService.createPPPoEUser(
        data.serverId,
        data.username,
        data.password,
        profile
      );
    }

    customers.push(newCustomer);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));

    // Send credentials message
    if (sendCredentials) {
      messagingService.sendCredentialsMessage(
        newCustomer.id,
        newCustomer.fullName,
        newCustomer.username,
        newCustomer.password,
        newCustomer.packageName,
        createdByUsername
      );
    }

    return newCustomer;
  },

  updateCustomer: (id: string, updates: Partial<Customer>): void => {
    const customers = customerService.getAllCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updates };
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    }
  },

  updateCustomerBalance: async (id: string, amount: number, updatedBy: string = 'admin'): Promise<void> => {
    const customers = customerService.getAllCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (customer) {
      const wasActive = customer.balance > 0;
      customer.balance = amount;
      customer.status = amount > 0 ? 'active' : 'inactive';
      
      // Update Mikrotik status
      await mikrotikService.updatePPPoEUser(
        customer.serverId,
        customer.username,
        amount > 0
      );

      // Send suspension message if balance went to zero
      if (wasActive && amount <= 0) {
        messagingService.sendSuspensionMessage(customer.id, customer.fullName, updatedBy);
      }

      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const customers = customerService.getAllCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (customer) {
      await mikrotikService.deletePPPoEUser(customer.serverId, customer.username);
      const filtered = customers.filter(c => c.id !== id);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
    }
  },

  // Auto-deduction and bill alert system
  processAutoDeductions: (): void => {
    const customers = customerService.getAllCustomers();
    const packages = customerService.getAllPackages();

    customers.forEach(customer => {
      if (customer.status === 'active' && customer.balance > 0) {
        const pkg = packages.find(p => p.id === customer.packageId);
        if (pkg) {
          const dailyRate = pkg.price / pkg.duration;
          const newBalance = Math.max(0, customer.balance - dailyRate);
          const daysRemaining = Math.floor(newBalance / dailyRate);

          // Send alert when 3 days or less remaining
          if (daysRemaining <= 3 && daysRemaining > 0) {
            const existingMessages = messagingService.getCustomerMessages(customer.id);
            const recentAlert = existingMessages.find(
              m => m.type === 'bill_alert' && 
              (new Date().getTime() - new Date(m.sentAt).getTime()) < 24 * 60 * 60 * 1000
            );

            if (!recentAlert) {
              messagingService.sendBillAlertMessage(
                customer.id,
                customer.fullName,
                newBalance,
                pkg.price,
                daysRemaining,
                'system'
              );
            }
          }
          
          customerService.updateCustomerBalance(customer.id, newBalance, 'system');
        }
      }
    });
  },

  getCustomersNeedingAlert: (): Customer[] => {
    const customers = customerService.getAllCustomers();
    const packages = customerService.getAllPackages();

    return customers.filter(customer => {
      if (customer.status === 'active' && customer.balance > 0) {
        const pkg = packages.find(p => p.id === customer.packageId);
        if (pkg) {
          const dailyRate = pkg.price / pkg.duration;
          const daysRemaining = Math.floor(customer.balance / dailyRate);
          return daysRemaining <= 3;
        }
      }
      return false;
    });
  },
};
