export interface MessageType {
  id: number;
  sender: 'ai' | 'human';
  content: string;
  avatarUrl?: string;
  timestamp?: string; // optional timestamp
  status?: 'sent' | 'delivered' | 'seen'; // or whatever statuses you use
}
