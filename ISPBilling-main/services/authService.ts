import { User, EmployeePermissions } from '@/types';
import { permissionsService, DEFAULT_EMPLOYEE_PERMISSIONS } from './permissionsService';

const ADMIN_STORAGE_KEY = 'isp_admin_password';
const CURRENT_USER_KEY = 'isp_current_user';
const USERS_KEY = 'isp_users';

// Default admin credentials
const DEFAULT_ADMIN = {
  id: 'admin-1',
  username: 'admin',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
};

const DEFAULT_ADMIN_PASSWORD = 'admin123';

export const authService = {
  // Initialize admin password
  setAdminPassword: (password: string): void => {
    localStorage.setItem(ADMIN_STORAGE_KEY, password);
  },

  getAdminPassword: (): string => {
    return localStorage.getItem(ADMIN_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
  },

  // User authentication
  login: (username: string, password: string): User | null => {
    // Check admin
    if (username === 'admin') {
      const adminPassword = authService.getAdminPassword();
      if (password === adminPassword) {
        const user = DEFAULT_ADMIN;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    }

    // Check employees and resellers
    const users = authService.getAllUsers();
    const user = users.find(u => u.username === username);
    
    if (user) {
      const storedPassword = localStorage.getItem(`user_password_${user.id}`);
      if (storedPassword === password) {
        // Load permissions for employees
        if (user.role === 'employee') {
          user.permissions = permissionsService.getEmployeePermissions(user.id);
        }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
      }
    }

    return null;
  },

  logout: (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    // Refresh permissions for employees
    if (user.role === 'employee') {
      user.permissions = permissionsService.getEmployeePermissions(user.id);
    }
    return user;
  },

  // User management
  getAllUsers: (): User[] => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users = usersStr ? JSON.parse(usersStr) : [];
    
    // Attach permissions to employees
    return users.map((user: User) => {
      if (user.role === 'employee') {
        user.permissions = permissionsService.getEmployeePermissions(user.id);
      }
      return user;
    });
  },

  createUser: (username: string, password: string, role: 'employee' | 'reseller', permissions?: EmployeePermissions): User => {
    const users = authService.getAllUsers();
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      role,
      balance: role === 'reseller' ? 0 : undefined,
      permissions: role === 'employee' ? (permissions || DEFAULT_EMPLOYEE_PERMISSIONS) : undefined,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(`user_password_${newUser.id}`, password);

    // Set permissions for employee
    if (role === 'employee') {
      permissionsService.setEmployeePermissions(newUser.id, permissions || DEFAULT_EMPLOYEE_PERMISSIONS);
    }

    return newUser;
  },

  updateUserPermissions: (userId: string, permissions: EmployeePermissions): void => {
    const users = authService.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user && user.role === 'employee') {
      user.permissions = permissions;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      permissionsService.setEmployeePermissions(userId, permissions);
    }
  },

  updateUserPassword: (userId: string, newPassword: string): void => {
    localStorage.setItem(`user_password_${userId}`, newPassword);
  },

  updateResellerBalance: (resellerId: string, amount: number): void => {
    const users = authService.getAllUsers();
    const user = users.find(u => u.id === resellerId);
    if (user && user.role === 'reseller') {
      user.balance = (user.balance || 0) + amount;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  getResellerBalance: (resellerId: string): number => {
    const users = authService.getAllUsers();
    const user = users.find(u => u.id === resellerId);
    return user?.balance || 0;
  },
};
