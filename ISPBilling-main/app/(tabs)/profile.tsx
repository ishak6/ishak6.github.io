import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { authService } from '@/services/authService';
import { ledgerService } from '@/services/ledgerService';
import { colors, spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (user?.role === 'admin') {
        authService.setAdminPassword(newPassword);
      } else if (user?.id) {
        authService.updateUserPassword(user.id, newPassword);
      }

      showAlert('Success', 'Password updated successfully');
      setNewPassword('');
    } catch (error) {
      showAlert('Error', 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const recentTransactions = user?.role === 'reseller'
    ? ledgerService.getResellerTransactions(user.id).slice(0, 5)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="account-circle" size={80} color={colors.primary} />
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        </Card>

        {user?.role === 'reseller' && (
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>₹{user.balance || 0}</Text>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Input
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secureTextEntry
          />
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            loading={loading}
            variant="secondary"
          />
        </Card>

        {user?.role === 'reseller' && recentTransactions.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {recentTransactions.map((trans) => (
              <View key={trans.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{trans.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(trans.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: trans.type === 'credit_purchase' ? colors.success : colors.error },
                  ]}
                >
                  {trans.type === 'credit_purchase' ? '+' : '-'}₹{trans.amount}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <Button title="Logout" onPress={handleLogout} variant="danger" style={styles.logoutButton} />
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
  scrollContent: {
    padding: spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
