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
  tracking_token?: string;
  created_at: string;
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
