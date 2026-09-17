export interface PromptPayQRRequest {
  targetPhoneOrId: string;
  amount: number;
  referenceId: string;
}

export interface PromptPayQRResult {
  qrPayload: string;
  qrDataUrl?: string;
  expiresAt: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionId: string;
  amount: number;
  payerName?: string;
  timestamp: string;
}

export interface IPaymentProvider {
  name: string;
  generatePromptPayQR(req: PromptPayQRRequest): Promise<PromptPayQRResult>;
  verifyPayment(transactionId: string): Promise<PaymentVerificationResult>;
}
