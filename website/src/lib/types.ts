/**
 * FlexiTaka Master TypeScript Definitions
 * 100% synchronized with Backend FastAPI Schemas and API Contract
 */

export type ServiceType = "CASH_OUT" | "RECHARGE";

export type OperatorCode = "GP" | "ROBI" | "BANGLALINK";

export type PayoutMethod = "BKASH" | "NAGAD" | "BANK";

export type OrderStatus =
  | "REQUESTED"
  | "WAITING_FOR_TRANSFER"
  | "TRANSFER_RECEIVED"
  | "UNDER_VERIFICATION"
  | "APPROVED"
  | "PAYOUT_PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "RECHARGE_PROCESSING";

export interface Operator {
  operator_code: OperatorCode;
  name: string;
  display_name: string;
  status: string;
  logo_key?: string;
  supported_services: string[];
  min_amount?: number;
  max_amount?: number;
}

export interface CashOutQuote {
  operator_code: OperatorCode;
  source_amount_bdt: string;
  source_amount_poisha: number;
  platform_fee_rate: string;
  platform_fee_amount_bdt: string;
  platform_fee_amount_poisha: number;
  payout_amount_bdt: string;
  payout_amount_poisha: number;
  currency: string;
  pricing_rule_version: number;
}

export interface RechargeQuote {
  operator_code: OperatorCode;
  recharge_amount_bdt: string;
  recharge_amount_poisha: number;
  discount_rate: string;
  discount_amount_bdt: string;
  discount_amount_poisha: number;
  customer_pay_amount_bdt: string;
  customer_pay_amount_poisha: number;
  currency: string;
  pricing_rule_version: number;
}

export interface GuestSession {
  guest_session_id: string;
  session_token: string;
  expires_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user_id: string;
  phone: string;
  role: string;
}

export interface CashOutOrderCreated {
  order_id: string;
  status: OrderStatus;
  operator_code: OperatorCode;
  source_mobile_number: string;
  source_amount_bdt: string;
  payout_amount_bdt: string;
  receiving_mobile_number: string;
  receiving_sim_label: string;
  tracking_token?: string;
  created_at: string;
}

export interface RechargeOrderCreated {
  order_id: string;
  status: OrderStatus;
  operator_code: OperatorCode;
  recharge_mobile_number: string;
  recharge_amount_bdt: string;
  customer_pay_amount_bdt: string;
  payment_account_number?: string;
  payment_display_number?: string;
  tracking_token?: string;
  created_at: string;
}

export interface PaymentAccount {
  account_id: string;
  method: string;
  account_name: string;
  account_number: string;
  display_number: string;
  account_type: string;
  is_active: boolean;
  qr_code_url?: string | null;
  instructions?: string;
  instructions_bn?: string;
}


export interface OrderEvent {
  event_id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  actor_type: string;
  note?: string | null;
  created_at: string;
}

export interface OrderDetail {
  order_id: string;
  service_type: ServiceType;
  user_id?: string | null;
  guest_session_id?: string | null;
  operator_code: OperatorCode;
  mobile_number: string;
  amount_bdt: string;
  amount_poisha: number;
  currency: string;
  status: OrderStatus;
  pricing_snapshot: Record<string, any>;
  payment_id?: string | null;
  payout_id?: string | null;
  cashout_details?: Record<string, any> | null;
  recharge_details?: Record<string, any> | null;
  tracking_token?: string | null;
  linked_from_guest_session_id?: string | null;
  events: OrderEvent[];
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

export interface OrderSummary {
  order_id: string;
  service_type: ServiceType;
  operator_code: OperatorCode;
  mobile_number: string;
  amount_bdt: string;
  amount_poisha: number;
  currency: string;
  status: OrderStatus;
  linked_from_guest_session_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  message_id: string;
  sender_type: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  ticket_id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  order_id?: string | null;
  messages: SupportMessage[];
  created_at: string;
  updated_at: string;
}

export interface InAppNotification {
  notification_id: string;
  title: string;
  body: string;
  type: string;
  order_id?: string | null;
  read: boolean;
  created_at: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface UserProfile {
  user_id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  language_preference: "bn" | "en";
  status: string;
  created_at: string;
  linked_sims_count: number;
}

export interface LinkedSim {
  sim_id: string;
  phone: string;
  operator_code: OperatorCode;
  label?: string | null;
  is_primary: boolean;
  status: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
  verified_at?: string | null;
  last_balance_bdt?: number | null;
  is_live_balance?: boolean;
  customer_id?: string | null;
  sim_type?: string | null;
  balance_transfer_available?: boolean | null;
  transfer_pin_configured?: boolean;
  pin_status?: string | null;
  last_synced_at?: string | null;
  created_at: string;
}

export interface OrderProgressStep {
  id: string;
  step_index: number;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  status: "COMPLETED" | "CURRENT" | "WAITING" | "FAILED";
}

export interface CashOutPrecheckRequest {
  operator_code: OperatorCode;
  source_mobile_number: string;
  amount_bdt: number | string;
}

export interface CashOutPrecheckResponse {
  requested_amount_bdt: number;
  max_executable_now_bdt: number;
  can_execute_full: boolean;
  per_transfer_min: number;
  per_transfer_max: number;
  live_balance_bdt?: number | null;
  remaining_daily_amount_bdt?: number | null;
  remaining_monthly_amount_bdt?: number | null;
  remaining_transfer_count?: number | null;
  active_cooldown_remaining_seconds: number;
  is_cooldown_active: boolean;
  transfer_auth_mode: string;
  recommended_chunks: number[];
  total_chunks_required: number;
  window_type: string;
}

export interface OrderProgressResponse {
  order_id: string;
  service_type: ServiceType;
  operator_code: OperatorCode;
  mobile_number: string;
  amount_bdt: string | number;
  amount_poisha: number;
  currency: string;
  status: string;
  status_display_en: string;
  status_display_bn: string;
  is_terminal: boolean;
  is_failed: boolean;
  is_waiting: boolean;
  waiting_message_en?: string | null;
  waiting_message_bn?: string | null;
  current_step_index: number;
  total_steps: number;
  steps: OrderProgressStep[];
  transfer_progress?: {
    chunks_total?: number;
    chunks_completed?: number;
    amount_transferred_bdt?: number;
    completed_amount_bdt?: number;
    remaining_amount_bdt?: number;
    requested_amount_bdt?: number;
    is_cooling_down?: boolean;
    cooldown_seconds?: number;
    cooldown_seconds_remaining?: number;
    is_cooldown_active?: boolean;
    next_chunk_number?: number;
    action_required?: string;
    next_action?: string;
    otp_required_for_next_chunk?: boolean;
    view_full_order_url?: string;
    chunks?: Array<{
      sequence_number: number;
      amount_bdt: number;
      status: string;
      operator_reference?: string;
      error_message?: string;
    }>;
  } | null;
  completed_amount_bdt?: number | null;
  remaining_amount_bdt?: number | null;
  action_required?: string | null;
  next_action?: string | null;
  otp_required_for_next_chunk?: boolean | null;
  view_full_order_url?: string | null;
  tracking_token?: string | null;
  cashout_details?: Record<string, any> | null;
  recharge_details?: Record<string, any> | null;
  last_updated: string;
  created_at: string;
}

