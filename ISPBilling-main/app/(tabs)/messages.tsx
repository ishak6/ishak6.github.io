import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { messagingService } from '@/services/messagingService';
import { customerService } from '@/services/customerService';
import { Customer, CustomerMessage } from '@/types';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    subject: '',
    message: '',
  });

  const loadData = () => {
    setMessages(messagingService.getAllMessages().sort((a, b) => 
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    ));
    
    const allCustomers = user?.role === 'reseller'
      ? customerService.getCustomersByCreator(user.id)
      : customerService.getAllCustomers();
    setCustomers(allCustomers);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const resetForm = () => {
    setFormData({
      customerId: '',
      subject: '',
      message: '',
    });
  };

  const handleSendMessage = () => {
    if (!formData.customerId || !formData.subject || !formData.message) {
      showAlert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const customer = customers.find(c => c.id === formData.customerId);
      if (!customer) {
        showAlert('Error', 'Customer not found');
        return;
      }

      messagingService.sendMessage(
        customer.id,
        customer.fullName,
        formData.subject,
        formData.message,
        'general',
        user?.username || 'admin'
      );

      showAlert('Success', 'Message sent successfully');
      resetForm();
      setShowSendModal(false);
      loadData();
    } catch (error) {
      showAlert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (type: CustomerMessage['type']) => {
    switch (type) {
      case 'credentials':
        return 'vpn-key';
      case 'bill_alert':
        return 'notifications';
      case 'suspension':
        return 'warning';
      default:
        return 'mail';
    }
  };

  const getMessageColor = (type: CustomerMessage['type']) => {
    switch (type) {
      case 'credentials':
        return colors.info;
      case 'bill_alert':
        return colors.warning;
      case 'suspension':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  // Check permission
  const canSendMessages = user?.role === 'admin' || user?.permissions?.sendMessages;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {canSendMessages && (
          <Pressable onPress={() => setShowSendModal(true)} style={styles.addButton}>
            <MaterialIcons name="send" size={20} color={colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No messages</Text>
          </View>
        ) : (
          messages.map((message) => (
            <Card key={message.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.messageIconContainer}>
                  <MaterialIcons
                    name={getMessageIcon(message.type) as any}
                    size={24}
                    color={getMessageColor(message.type)}
                  />
                </View>
                <View style={styles.messageInfo}>
                  <Text style={styles.messageCustomer}>{message.customerName}</Text>
                  <Text style={styles.messageDate}>
                    {new Date(message.sentAt).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: getMessageColor(message.type) }]}>
                  <Text style={styles.typeText}>{message.type.replace('_', ' ')}</Text>
                </View>
              </View>

              <Text style={styles.messageSubject}>{message.subject}</Text>
              <Text style={styles.messageText} numberOfLines={3}>
                {message.message}
              </Text>

              <View style={styles.messageMeta}>
                <Text style={styles.messageSentBy}>Sent by: {message.sentBy}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Send Message Modal */}
      <Modal visible={showSendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Message</Text>
              <Pressable onPress={() => { setShowSendModal(false); resetForm(); }}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.selectLabel}>Select Customer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerList}>
                {customers.map((customer) => (
                  <Pressable
                    key={customer.id}
                    onPress={() => setFormData({ ...formData, customerId: customer.id })}
                    style={[
                      styles.customerChip,
                      formData.customerId === customer.id && styles.customerChipSelected,
                    ]}
                  >
                    <Text style={styles.customerChipText}>{customer.fullName}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Input
                label="Subject"
                value={formData.subject}
                onChangeText={(text) => setFormData({ ...formData, subject: text })}
                placeholder="Enter subject"
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={styles.textArea}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                placeholder="Enter your message"
                multiline
                numberOfLines={6}
                placeholderTextColor={colors.textMuted}
              />

              <Button title="Send Message" onPress={handleSendMessage} loading={loading} />
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
  messageCard: {
    marginBottom: spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  messageInfo: {
    flex: 1,
  },
  messageCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  messageDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  messageMeta: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  messageSentBy: {
    fontSize: 12,
    color: colors.textMuted,
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
    maxHeight: '85%',
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
  customerList: {
    marginBottom: spacing.md,
  },
  customerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  customerChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  customerChipText: {
    fontSize: 14,
    color: colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  textArea: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
