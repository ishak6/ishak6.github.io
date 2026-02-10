import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatCard } from '@/components/dashboard/StatCard';
import { ServerCard } from '@/components/dashboard/ServerCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { customerService } from '@/services/customerService';
import { mikrotikService } from '@/services/mikrotikService';
import { ledgerService } from '@/services/ledgerService';
import { colors, spacing } from '@/constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    todayRevenue: 0,
    monthRevenue: 0,
  });
  const [servers, setServers] = useState<any[]>([]);

  const loadData = () => {
    const customers = user?.role === 'reseller' 
      ? customerService.getCustomersByCreator(user.id)
      : customerService.getAllCustomers();
    
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const todayRevenue = ledgerService.getTodayRevenue();
    const monthRevenue = ledgerService.getMonthRevenue();

    setStats({
      totalCustomers: customers.length,
      activeCustomers,
      todayRevenue,
      monthRevenue,
    });

    if (user?.role === 'admin') {
      setServers(mikrotikService.getAllServers());
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.username}</Text>
          </View>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon="people"
            iconColor={colors.primary}
          />
          <StatCard
            title="Active"
            value={stats.activeCustomers}
            icon="check-circle"
            iconColor={colors.success}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Today Revenue"
            value={`₹${stats.todayRevenue}`}
            icon="account-balance-wallet"
            iconColor={colors.warning}
          />
          <StatCard
            title="Month Revenue"
            value={`₹${stats.monthRevenue}`}
            icon="trending-up"
            iconColor={colors.info}
          />
        </View>

        {user?.role === 'reseller' && (
          <View style={styles.resellerBalance}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>₹{user.balance || 0}</Text>
          </View>
        )}

        {user?.role === 'admin' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mikrotik Servers</Text>
              <Button
                title="Add Server"
                onPress={() => router.push('/servers')}
                variant="secondary"
                style={styles.addButton}
              />
            </View>

            {servers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No servers configured</Text>
                <Text style={styles.emptySubtext}>Add your first Mikrotik server</Text>
              </View>
            ) : (
              servers.slice(0, 3).map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onPress={() => router.push('/servers')}
                />
              ))
            )}
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Button
            title="Create New Customer"
            onPress={() => router.push('/customers')}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resellerBalance: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    height: 36,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
  quickActions: {
    marginTop: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.md,
  },
});
