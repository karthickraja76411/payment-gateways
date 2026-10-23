export type OrderStatus = 'created' | 'attempted' | 'paid';
export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
export type RefundStatus = 'pending' | 'processed' | 'failed';

/** Amounts are returned exactly as the gateway reports them. */
export interface Order {
  id: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  receipt: string | null;
  status: OrderStatus;
  attempts: number;
  notes: Record<string, unknown>;
  createdAt: Date;
  raw: unknown;
}

export interface PaymentDetails {
  id: string;
  orderId: string | null;
  amount: number;
  amountRefunded: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  captured: boolean;
  email: string | null;
  contact: string | null;
  description: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  notes: Record<string, unknown>;
  createdAt: Date;
  raw: unknown;
}

export interface RefundDetails {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  receipt: string | null;
  notes: Record<string, unknown>;
  createdAt: Date;
  raw: unknown;
}
