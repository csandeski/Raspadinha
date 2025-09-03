import fetch from 'node-fetch';
import { db } from './db';
import { deposits, withdrawals, paymentProviderConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

// OrinPay API Configuration
const ORINPAY_API_KEY = 'f1d8b8ec4c093e3dfdf25e45056262e57ad01c6ecf895ca53d0c2e0e47d4febf';
const ORINPAY_BASE_URL = 'https://www.orinpay.com.br/api';

// Helper function to generate a unique reference
function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `MB-${timestamp}-${random}`.toUpperCase();
}

// Format CPF/CNPJ (remove all non-numeric characters)
function formatDocument(document: string): string {
  return document.replace(/\D/g, '');
}

// Format phone (remove all non-numeric characters)
function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Create PIX payment
export async function createOrinPayPixPayment(
  amount: number,
  customerData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  },
  depositId: number
) {
  try {
    const reference = `DEPOSIT-${depositId}`;
    
    // Prepare request payload
    const payload = {
      paymentMethod: 'pix',
      reference: reference,
      customer: {
        name: customerData.name,
        email: customerData.email,
        phone: formatPhone(customerData.phone),
        document: {
          number: formatDocument(customerData.cpf),
          type: 'cpf'
        }
      },
      shipping: {
        fee: 0,
        address: {
          street: 'N/A',
          streetNumber: 'S/N',
          zipCode: '00000000',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          complement: ''
        }
      },
      items: [
        {
          title: 'Depósito Mania Brasil',
          description: `Depósito de R$ ${(amount / 100).toFixed(2)}`,
          unitPrice: amount, // Amount in cents
          quantity: 1,
          tangible: false
        }
      ],
      isInfoProducts: true
    };

    console.log('Creating OrinPay PIX payment:', {
      amount: amount,
      reference: reference,
      customer: customerData.email
    });

    // Make API request
    const response = await fetch(`${ORINPAY_BASE_URL}/v1/transactions/pix`, {
      method: 'POST',
      headers: {
        'Authorization': ORINPAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OrinPay API error:', responseText);
      throw new Error(`OrinPay API error: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    console.log('OrinPay PIX payment created successfully:', {
      orderId: data.orderId,
      status: data.status
    });

    return {
      success: true,
      provider: 'orinpay',
      transactionId: data.orderId?.toString() || data.id?.toString(),
      pixCode: data.pix?.payload || data.pix?.encodedImage,
      qrCode: data.pix?.encodedImage,
      status: data.status,
      amount: amount,
      reference: reference
    };

  } catch (error) {
    console.error('Error creating OrinPay PIX payment:', error);
    throw error;
  }
}

// Verify payment status
export async function verifyOrinPayPayment(transactionId: string) {
  try {
    console.log('Verifying OrinPay payment:', transactionId);

    // Note: OrinPay doesn't provide a direct status check endpoint in the documentation
    // We'll rely on webhooks for status updates
    // For now, return pending status
    return {
      success: false,
      status: 'pending',
      message: 'Payment verification via webhook'
    };

  } catch (error) {
    console.error('Error verifying OrinPay payment:', error);
    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Process withdrawal via OrinPay
export async function processOrinPayWithdrawal(
  amount: number,
  pixKey: string,
  pixKeyType: string,
  withdrawalId: number,
  userId: number
) {
  try {
    const reference = `WITHDRAWAL-${withdrawalId}`;
    
    // Prepare withdrawal payload
    const payload = {
      amount: amount, // Amount in cents
      pixKey: formatDocument(pixKey), // Only CPF/CNPJ accepted
      pixKeyType: pixKeyType.toUpperCase(),
      method: 'PIX',
      metadata: {
        sellerExternalRef: reference
      }
    };

    console.log('Processing OrinPay withdrawal:', {
      amount: amount,
      pixKeyType: pixKeyType,
      reference: reference
    });

    // Make API request
    const response = await fetch(`${ORINPAY_BASE_URL}/withdrawals`, {
      method: 'POST',
      headers: {
        'x-api-key': ORINPAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OrinPay withdrawal error:', responseText);
      
      // Parse error message if possible
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      } catch (e) {
        // If not JSON, use raw text
      }
      
      throw new Error(`OrinPay withdrawal error: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    console.log('OrinPay withdrawal created successfully:', {
      id: data.data?.id,
      status: data.data?.status,
      netAmount: data.data?.netAmount
    });

    return {
      success: true,
      withdrawalId: data.data?.id,
      status: data.data?.status,
      netAmount: data.data?.netAmount,
      fee: data.data?.fee
    };

  } catch (error) {
    console.error('Error processing OrinPay withdrawal:', error);
    throw error;
  }
}

// Check balance
export async function getOrinPayBalance() {
  try {
    const response = await fetch(`${ORINPAY_BASE_URL}/seller-wallet/balance`, {
      method: 'GET',
      headers: {
        'x-api-key': ORINPAY_API_KEY
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OrinPay balance error:', responseText);
      throw new Error(`OrinPay balance error: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    return {
      success: true,
      balance: data.data?.balance || 0,
      pendingBalance: data.data?.pendenteBalance || 0,
      sellerId: data.data?.sellerId
    };

  } catch (error) {
    console.error('Error getting OrinPay balance:', error);
    throw error;
  }
}

// Handle OrinPay webhook
export async function handleOrinPayWebhook(payload: any) {
  try {
    const event = payload.event || payload.eventType;
    const reference = payload.reference;
    const status = payload.status;

    console.log('Processing OrinPay webhook:', {
      event: event,
      reference: reference,
      status: status
    });

    // Handle deposit webhooks
    if (reference && reference.startsWith('DEPOSIT-')) {
      const depositId = parseInt(reference.replace('DEPOSIT-', ''));
      
      switch (event) {
        case 'pix_gerado':
          // PIX was generated, payment is pending
          console.log(`PIX generated for deposit ${depositId}`);
          break;
          
        case 'compra_aprovada':
          // Payment approved
          console.log(`Payment approved for deposit ${depositId}`);
          
          // Update deposit status
          await db.update(deposits)
            .set({
              status: 'completed',
              completedAt: new Date()
            })
            .where(eq(deposits.id, depositId));
          
          // Here you would trigger any additional logic like:
          // - Updating user balance
          // - Processing referral commissions
          // - Sending notifications
          
          break;
          
        case 'compra_recusada':
          // Payment rejected
          console.log(`Payment rejected for deposit ${depositId}`);
          
          await db.update(deposits)
            .set({
              status: 'failed'
            })
            .where(eq(deposits.id, depositId));
          
          break;
          
        case 'reembolso':
        case 'estorno':
          // Payment refunded or charged back
          console.log(`Payment refunded/chargedback for deposit ${depositId}`);
          
          await db.update(deposits)
            .set({
              status: 'refunded'
            })
            .where(eq(deposits.id, depositId));
          
          break;
      }
    }

    // Handle withdrawal webhooks
    if (reference && reference.startsWith('WITHDRAWAL-')) {
      const withdrawalId = parseInt(reference.replace('WITHDRAWAL-', ''));
      
      switch (event) {
        case 'WITHDRAWAL_APPROVED':
          // Withdrawal approved
          console.log(`Withdrawal approved: ${withdrawalId}`);
          
          await db.update(withdrawals)
            .set({
              status: 'completed',
              processedAt: new Date()
            })
            .where(eq(withdrawals.id, withdrawalId));
          
          break;
          
        case 'WITHDRAWAL_REJECTED':
          // Withdrawal rejected
          console.log(`Withdrawal rejected: ${withdrawalId}`);
          
          await db.update(withdrawals)
            .set({
              status: 'failed',
              processedAt: new Date()
            })
            .where(eq(withdrawals.id, withdrawalId));
          
          break;
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error processing OrinPay webhook:', error);
    throw error;
  }
}