/** Mirrors Spring DTOs (Vektra API). */

export type UserType = "ADMIN" | "USER";

export type AccountState = "PENDING" | "ACTIVE" | "SUSPENDED";

export type WalletState = "ACTIVE" | "FROZEN";

export type EarnType = "AUTOMATIC" | "MANUAL";

export type TaskStatus = "ACTIVE" | "INACTIVE";

export type TaskCompletionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TransactionType = "EARN" | "SPEND" | "TRANSFER_IN" | "TRANSFER_OUT";

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
  transferId: string | null;
  counterpartyUserId: number | null;
  /** Counterparty's first name; null on non-transfer rows or if the user was removed. */
  counterpartyName: string | null;
  /** Counterparty's surname; null on non-transfer rows or if the user was removed. */
  counterpartySurname: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
}

export interface TransferRequest {
  recipientId: number;
  recipientEmail?: string;
  recipientName?: string;
  amount: number;
}

export interface TransferResponse {
  transferId: string;
  senderId: number;
  recipientId: number;
  amount: number;
  senderTransactionId: number;
  recipientTransactionId: number;
  senderBalanceAfter: number;
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

/**
 * PATCH payload for `/v1/users/{id}`. Both fields are optional — omit a key
 * (or pass `undefined`) to leave that attribute unchanged. Sending an
 * empty/blank string is rejected by the backend.
 */
export interface UpdateUserRequest {
  name?: string;
  surname?: string;
}

export type StoreItemStatus = "ACTIVE" | "INACTIVE";

export interface StoreItemResponse {
  id: number;
  name: string;
  description: string;
  priceAmount: number;
  status: StoreItemStatus;
  /** null = unlimited stock */
  stock: number | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreItemRequest {
  name: string;
  description: string;
  priceAmount: number;
  stock?: number | null;
  category?: string | null;
  status?: StoreItemStatus;
}

export interface UpdateStoreItemRequest {
  name?: string;
  description?: string;
  priceAmount?: number;
  stock?: number;
  unlimitedStock?: boolean;
  category?: string | null;
}

export interface UpdateStoreItemStatusRequest {
  status: StoreItemStatus;
}
