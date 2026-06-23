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

/** PATCH /v1/users/{id} — every field optional (null/undefined means "leave alone"). */
export interface UpdateUserRequest {
  name?: string;
  surname?: string;
}

/** POST /v1/auth/change-password — caller must re-prove the current password. */
export interface ChangePasswordRequest {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

/**
 * 128-d L2-normalized face embedding produced by face-api.js. Same shape on
 * both POST /v1/users/{id}/face (enrollment) and POST /v1/auth/face-login.
 * Sent as a plain JSON number array — Spring's float[] DTO parses that
 * directly.
 */
export interface FaceEnrollRequest {
  embedding: number[];
}

export interface FaceLoginRequest {
  embedding: number[];
}

/** GET /v1/users/{id}/face — `enrolledAt` is omitted when not enrolled. */
export interface FaceStatusResponse {
  enrolled: boolean;
  enrolledAt?: string;
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
  /** UUID linking the two legs of a peer-to-peer transfer; null on non-transfer rows. */
  transferId: string | null;
  /** Other party in a transfer: sender on TRANSFER_IN, recipient on TRANSFER_OUT. */
  counterpartyUserId: number | null;
  /** Counterparty's first name; null on non-transfer rows or if the user was removed. */
  counterpartyName: string | null;
  /** Counterparty's surname; null on non-transfer rows or if the user was removed. */
  counterpartySurname: string | null;
  /** Set on SPEND rows from a store purchase. */
  purchaseId: number | null;
  storeItemId: number | null;
  /** Store item name when storeItemId is set; null if the item was removed. */
  storeItemName: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
}

/** POST /v1/users/{senderId}/transfers body. recipientId is required; email/name are
 *  optional "Confirmation of Payee" fields the backend validates against the recipient. */
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

export type StoreItemStatus = "ACTIVE" | "INACTIVE";

export type PurchaseStatus = "COMPLETED";

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

export interface CreatePurchaseRequest {
  storeItemId: number;
}

export interface PurchaseResponse {
  id: number;
  userId: number;
  storeItemId: number;
  storeItemName: string;
  amountPaid: number;
  status: PurchaseStatus;
  transactionId: number;
  balanceAfter: number;
  createdAt: string;
}
