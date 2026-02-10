import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ServerCard } from '@/components/dashboard/ServerCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAlert } from '@/template';
import { mikrotikService } from '@/services/mikrotikService';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function ServersScreen() {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [servers, setServers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '8728',
    username: 'admin',
    password: '',
  });

  const loadServers = () => {
    setServers(mikrotikService.getAllServers());
  };

  useEffect(() => {
    loadServers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: '8728',
      username: 'admin',
      password: '',
    });
  };

  const handleAddServer = () => {
    if (!formData.name || !formData.host || !formData.password) {
      showAlert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      mikrotikService.addServer({
        name: formData.name,
        host: formData.host,
        port: parseInt(formData.port) || 8728,
        username: formData.username,
        password: formData.password,
      });

      showAlert('Success', 'Server added successfully');
      resetForm();
      setShowAddModal(false);
      loadServers();
    } catch (error) {
      showAlert('Error', 'Failed to add server');
    } finally {
      setLoading(false);
    }
  };

  const handlePingServer = async (server: any) => {
    const result = await mikrotikService.pingHost(server.host);
    if (result.success) {
      showAlert('Success', `Server is online (${result.latency}ms)`);
    } else {
      showAlert('Error', 'Server is not reachable');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mikrotik Servers</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        {servers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="dns" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No servers configured</Text>
            <Text style={styles.emptySubtext}>Add your first Mikrotik server</Text>
          </View>
        ) : (
          servers.map((server) => (
            <View key={server.id}>
              <ServerCard server={server} onPress={() => handlePingServer(server)} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Server Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Mikrotik Server</Text>
              <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Input
                label="Server Name*"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Main Router"
              />
              <Input
                label="Host/IP Address*"
                value={formData.host}
                onChangeText={(text) => setFormData({ ...formData, host: text })}
                placeholder="192.168.1.1"
              />
              <Input
                label="API Port"
                value={formData.port}
                onChangeText={(text) => setFormData({ ...formData, port: text })}
                placeholder="8728"
                keyboardType="numeric"
              />
              <Input
                label="Username"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="admin"
              />
              <Input
                label="Password*"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Enter password"
                secureTextEntry
              />

              <Button title="Add Server" onPress={handleAddServer} loading={loading} />
            </ScrollView>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
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
});
