// Decimal columns arrive from the API as strings, e.g. "2450.75".

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  balance: string;
  createdAt: string;
}

export interface Card {
  id: number;
  userId: number;
  cardNumber: string;
  cardType: 'DEBIT' | 'CREDIT';
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  cardId: number | null;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string;
  merchant: string | null;
  createdAt: string;
}

interface UserRef {
  id: number;
  username: string;
  name: string;
}

export interface Transfer {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  description: string | null;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  fromUser: UserRef;
  toUser: UserRef;
}

export interface BankDocument {
  id: number;
  fileName: string;
  fileType: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  metadata: { chunkCount?: number; charCount?: number } | null;
  createdAt: string;
  uploadedBy: { id: number; username: string };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  toolsUsed: string[];
  sources: { documentId: number; fileName: string }[];
}
