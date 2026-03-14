export type UserRole = 'buyer' | 'seller';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  balance: number;
  escrowBalance: number;
  level: number;
  exp: number;
  completedTasks: number;
  rejectedTasks: number;
  rating: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  activeReferrals: number;
  referralEarnings: number;
  createdAt: string;
}

export type TaskCategory = 'app_install' | 'telegram' | 'website' | 'social';
export type TaskStatus = 'active' | 'paused' | 'completed';

export interface Task {
  id: string;
  buyerId: string;
  title: string;
  description: string;
  reward: number;
  category: TaskCategory;
  maxWorkers: number;
  currentWorkers: number;
  status: TaskStatus;
  isFeatured: boolean;
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  taskId: string;
  workerId: string;
  buyerId: string;
  proofUrl: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  autoApproveAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'reward' | 'fee' | 'escrow_lock' | 'escrow_release';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  fee?: number;
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod?: string;
  paymentDetails?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}
