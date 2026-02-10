import { EmployeePermissions } from '@/types';

const PERMISSIONS_KEY = 'isp_permissions';

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  viewCustomers: true,
  createCustomers: false,
  editCustomers: false,
  deleteCustomers: false,
  viewServers: false,
  manageServers: false,
  editBalance: false,
  viewReports: false,
  sendMessages: false,
  viewTransactions: false,
};

export const permissionsService = {
  getEmployeePermissions: (employeeId: string): EmployeePermissions => {
    const permissionsStr = localStorage.getItem(PERMISSIONS_KEY);
    const allPermissions = permissionsStr ? JSON.parse(permissionsStr) : {};
    return allPermissions[employeeId] || DEFAULT_EMPLOYEE_PERMISSIONS;
  },

  setEmployeePermissions: (employeeId: string, permissions: EmployeePermissions): void => {
    const permissionsStr = localStorage.getItem(PERMISSIONS_KEY);
    const allPermissions = permissionsStr ? JSON.parse(permissionsStr) : {};
    allPermissions[employeeId] = permissions;
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(allPermissions));
  },

  getAllPermissions: (): Record<string, EmployeePermissions> => {
    const permissionsStr = localStorage.getItem(PERMISSIONS_KEY);
    return permissionsStr ? JSON.parse(permissionsStr) : {};
  },

  hasPermission: (employeeId: string, permission: keyof EmployeePermissions): boolean => {
    const permissions = permissionsService.getEmployeePermissions(employeeId);
    return permissions[permission] || false;
  },
};
