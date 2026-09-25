/**
 * FlexiTaka Authoritative Client API Service
 * Connects exclusively to: https://flexitaka.online/api/v1 (or local dev equivalent)
 * Strictly zero independent business logic / pricing formulas.
 */

import {
  ApiError,
  CashOutOrderCreated,
  CashOutQuote,
  GuestSession,
  InAppNotification,
  Operator,
  OrderDetail,
  OrderSummary,
  PayoutMethod,
  RechargeOrderCreated,
  RechargeQuote,
  SupportTicket,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://flexitaka.online/api/v1";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getStoredGuestSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("flexitaka_guest_session_id");
}

export function setStoredGuestSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("flexitaka_guest_session_id", id);
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("flexitaka_auth_token");
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("flexitaka_auth_token", token);
}

export function clearStoredAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("flexitaka_auth_token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  customHeaders: Record<string, string> = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...customHeaders,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Attach auth or guest session
  const token = getStoredAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const guestId = getStoredGuestSessionId();
  if (guestId) {
    headers["X-Guest-Session-ID"] = guestId;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: ApiError = {
      code: "UNKNOWN_ERROR",
      message: `Request failed with status ${response.status}`,
    };
    try {
      const json = await response.json();
      if (json.error) {
        errorData = json.error;
      } else if (json.detail) {
        errorData = {
          code: "VALIDATION_ERROR",
          message: typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail),
        };
      }
    } catch {
      // JSON parse error, use default
    }
    throw errorData;
  }

  return response.json();
}

export const api = {
  // 1. Guest Sessions
  async initGuestSession(): Promise<GuestSession> {
    const data = await request<GuestSession>("/guest/session", {
      method: "POST",
    });
    setStoredGuestSessionId(data.guest_session_id);
    return data;
  },

  async validateGuestSession(): Promise<boolean> {
    const guestId = getStoredGuestSessionId();
    if (!guestId) return false;
    try {
      const res = await request<{ active: boolean; guest_session_id: string }>(
        "/guest/session"
      );
      return res.active;
    } catch {
      return false;
    }
  },

  async ensureGuestSession(): Promise<string> {
    const existing = getStoredGuestSessionId();
    if (existing) {
      const valid = await this.validateGuestSession();
      if (valid) return existing;
    }
    const session = await this.initGuestSession();
    return session.guest_session_id;
  },

  // 2. Operators
  async getOperators(): Promise<Operator[]> {
    const res = await request<{ success: boolean; operators: Operator[] }>("/operators");
    return res.operators;
  },

  // 3. Pricing Quotes (Authoritative Server Quotes)
  async getCashOutQuote(operatorCode: string, amountBdt: string): Promise<CashOutQuote> {
    return request<CashOutQuote>("/pricing/cashout-quote", {
      method: "POST",
      body: JSON.stringify({
        operator_code: operatorCode,
        amount_bdt: amountBdt,
      }),
    });
  },

  async getRechargeQuote(operatorCode: string, amountBdt: string): Promise<RechargeQuote> {
    return request<RechargeQuote>("/pricing/recharge-quote", {
      method: "POST",
      body: JSON.stringify({
        operator_code: operatorCode,
        recharge_amount_bdt: amountBdt,
      }),
    });
  },

  // 4. Operator Authentication & Balance (New Automated Flow)
  async requestOperatorOtp(phone: string): Promise<{ success: boolean; operator_code: string; reference_id?: string; message: string }> {
    return request<{ success: boolean; operator_code: string; reference_id?: string; message: string }>("/operators/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOperatorOtp(
    phone: string,
    otp: string,
    referenceId?: string
  ): Promise<{ success: boolean; access_token: string; user_id: string; phone: string; operator_code: string; balance_bdt?: number; expiry_date?: string }> {
    const guestId = getStoredGuestSessionId();
    const res = await request<{
      success: boolean;
      access_token: string;
      user_id: string;
      phone: string;
      operator_code: string;
      balance_bdt?: number;
      expiry_date?: string;
    }>("/operators/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone,
        otp,
        reference_id: referenceId,
        guest_session_id: guestId || undefined,
      }),
    });
    if (res.access_token) {
      setStoredAuthToken(res.access_token);
    }
    return res;
  },

  async getLiveBalance(phone: string): Promise<{ success: boolean; phone: string; operator_code: string; balance_bdt: number; raw_balance: string; expiry_date?: string }> {
    return request<{ success: boolean; phone: string; operator_code: string; balance_bdt: number; raw_balance: string; expiry_date?: string }>(
      `/operators/balance/live?phone=${encodeURIComponent(phone)}`
    );
  },

  // 5. Cash Out Orders
  async createCashOutOrder(params: {
    operator_code: string;
    source_mobile_number: string;
    amount_bdt: string;
    payout_method: PayoutMethod;
    payout_account: string;
    pin?: string;
  }): Promise<CashOutOrderCreated> {
    const idempotencyKey = generateUUID();
    return request<CashOutOrderCreated>(
      "/cashout/orders",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      {
        "Idempotency-Key": idempotencyKey,
      }
    );
  },

  async getCashOutTransferProgress(orderId: string): Promise<any> {
    return request<any>(`/cashout/orders/${orderId}/progress`);
  },

  async executeTransferStep(orderId: string, pin?: string): Promise<any> {
    return request<any>(`/cashout/orders/${orderId}/transfer-step`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },

  async getRechargeTransferProgress(orderId: string): Promise<any> {
    return request<any>(`/recharge/orders/${orderId}/progress`);
  },

  async confirmCashOutTransfer(
    orderId: string,
    transferReference: string
  ): Promise<{ success: boolean; order_id: string; status: string }> {
    return request<{ success: boolean; order_id: string; status: string }>(
      `/cashout/orders/${orderId}/confirm-transfer`,
      {
        method: "POST",
        body: JSON.stringify({ transfer_reference: transferReference }),
      }
    );
  },

  async uploadTransferProof(
    orderId: string,
    file: File
  ): Promise<{ proof_id: string; order_id: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ proof_id: string; order_id: string; status: string }>(
      `/cashout/orders/${orderId}/proof`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  // 5. Recharge Orders
  async createRechargeOrder(params: {
    operator_code: string;
    recharge_mobile_number: string;
    recharge_amount_bdt: string;
  }): Promise<RechargeOrderCreated> {
    const idempotencyKey = generateUUID();
    return request<RechargeOrderCreated>(
      "/recharge/orders",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      {
        "Idempotency-Key": idempotencyKey,
      }
    );
  },

  async submitPayment(params: {
    order_id: string;
    method: PayoutMethod;
    amount_bdt: string;
    payer_reference: string;
    transaction_reference: string;
  }): Promise<{ payment_id: string; order_id: string; status: string }> {
    return request<{ payment_id: string; order_id: string; status: string }>(
      "/payments",
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  },

  // 6. Orders Listing & Tracking
  async listOrders(limit: number = 20, skip: number = 0): Promise<OrderSummary[]> {
    return request<OrderSummary[]>(`/orders?limit=${limit}&skip=${skip}`);
  },

  async getOrder(orderId: string, trackingToken?: string | null): Promise<OrderDetail> {
    const query = trackingToken ? `?tracking_token=${encodeURIComponent(trackingToken)}` : "";
    return request<OrderDetail>(`/orders/${orderId}${query}`);
  },

  // 7. Support
  async createTicket(params: {
    category: string;
    subject: string;
    message: string;
    order_id?: string;
  }): Promise<SupportTicket> {
    return request<SupportTicket>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async listTickets(): Promise<SupportTicket[]> {
    return request<SupportTicket[]>("/support/tickets");
  },

  async addTicketMessage(ticketId: string, message: string): Promise<SupportTicket> {
    return request<SupportTicket>(`/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  // 8. Notifications
  async getNotifications(): Promise<InAppNotification[]> {
    return request<InAppNotification[]>("/notifications");
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, { method: "POST" });
  },

  // 9. Optional Auth
  async requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(
    phone: string,
    otp: string
  ): Promise<{ access_token: string; user_id: string; role: string; orders_linked?: number }> {
    const guestId = getStoredGuestSessionId();
    const res = await request<{ access_token: string; user_id: string; role: string; orders_linked?: number }>(
      "/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({
          phone,
          otp,
          guest_session_id: guestId || undefined,
        }),
      }
    );
    setStoredAuthToken(res.access_token);
    return res;
  },

  logout(): void {
    clearStoredAuthToken();
  },
};
