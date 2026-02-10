export interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee' | 'reseller';
  balance?: number;
  permissions?: EmployeePermissions;
  createdAt: string;
}

export interface EmployeePermissions {
  viewCustomers: boolean;
  createCustomers: boolean;
  editCustomers: boolean;
  deleteCustomers: boolean;
  viewServers: boolean;
  manageServers: boolean;
  editBalance: boolean;
  viewReports: boolean;
  sendMessages: boolean;
  viewTransactions: boolean;
}

export interface MikrotikServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  status: 'online' | 'offline';
  totalCustomers: number;
  activeCustomers: number;
}

export interface Customer {
  id: string;
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  packageId: string;
  packageName: string;
  balance: number;
  status: 'active' | 'inactive' | 'suspended';
  serverId: string;
  ipAddress?: string;
  macAddress?: string;
  onuId?: string;
  lastOnline?: string;
  createdBy: string;
  createdAt: string;
  billDueDate?: string;
  autoRenew?: boolean;
}

export interface Package {
  id: string;
  name: string;
  speed: string;
  price: number;
  duration: number; // days
  description: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'recharge' | 'deduction' | 'adjustment';
  amount: number;
  balance: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface ResellerTransaction {
  id: string;
  resellerId: string;
  resellerName: string;
  type: 'credit_purchase' | 'customer_creation' | 'refund';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface CustomerMessage {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  message: string;
  type: 'general' | 'bill_alert' | 'credentials' | 'suspension';
  sentBy: string;
  sentAt: string;
  read: boolean;
}

export interface ONUStatus {
  id: string;
  customerId: string;
  onuId: string;
  status: 'online' | 'offline' | 'los' | 'dying_gasp';
  rxPower: number; // dBm
  txPower: number; // dBm
  temperature: number;
  distance: number; // meters
  lastUpdate: string;
}
