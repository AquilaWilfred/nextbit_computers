export interface Notification {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  bgColor: string;
  actionLink: string;
  actionText: string;
  time?: string;
}

export interface NotificationWithState extends Notification {
  isRead: boolean;
}

export type IconMap = Record<string, React.ElementType>;