import { CustomerMessage } from '@/types';

const MESSAGES_KEY = 'isp_customer_messages';

export const messagingService = {
  getAllMessages: (): CustomerMessage[] => {
    const messagesStr = localStorage.getItem(MESSAGES_KEY);
    return messagesStr ? JSON.parse(messagesStr) : [];
  },

  getCustomerMessages: (customerId: string): CustomerMessage[] => {
    return messagingService.getAllMessages().filter(m => m.customerId === customerId);
  },

  sendMessage: (
    customerId: string,
    customerName: string,
    subject: string,
    message: string,
    type: CustomerMessage['type'],
    sentBy: string
  ): CustomerMessage => {
    const messages = messagingService.getAllMessages();
    const newMessage: CustomerMessage = {
      id: `msg-${Date.now()}`,
      customerId,
      customerName,
      subject,
      message,
      type,
      sentBy,
      sentAt: new Date().toISOString(),
      read: false,
    };

    messages.push(newMessage);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));

    return newMessage;
  },

  sendCredentialsMessage: (
    customerId: string,
    customerName: string,
    username: string,
    password: string,
    packageName: string,
    sentBy: string
  ): CustomerMessage => {
    const subject = 'Your Internet Connection Credentials';
    const message = `Dear ${customerName},\n\nYour internet connection has been activated!\n\nUsername: ${username}\nPassword: ${password}\nPackage: ${packageName}\n\nPlease keep these credentials safe.\n\nThank you for choosing our service!`;
    
    return messagingService.sendMessage(
      customerId,
      customerName,
      subject,
      message,
      'credentials',
      sentBy
    );
  },

  sendBillAlertMessage: (
    customerId: string,
    customerName: string,
    balance: number,
    packagePrice: number,
    daysRemaining: number,
    sentBy: string
  ): CustomerMessage => {
    const subject = 'Bill Payment Reminder';
    const message = `Dear ${customerName},\n\nThis is a reminder about your internet bill.\n\nCurrent Balance: ₹${balance}\nMonthly Package: ₹${packagePrice}\nEstimated Days Remaining: ${daysRemaining}\n\nPlease recharge your account to avoid service interruption.\n\nThank you!`;
    
    return messagingService.sendMessage(
      customerId,
      customerName,
      subject,
      message,
      'bill_alert',
      sentBy
    );
  },

  sendSuspensionMessage: (
    customerId: string,
    customerName: string,
    sentBy: string
  ): CustomerMessage => {
    const subject = 'Service Suspended - Low Balance';
    const message = `Dear ${customerName},\n\nYour internet service has been suspended due to insufficient balance.\n\nPlease recharge your account immediately to resume service.\n\nFor assistance, please contact our support team.\n\nThank you!`;
    
    return messagingService.sendMessage(
      customerId,
      customerName,
      subject,
      message,
      'suspension',
      sentBy
    );
  },

  markAsRead: (messageId: string): void => {
    const messages = messagingService.getAllMessages();
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }
  },

  deleteMessage: (messageId: string): void => {
    const messages = messagingService.getAllMessages();
    const filtered = messages.filter(m => m.id !== messageId);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(filtered));
  },
};
