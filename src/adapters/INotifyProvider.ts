export interface NotificationMessage {
  title: string;
  body: string;
  recipientId: string;
  recipientType: 'knight' | 'citizen' | 'merchant' | 'partner';
  data?: Record<string, string>;
  sound?: boolean;
}

export interface INotifyProvider {
  name: string;
  sendNotification(msg: NotificationMessage): Promise<{ success: boolean; messageId?: string }>;
  playAlertSound(type: 'mission_incoming' | 'mission_accepted' | 'success' | 'alert'): void;
}
