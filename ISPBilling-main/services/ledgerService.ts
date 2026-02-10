import { Transaction, ResellerTransaction } from '@/types';

const TRANSACTIONS_KEY = 'isp_transactions';
const RESELLER_TRANSACTIONS_KEY = 'isp_reseller_transactions';

export const ledgerService = {
  // Customer transactions
  getAllTransactions: (): Transaction[] => {
    const transStr = localStorage.getItem(TRANSACTIONS_KEY);
    return transStr ? JSON.parse(transStr) : [];
  },

  getCustomerTransactions: (customerId: string): Transaction[] => {
    return ledgerService.getAllTransactions().filter(t => t.customerId === customerId);
  },

  addTransaction: (
    customerId: string,
    customerName: string,
    type: 'recharge' | 'deduction' | 'adjustment',
    amount: number,
    balance: number,
    description: string,
    createdBy: string
  ): Transaction => {
    const transactions = ledgerService.getAllTransactions();
    const newTransaction: Transaction = {
      id: `trans-${Date.now()}`,
      customerId,
      customerName,
      type,
      amount,
      balance,
      description,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    transactions.push(newTransaction);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    return newTransaction;
  },

  // Reseller transactions
  getAllResellerTransactions: (): ResellerTransaction[] => {
    const transStr = localStorage.getItem(RESELLER_TRANSACTIONS_KEY);
    return transStr ? JSON.parse(transStr) : [];
  },

  getResellerTransactions: (resellerId: string): ResellerTransaction[] => {
    return ledgerService.getAllResellerTransactions().filter(t => t.resellerId === resellerId);
  },

  addResellerTransaction: (
    resellerId: string,
    resellerName: string,
    type: 'credit_purchase' | 'customer_creation' | 'refund',
    amount: number,
    balance: number,
    description: string
  ): ResellerTransaction => {
    const transactions = ledgerService.getAllResellerTransactions();
    const newTransaction: ResellerTransaction = {
      id: `rtrans-${Date.now()}`,
      resellerId,
      resellerName,
      type,
      amount,
      balance,
      description,
      createdAt: new Date().toISOString(),
    };

    transactions.push(newTransaction);
    localStorage.setItem(RESELLER_TRANSACTIONS_KEY, JSON.stringify(transactions));
    return newTransaction;
  },

  getTodayRevenue: (): number => {
    const transactions = ledgerService.getAllTransactions();
    const today = new Date().toDateString();
    
    return transactions
      .filter(t => new Date(t.createdAt).toDateString() === today && t.type === 'recharge')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getMonthRevenue: (): number => {
    const transactions = ledgerService.getAllTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
      .filter(t => {
        const date = new Date(t.createdAt);
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear && 
               t.type === 'recharge';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  },
};
