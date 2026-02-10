import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { customerService } from '@/services/customerService';
import { mikrotikService } from '@/services/mikrotikService';
import { ledgerService } from '@/services/ledgerService';
import { authService } from '@/services/authService';
import { Customer, Package } from '@/types';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function CustomersScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    address: '',
    packageId: '',
    serverId: '',
    balance: '',
    ipAddress: '',
    onuId: '',
  });

  const loadData = () => {
    const allCustomers = user?.role === 'reseller'
      ? customerService.getCustomersByCreator(user.id)
      : customerService.getAllCustomers();
    setCustomers(allCustomers);
    setPackages(customerService.getAllPackages());
    setServers(mikrotikService.getAllServers());
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      fullName: '',
      phone: '',
      email: '',
      address: '',
      packageId: '',
      serverId: '',
      balance: '',
      ipAddress: '',
      onuId: '',
    });
  };

  const handleCreateCustomer = async () => {
    if (!formData.username || !formData.password || !formData.fullName || !formData.packageId) {
      showAlert('Error', 'Please fill all required fields');
      return;
    }

    if (servers.length === 0) {
      showAlert('Error', 'Please add a Mikrotik server first');
      return;
    }

    const serverId = formData.serverId || servers[0].id;
    const balance = parseFloat(formData.balance) || 0;

    // Check reseller balance
    if (user?.role === 'reseller') {
      const pkg = packages.find(p => p.id === formData.packageId);
      if (pkg && balance > 0) {
        const resellerBalance = authService.getResellerBalance(user.id);
        if (resellerBalance < balance) {
          showAlert('Error', 'Insufficient balance');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const customer = await customerService.createCustomer(
        {
          ...formData,
          serverId,
          balance,
          createdBy: user?.id || '',
        },
        true, // createOnMikrotik
        true, // sendCredentials
        user?.username || 'admin'
      );

      // Deduct from reseller balance
      if (user?.role === 'reseller' && balance > 0) {
        authService.updateResellerBalance(user.id, -balance);
        ledgerService.addResellerTransaction(
          user.id,
          user.username,
          'customer_creation',
          balance,
          authService.getResellerBalance(user.id),
          `Created customer ${customer.username}`
        );
      }

      // Add transaction
      ledgerService.addTransaction(
        customer.id,
        customer.fullName,
        'recharge',
        balance,
        balance,
        'Initial recharge',
        user?.username || ''
      );

      showAlert('Success', 'Customer created successfully');
      resetForm();
      setShowAddModal(false);
      loadData();
    } catch (error) {
      showAlert('Error', 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBalance = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ ...formData, balance: customer.balance.toString() });
    setShowEditModal(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedCustomer) return;

    const newBalance = parseFloat(formData.balance) || 0;
    const difference = newBalance - selectedCustomer.balance;

    // Check admin/employee permissions
    if (user?.role !== 'admin' && user?.role !== 'employee') {
      showAlert('Error', 'Only admin and employees can edit balance');
      return;
    }

    setLoading(true);

    try {
      await customerService.updateCustomerBalance(selectedCustomer.id, newBalance);

      ledgerService.addTransaction(
        selectedCustomer.id,
        selectedCustomer.fullName,
        difference > 0 ? 'recharge' : 'adjustment',
        Math.abs(difference),
        newBalance,
        difference > 0 ? 'Balance recharge' : 'Balance adjustment',
        user?.username || ''
      );

      showAlert('Success', 'Balance updated successfully');
      setShowEditModal(false);
      setSelectedCustomer(null);
      loadData();
    } catch (error) {
      showAlert('Error', 'Failed to update balance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="person-off" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No customers yet</Text>
            <Text style={styles.emptySubtext}>Create your first customer</Text>
          </View>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.fullName}</Text>
                  <Text style={styles.customerUsername}>@{customer.username}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(customer.status) }]}>
                  <Text style={styles.statusText}>{customer.status}</Text>
                </View>
              </View>

              <View style={styles.customerDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{customer.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{customer.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="wifi" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{customer.packageName}</Text>
                </View>
              </View>

              <View style={styles.customerFooter}>
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>Balance</Text>
                  <Text style={styles.balanceValue}>₹{customer.balance}</Text>
                </View>
                {(user?.role === 'admin' || user?.role === 'employee') && (
                  <Button
                    title="Edit Balance"
                    onPress={() => handleEditBalance(customer)}
                    variant="secondary"
                    style={styles.editButton}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Customer</Text>
              <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Input
                label="Username (PPPoE)*"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="pppoe_user1"
              />
              <Input
                label="Password*"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />
              <Input
                label="Full Name*"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="John Doe"
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+91 9876543210"
                keyboardType="phone-pad"
              />
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="customer@email.com"
                keyboardType="email-address"
              />
              <Input
                label="Address"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Full address"
              />

              <Input
                label="IP Address (Optional)"
                value={formData.ipAddress}
                onChangeText={(text) => setFormData({ ...formData, ipAddress: text })}
                placeholder="192.168.1.100"
              />

              <Input
                label="ONU ID (Fiber/GPON Optional)"
                value={formData.onuId}
                onChangeText={(text) => setFormData({ ...formData, onuId: text })}
                placeholder="ONU123456"
              />

              <Text style={styles.selectLabel}>Package*</Text>
              <View style={styles.packageGrid}>
                {packages.map((pkg) => (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setFormData({ ...formData, packageId: pkg.id })}
                    style={[
                      styles.packageOption,
                      formData.packageId === pkg.id && styles.packageOptionSelected,
                    ]}
                  >
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>₹{pkg.price}/mo</Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Initial Balance"
                value={formData.balance}
                onChangeText={(text) => setFormData({ ...formData, balance: text })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Button title="Create Customer" onPress={handleCreateCustomer} loading={loading} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Balance Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Edit Balance</Text>
            <Text style={styles.customerName}>{selectedCustomer?.fullName}</Text>
            <Input
              label="New Balance"
              value={formData.balance}
              onChangeText={(text) => setFormData({ ...formData, balance: text })}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => { setShowEditModal(false); setSelectedCustomer(null); }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Update"
                onPress={handleUpdateBalance}
                loading={loading}
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
  customerCard: {
    marginBottom: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  customerUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  customerDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  customerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    height: 36,
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
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  packageOption: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  packageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  editModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
