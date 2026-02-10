import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { customerService } from '@/services/customerService';
import { mikrotikService } from '@/services/mikrotikService';
import { onuService } from '@/services/onuService';
import { Customer, ONUStatus } from '@/types';
import { colors, spacing } from '@/constants/theme';

export default function MonitoringScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [onuStatus, setOnuStatus] = useState<ONUStatus | null>(null);
  const [pingResult, setPingResult] = useState<{ success: boolean; latency?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCustomers = () => {
    const allCustomers = user?.role === 'reseller'
      ? customerService.getCustomersByCreator(user.id)
      : customerService.getAllCustomers();
    setCustomers(allCustomers);
  };

  useEffect(() => {
    loadCustomers();
  }, [user]);

  const handleCheckPing = async (customer: Customer) => {
    if (!customer.ipAddress) {
      showAlert('Error', 'No IP address configured for this customer');
      return;
    }

    setLoading(true);
    setPingResult(null);

    try {
      const result = await mikrotikService.pingHost(customer.ipAddress);
      setPingResult(result);
      
      if (result.success) {
        showAlert('Success', `Ping successful: ${result.latency}ms`);
      } else {
        showAlert('Error', 'Ping failed - Host unreachable');
      }
    } catch (error) {
      showAlert('Error', 'Failed to ping host');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckONU = async (customer: Customer) => {
    if (!customer.onuId) {
      showAlert('Error', 'No ONU ID configured for this customer');
      return;
    }

    setLoading(true);
    setSelectedCustomer(customer);

    try {
      const status = await onuService.checkONUStatus(customer.onuId, customer.id);
      setOnuStatus(status);
    } catch (error) {
      showAlert('Error', 'Failed to check ONU status');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredCustomers = customers.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSignalColor = (rxPower: number) => {
    const quality = onuService.getSignalQuality(rxPower);
    return quality.color;
  };

  const getSignalLevel = (rxPower: number) => {
    const quality = onuService.getSignalQuality(rxPower);
    return quality.level.toUpperCase();
  };

  const getONUStatusIcon = (status: ONUStatus['status']) => {
    switch (status) {
      case 'online':
        return 'check-circle';
      case 'offline':
        return 'cancel';
      case 'los':
        return 'warning';
      case 'dying_gasp':
        return 'error';
      default:
        return 'help';
    }
  };

  const getONUStatusColor = (status: ONUStatus['status']) => {
    switch (status) {
      case 'online':
        return colors.success;
      case 'offline':
        return colors.textMuted;
      case 'los':
        return colors.warning;
      case 'dying_gasp':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Monitoring</Text>
      </View>

      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search customers..."
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="router" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.fullName}</Text>
                  <Text style={styles.customerUsername}>@{customer.username}</Text>
                  <View style={styles.customerDetails}>
                    {customer.ipAddress && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="language" size={14} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{customer.ipAddress}</Text>
                      </View>
                    )}
                    {customer.onuId && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="router" size={14} color={colors.textSecondary} />
                        <Text style={styles.detailText}>ONU: {customer.onuId}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.statusDot, { 
                  backgroundColor: customer.status === 'active' ? colors.success : colors.error 
                }]} />
              </View>

              <View style={styles.actionRow}>
                {customer.ipAddress && (
                  <Button
                    title="Ping"
                    onPress={() => handleCheckPing(customer)}
                    loading={loading}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                )}
                {customer.onuId && (
                  <Button
                    title="Check ONU"
                    onPress={() => handleCheckONU(customer)}
                    loading={loading}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                )}
              </View>
            </Card>
          ))
        )}

        {/* ONU Status Display */}
        {onuStatus && selectedCustomer && (
          <Card style={styles.onuStatusCard}>
            <View style={styles.onuHeader}>
              <Text style={styles.onuTitle}>ONU Status - {selectedCustomer.fullName}</Text>
              <Pressable onPress={() => { setOnuStatus(null); setSelectedCustomer(null); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.onuStatusRow}>
              <MaterialIcons
                name={getONUStatusIcon(onuStatus.status) as any}
                size={32}
                color={getONUStatusColor(onuStatus.status)}
              />
              <Text style={[styles.onuStatusText, { color: getONUStatusColor(onuStatus.status) }]}>
                {onuStatus.status.toUpperCase()}
              </Text>
            </View>

            <View style={styles.onuDetailsGrid}>
              <View style={styles.onuDetailItem}>
                <Text style={styles.onuDetailLabel}>RX Power (Optical)</Text>
                <Text style={[styles.onuDetailValue, { color: getSignalColor(onuStatus.rxPower) }]}>
                  {onuStatus.rxPower} dBm
                </Text>
                <Text style={styles.onuDetailSubtext}>{getSignalLevel(onuStatus.rxPower)}</Text>
              </View>

              <View style={styles.onuDetailItem}>
                <Text style={styles.onuDetailLabel}>TX Power (Laser)</Text>
                <Text style={styles.onuDetailValue}>{onuStatus.txPower} dBm</Text>
                <Text style={styles.onuDetailSubtext}>Normal: 1-4 dBm</Text>
              </View>

              <View style={styles.onuDetailItem}>
                <Text style={styles.onuDetailLabel}>Temperature</Text>
                <Text style={styles.onuDetailValue}>{onuStatus.temperature}°C</Text>
                <Text style={styles.onuDetailSubtext}>
                  {onuStatus.temperature > 60 ? 'High' : 'Normal'}
                </Text>
              </View>

              <View style={styles.onuDetailItem}>
                <Text style={styles.onuDetailLabel}>Distance</Text>
                <Text style={styles.onuDetailValue}>{onuStatus.distance}m</Text>
                <Text style={styles.onuDetailSubtext}>
                  {(onuStatus.distance / 1000).toFixed(2)} km
                </Text>
              </View>
            </View>

            <View style={styles.onuFooter}>
              <Text style={styles.onuLastUpdate}>
                Last updated: {new Date(onuStatus.lastUpdate).toLocaleString()}
              </Text>
              <Button
                title="Refresh"
                onPress={() => handleCheckONU(selectedCustomer)}
                loading={loading}
                variant="secondary"
                style={styles.refreshButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
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
  customerDetails: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 40,
  },
  onuStatusCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  onuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  onuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  onuStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  onuStatusText: {
    fontSize: 24,
    fontWeight: '700',
  },
  onuDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  onuDetailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  onuDetailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  onuDetailValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  onuDetailSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  onuFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  onuLastUpdate: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  refreshButton: {
    paddingHorizontal: spacing.md,
    height: 36,
  },
});
