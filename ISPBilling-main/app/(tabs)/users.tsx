import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PermissionSwitch } from '@/components/ui/PermissionSwitch';
import { useAlert } from '@/template';
import { authService } from '@/services/authService';
import { ledgerService } from '@/services/ledgerService';
import { User, EmployeePermissions } from '@/types';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '@/services/permissionsService';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function UsersScreen() {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee' as 'employee' | 'reseller',
    credit: '',
  });
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);

  const loadUsers = () => {
    setUsers(authService.getAllUsers());
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'employee',
      credit: '',
    });
    setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
  };

  const handleCreateUser = () => {
    if (!formData.username || !formData.password) {
      showAlert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);

    try {
      authService.createUser(
        formData.username,
        formData.password,
        formData.role,
        formData.role === 'employee' ? permissions : undefined
      );
      showAlert('Success', `${formData.role} created successfully`);
      resetForm();
      setShowAddModal(false);
      loadUsers();
    } catch (error) {
      showAlert('Error', 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredit = () => {
    if (!selectedUser || !formData.credit) {
      showAlert('Error', 'Please enter credit amount');
      return;
    }

    const amount = parseFloat(formData.credit);
    if (amount <= 0) {
      showAlert('Error', 'Invalid amount');
      return;
    }

    setLoading(true);

    try {
      authService.updateResellerBalance(selectedUser.id, amount);
      const newBalance = authService.getResellerBalance(selectedUser.id);

      ledgerService.addResellerTransaction(
        selectedUser.id,
        selectedUser.username,
        'credit_purchase',
        amount,
        newBalance,
        'Credit added by admin'
      );

      showAlert('Success', 'Credit added successfully');
      setShowCreditModal(false);
      setSelectedUser(null);
      setFormData({ ...formData, credit: '' });
      loadUsers();
    } catch (error) {
      showAlert('Error', 'Failed to add credit');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setPermissions(user.permissions || DEFAULT_EMPLOYEE_PERMISSIONS);
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      authService.updateUserPermissions(selectedUser.id, permissions);
      showAlert('Success', 'Permissions updated successfully');
      setShowPermissionsModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      showAlert('Error', 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'admin-panel-settings';
      case 'employee':
        return 'work';
      case 'reseller':
        return 'store';
      default:
        return 'person';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'employee':
        return colors.info;
      case 'reseller':
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <MaterialIcons name="person-add" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No users yet</Text>
            <Text style={styles.emptySubtext}>Create employees or resellers</Text>
          </View>
        ) : (
          users.map((user) => (
            <Card key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <MaterialIcons 
                    name={getRoleIcon(user.role) as any} 
                    size={24} 
                    color={getRoleColor(user.role)} 
                  />
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.username}</Text>
                    <Text style={[styles.userRole, { color: getRoleColor(user.role) }]}>
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {user.role === 'employee' && (
                <View style={styles.employeeActions}>
                  <Button
                    title="Edit Permissions"
                    onPress={() => handleEditPermissions(user)}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                </View>
              )}

              {user.role === 'reseller' && (
                <View style={styles.resellerInfo}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Balance:</Text>
                    <Text style={styles.balanceValue}>₹{user.balance || 0}</Text>
                  </View>
                  <Button
                    title="Add Credit"
                    onPress={() => {
                      setSelectedUser(user);
                      setShowCreditModal(true);
                    }}
                    variant="success"
                    style={styles.creditButton}
                  />
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create User</Text>
              <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.selectLabel}>User Role</Text>
              <View style={styles.roleButtons}>
                <Pressable
                  onPress={() => setFormData({ ...formData, role: 'employee' })}
                  style={[
                    styles.roleButton,
                    formData.role === 'employee' && styles.roleButtonSelected,
                  ]}
                >
                  <MaterialIcons name="work" size={24} color={formData.role === 'employee' ? colors.primary : colors.textMuted} />
                  <Text style={styles.roleButtonText}>Employee</Text>
                </Pressable>

                <Pressable
                  onPress={() => setFormData({ ...formData, role: 'reseller' })}
                  style={[
                    styles.roleButton,
                    formData.role === 'reseller' && styles.roleButtonSelected,
                  ]}
                >
                  <MaterialIcons name="store" size={24} color={formData.role === 'reseller' ? colors.primary : colors.textMuted} />
                  <Text style={styles.roleButtonText}>Reseller</Text>
                </Pressable>
              </View>

              <Input
                label="Username*"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Enter username"
              />
              <Input
                label="Password*"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />

              {formData.role === 'employee' && (
                <View style={styles.permissionsSection}>
                  <Text style={styles.sectionTitle}>Permissions</Text>
                  <PermissionSwitch
                    label="View Customers"
                    description="Can view customer list and details"
                    value={permissions.viewCustomers}
                    onValueChange={(value) => setPermissions({ ...permissions, viewCustomers: value })}
                  />
                  <PermissionSwitch
                    label="Create Customers"
                    description="Can create new customers"
                    value={permissions.createCustomers}
                    onValueChange={(value) => setPermissions({ ...permissions, createCustomers: value })}
                  />
                  <PermissionSwitch
                    label="Edit Customers"
                    description="Can edit customer information"
                    value={permissions.editCustomers}
                    onValueChange={(value) => setPermissions({ ...permissions, editCustomers: value })}
                  />
                  <PermissionSwitch
                    label="Delete Customers"
                    description="Can delete customers"
                    value={permissions.deleteCustomers}
                    onValueChange={(value) => setPermissions({ ...permissions, deleteCustomers: value })}
                  />
                  <PermissionSwitch
                    label="Edit Balance"
                    description="Can modify customer balance"
                    value={permissions.editBalance}
                    onValueChange={(value) => setPermissions({ ...permissions, editBalance: value })}
                  />
                  <PermissionSwitch
                    label="View Servers"
                    description="Can view server information"
                    value={permissions.viewServers}
                    onValueChange={(value) => setPermissions({ ...permissions, viewServers: value })}
                  />
                  <PermissionSwitch
                    label="Send Messages"
                    description="Can send messages to customers"
                    value={permissions.sendMessages}
                    onValueChange={(value) => setPermissions({ ...permissions, sendMessages: value })}
                  />
                  <PermissionSwitch
                    label="View Reports"
                    description="Can view reports and analytics"
                    value={permissions.viewReports}
                    onValueChange={(value) => setPermissions({ ...permissions, viewReports: value })}
                  />
                </View>
              )}

              <Button title="Create User" onPress={handleCreateUser} loading={loading} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal visible={showPermissionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Permissions</Text>
              <Pressable onPress={() => { setShowPermissionsModal(false); setSelectedUser(null); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.userName}>{selectedUser?.username}</Text>
              
              <View style={styles.permissionsSection}>
                <PermissionSwitch
                  label="View Customers"
                  description="Can view customer list and details"
                  value={permissions.viewCustomers}
                  onValueChange={(value) => setPermissions({ ...permissions, viewCustomers: value })}
                />
                <PermissionSwitch
                  label="Create Customers"
                  description="Can create new customers"
                  value={permissions.createCustomers}
                  onValueChange={(value) => setPermissions({ ...permissions, createCustomers: value })}
                />
                <PermissionSwitch
                  label="Edit Customers"
                  description="Can edit customer information"
                  value={permissions.editCustomers}
                  onValueChange={(value) => setPermissions({ ...permissions, editCustomers: value })}
                />
                <PermissionSwitch
                  label="Delete Customers"
                  description="Can delete customers"
                  value={permissions.deleteCustomers}
                  onValueChange={(value) => setPermissions({ ...permissions, deleteCustomers: value })}
                />
                <PermissionSwitch
                  label="Edit Balance"
                  description="Can modify customer balance"
                  value={permissions.editBalance}
                  onValueChange={(value) => setPermissions({ ...permissions, editBalance: value })}
                />
                <PermissionSwitch
                  label="View Servers"
                  description="Can view server information"
                  value={permissions.viewServers}
                  onValueChange={(value) => setPermissions({ ...permissions, viewServers: value })}
                />
                <PermissionSwitch
                  label="Send Messages"
                  description="Can send messages to customers"
                  value={permissions.sendMessages}
                  onValueChange={(value) => setPermissions({ ...permissions, sendMessages: value })}
                />
                <PermissionSwitch
                  label="View Reports"
                  description="Can view reports and analytics"
                  value={permissions.viewReports}
                  onValueChange={(value) => setPermissions({ ...permissions, viewReports: value })}
                />
              </View>

              <Button title="Update Permissions" onPress={handleUpdatePermissions} loading={loading} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Credit Modal */}
      <Modal visible={showCreditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.creditModalContent}>
            <Text style={styles.modalTitle}>Add Credit</Text>
            <Text style={styles.userName}>{selectedUser?.username}</Text>
            <Text style={styles.currentBalance}>
              Current Balance: ₹{selectedUser?.balance || 0}
            </Text>
            <Input
              label="Credit Amount"
              value={formData.credit}
              onChangeText={(text) => setFormData({ ...formData, credit: text })}
              placeholder="0"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowCreditModal(false);
                  setSelectedUser(null);
                  setFormData({ ...formData, credit: '' });
                }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Add"
                onPress={handleAddCredit}
                loading={loading}
                variant="success"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userHeader: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  employeeActions: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    height: 40,
  },
  resellerInfo: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  creditButton: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  modalScroll: {
    padding: spacing.md,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleButton: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  permissionsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  creditModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  currentBalance: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
