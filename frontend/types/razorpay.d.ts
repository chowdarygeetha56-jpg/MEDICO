export {};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      notes?: Record<string, string>;
      theme?: { color: string };
      prefill?: { name?: string; contact?: string };
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void | Promise<void>;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}