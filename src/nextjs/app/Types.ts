export interface User {
  id: number;
  user_email: string;
  role: string;
}

export interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export interface FullUser {
   id: number;
  user_email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface GeneratedCredentials {
  id: number;
  email: string;
  password: string;
}

export type FilterStatus = 'all' | 'active' | 'inactive';

