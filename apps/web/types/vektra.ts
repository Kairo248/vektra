/** Mirrors Spring DTOs (Vektra API). */

export type UserType = "ADMIN" | "USER";

export type AccountState = "PENDING" | "ACTIVE" | "SUSPENDED";

export type WalletState = "ACTIVE" | "FROZEN";

export type EarnType = "AUTOMATIC" | "MANUAL";

export type TaskStatus = "ACTIVE" | "INACTIVE";

export type TaskCompletionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TransactionType = "EARN" | "SPEND";

export type TransactionStatus = "PENDING" | "COMPLETED";

export interface UserResponse {
  id: number;
  name: string;
  surname: string;
  userType: UserType;
  createdAt: string;
}

export interface AccountResponse {
  id: number;
  userId: number;
  email: string;
  accountState: AccountState;
  createdAt: string;
  updatedAt: string;
}

export interface WalletResponse {
  id: number;
  userId: number;
  walletState: WalletState;
  createdAt: string;
  updatedAt: string;
}

export interface SignupResponse {
  user: UserResponse;
  account: AccountResponse;
  wallet: WalletResponse;
  /** Present only when the API issues JWTs (auth disabled for E2E). */
  accessToken?: string;
}

export interface SignupRequest {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TaskResponse {
  id: number;
  name: string;
  description: string;
  rewardAmount: number;
  earnType: EarnType;
  status: TaskStatus;
  createdAt: string;
}

export interface TaskCompletionResponse {
  id: number;
  userId: number;
  taskId: number;
  taskName: string;
  taskDescription: string;
  rewardAmount: number;
  status: TaskCompletionStatus;
  completedAt: string;
  updatedAt: string;
}

export interface WalletBalanceResponse {
  userId: number;
  balance: number;
}

export interface TransactionResponse {
  id: number;
  userId: number;
  taskId: number | null;
  taskCompletionId: number | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
}

export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

/** Admin user row from GET /v1/admin/users */
export interface AdminUserListItem {
  userId: number;
  name: string;
  surname: string;
  accountId: number;
  email: string;
  accountState: AccountState;
}

export interface CreateTaskRequest {
  name: string;
  description: string;
  rewardAmount: number;
  earnType: EarnType;
  status?: TaskStatus;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}
