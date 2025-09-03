import { apiRequest } from "./queryClient";

export interface PixPaymentData {
  transactionId: string;
  qrCode: string;
  amount: number;
  depositId: number;
}

export interface PixVerificationResult {
  status: "pending" | "completed";
  message: string;
  newBalance?: string;
}

export const createPixPayment = async (amount: number): Promise<PixPaymentData> => {
  const response = await apiRequest("POST", "/api/payments/create-pix", {
    amount,
  });
  return await response.json();
};

export const verifyPixPayment = async (transactionId: string): Promise<PixVerificationResult> => {
  const response = await apiRequest("POST", "/api/payments/verify-pix", {
    transactionId,
  });
  return await response.json();
};

export const requestWithdrawal = async (amount: number, pixKey: string) => {
  const response = await apiRequest("POST", "/api/withdrawals/request", {
    amount,
    pixKey,
  });
  return await response.json();
};

export const generateQRCodeDataURL = (pixCode: string): string => {
  // In a real implementation, you would use a QR code library
  // For now, we'll return a placeholder data URL
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
};
