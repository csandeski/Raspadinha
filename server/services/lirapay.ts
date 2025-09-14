import fetch from 'node-fetch';
import { db } from '../db';
import { deposits, withdrawals } from '@shared/schema';
import { eq } from 'drizzle-orm';

// LiraPay API Configuration
const LIRAPAY_API_SECRET = process.env.LIRAPAY_API_SECRET || 'sk_915265fb1da6a6ebe1fc7658766c6c0c58e61342be276379f4528d76c14d8e421594edbf6086dffe01fbb1f73f772d0023240fc1da1056b694ad9ee6ecdf7832';
const LIRAPAY_BASE_URL = 'https://api.lirapaybr.com';
const WEBHOOK_BASE_URL = process.env.PUBLIC_URL || 'https://mania-brasil.com';

// Helper function to generate a unique external ID
function generateExternalId(prefix: string, id: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${id}-${timestamp}-${random}`.toUpperCase();
}

// Format CPF/CNPJ (remove all non-numeric characters)
function formatDocument(document: string): string {
  return document.replace(/\D/g, '');
}

// Format phone (remove all non-numeric characters and ensure it has area code)
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  // If phone doesn't have area code, add default (11 for São Paulo)
  if (cleaned.length === 9) {
    return '11' + cleaned;
  }
  return cleaned;
}

// Detect document type (CPF or CNPJ)
function detectDocumentType(document: string): 'CPF' | 'CNPJ' {
  const cleaned = formatDocument(document);
  return cleaned.length === 11 ? 'CPF' : 'CNPJ';
}

// Create PIX payment
export async function createPixPayment(
  amount: number,
  customerData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    ip?: string;
  },
  depositId: number
) {
  try {
    const externalId = generateExternalId('DEPOSIT', depositId);
    
    // Prepare request payload according to LiraPay specs
    const payload = {
      external_id: externalId,
      total_amount: amount, // Amount in reais (not cents)
      payment_method: 'PIX',
      webhook_url: `${WEBHOOK_BASE_URL}/api/webhook/lirapay`,
      items: [
        {
          id: '1',
          title: 'Depósito',
          description: `Depósito PIX de R$ ${amount.toFixed(2)}`,
          price: amount,
          quantity: 1,
          is_physical: false
        }
      ],
      ip: customerData.ip || '127.0.0.1',
      customer: {
        name: customerData.name,
        email: customerData.email,
        phone: formatPhone(customerData.phone),
        document_type: detectDocumentType(customerData.cpf),
        document: formatDocument(customerData.cpf)
      }
    };

    console.log('[LiraPay] Creating PIX payment:', {
      amount: amount,
      externalId: externalId,
      customer: customerData.email,
      webhook: payload.webhook_url
    });

    // Make API request
    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/transactions`, {
      method: 'POST',
      headers: {
        'api-secret': LIRAPAY_API_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[LiraPay] API error:', responseText);
      
      // Try to parse error message
      try {
        const errorData = JSON.parse(responseText);
        const errorMessage = errorData.message || errorData.error || 'Erro ao criar pagamento';
        throw new Error(errorMessage);
      } catch (e) {
        throw new Error(`Erro na API LiraPay: ${response.status}`);
      }
    }

    const data = JSON.parse(responseText);

    console.log('[LiraPay] PIX payment created successfully:', {
      transactionId: data.id,
      status: data.status,
      pixPayload: data.pix?.payload ? 'Present' : 'Missing'
    });

    // Update deposit with transaction ID
    await db.update(deposits)
      .set({
        transactionId: data.id?.toString(),
        status: 'pending'
      })
      .where(eq(deposits.id, depositId));

    return {
      success: true,
      provider: 'lirapay',
      transactionId: data.id?.toString(),
      pixCode: data.pix?.payload, // PIX copy-paste code
      qrCode: data.pix?.qr_code_base64 || data.pix?.qr_code, // QR code image
      status: data.status,
      amount: amount,
      externalId: externalId
    };

  } catch (error) {
    console.error('[LiraPay] Error creating PIX payment:', error);
    throw error;
  }
}

// Get transaction status
export async function getTransactionStatus(transactionId: string) {
  try {
    console.log('[LiraPay] Getting transaction status:', transactionId);

    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'api-secret': LIRAPAY_API_SECRET,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[LiraPay] Status check error:', responseText);
      return {
        success: false,
        status: 'error',
        message: 'Erro ao verificar status do pagamento'
      };
    }

    const data = JSON.parse(responseText);

    console.log('[LiraPay] Transaction status:', {
      transactionId: transactionId,
      status: data.status
    });

    // Map LiraPay status to our system status
    let mappedStatus = 'pending';
    switch (data.status) {
      case 'AUTHORIZED':
        mappedStatus = 'completed';
        break;
      case 'PENDING':
        mappedStatus = 'pending';
        break;
      case 'FAILED':
      case 'CHARGEBACK':
      case 'IN_DISPUTE':
        mappedStatus = 'failed';
        break;
    }

    return {
      success: true,
      status: mappedStatus,
      originalStatus: data.status,
      amount: data.total_amount,
      customer: data.customer,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

  } catch (error) {
    console.error('[LiraPay] Error getting transaction status:', error);
    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Process withdrawal via PIX (cashout)
export async function createCashout(
  amount: number,
  pixKey: string,
  pixKeyType: string,
  withdrawalId: number,
  userId: number
) {
  try {
    const externalId = generateExternalId('WITHDRAWAL', withdrawalId);
    
    // Prepare cashout payload
    const payload = {
      external_id: externalId,
      amount: amount, // Amount in reais
      pix_key: pixKey,
      pix_key_type: pixKeyType.toUpperCase(), // CPF, CNPJ, EMAIL, PHONE, EVP
      webhook_url: `${WEBHOOK_BASE_URL}/api/webhook/lirapay`,
      description: `Saque #${withdrawalId} - Usuário #${userId}`
    };

    console.log('[LiraPay] Processing cashout:', {
      amount: amount,
      pixKeyType: pixKeyType,
      externalId: externalId
    });

    // Make API request
    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/cashout`, {
      method: 'POST',
      headers: {
        'api-secret': LIRAPAY_API_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[LiraPay] Cashout error:', responseText);
      
      // Parse error message if possible
      try {
        const errorData = JSON.parse(responseText);
        const errorMessage = errorData.message || errorData.error || 'Erro ao processar saque';
        
        // Check for specific error types
        if (errorMessage.includes('saldo') || errorMessage.includes('balance')) {
          throw new Error('Saldo insuficiente para realizar o saque');
        }
        if (errorMessage.includes('chave') || errorMessage.includes('key')) {
          throw new Error('Chave PIX inválida');
        }
        
        throw new Error(errorMessage);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Saldo') || e.message.startsWith('Chave')) {
          throw e;
        }
        throw new Error(`Erro ao processar saque: ${response.status}`);
      }
    }

    const data = JSON.parse(responseText);

    console.log('[LiraPay] Cashout created successfully:', {
      cashoutId: data.id,
      status: data.status,
      fee: data.fee
    });

    // Update withdrawal status
    await db.update(withdrawals)
      .set({
        status: 'processing',
        transactionId: data.id?.toString()
      })
      .where(eq(withdrawals.id, withdrawalId));

    return {
      success: true,
      cashoutId: data.id,
      status: data.status,
      amount: data.amount,
      fee: data.fee || 0,
      netAmount: data.net_amount || (amount - (data.fee || 0))
    };

  } catch (error) {
    console.error('[LiraPay] Error processing cashout:', error);
    
    // Update withdrawal as failed
    await db.update(withdrawals)
      .set({
        status: 'failed',
        processedAt: new Date()
      })
      .where(eq(withdrawals.id, withdrawalId));
    
    throw error;
  }
}

// Handle LiraPay webhook
export async function handleLiraPayWebhook(payload: any) {
  try {
    const { external_id, status, type, amount } = payload;

    console.log('[LiraPay] Processing webhook:', {
      type: type,
      external_id: external_id,
      status: status,
      amount: amount
    });

    // Handle deposit webhooks
    if (external_id && external_id.startsWith('DEPOSIT-')) {
      const parts = external_id.split('-');
      const depositId = parseInt(parts[1]);
      
      if (isNaN(depositId)) {
        console.error('[LiraPay] Invalid deposit ID in external_id:', external_id);
        return { success: false, error: 'Invalid deposit ID' };
      }
      
      switch (status) {
        case 'AUTHORIZED':
          // Payment approved
          console.log(`[LiraPay] Payment approved for deposit ${depositId}`);
          
          // Get deposit details
          const [deposit] = await db.select()
            .from(deposits)
            .where(eq(deposits.id, depositId))
            .limit(1);
          
          if (!deposit) {
            console.error(`[LiraPay] Deposit ${depositId} not found`);
            return { success: false, error: 'Deposit not found' };
          }
          
          // Update deposit status
          await db.update(deposits)
            .set({
              status: 'completed',
              completedAt: new Date()
            })
            .where(eq(deposits.id, depositId));
          
          console.log(`[LiraPay] Deposit ${depositId} marked as completed`);
          
          // Here you would trigger additional logic like:
          // - Updating user balance
          // - Processing referral commissions
          // - Sending notifications
          // This will be handled by the existing system in routes.ts
          
          break;
          
        case 'FAILED':
          // Payment failed
          console.log(`[LiraPay] Payment failed for deposit ${depositId}`);
          
          await db.update(deposits)
            .set({
              status: 'failed'
            })
            .where(eq(deposits.id, depositId));
          
          break;
          
        case 'CHARGEBACK':
        case 'IN_DISPUTE':
          // Payment refunded or disputed
          console.log(`[LiraPay] Payment refunded/disputed for deposit ${depositId}`);
          
          await db.update(deposits)
            .set({
              status: 'refunded'
            })
            .where(eq(deposits.id, depositId));
          
          break;
          
        case 'PENDING':
          // Payment still pending
          console.log(`[LiraPay] Payment pending for deposit ${depositId}`);
          break;
          
        default:
          console.log(`[LiraPay] Unknown status ${status} for deposit ${depositId}`);
      }
    }

    // Handle withdrawal/cashout webhooks
    if (external_id && external_id.startsWith('WITHDRAWAL-')) {
      const parts = external_id.split('-');
      const withdrawalId = parseInt(parts[1]);
      
      if (isNaN(withdrawalId)) {
        console.error('[LiraPay] Invalid withdrawal ID in external_id:', external_id);
        return { success: false, error: 'Invalid withdrawal ID' };
      }
      
      switch (status) {
        case 'AUTHORIZED':
        case 'COMPLETED':
          // Withdrawal approved
          console.log(`[LiraPay] Withdrawal approved: ${withdrawalId}`);
          
          await db.update(withdrawals)
            .set({
              status: 'completed',
              processedAt: new Date()
            })
            .where(eq(withdrawals.id, withdrawalId));
          
          break;
          
        case 'FAILED':
        case 'REJECTED':
          // Withdrawal rejected
          console.log(`[LiraPay] Withdrawal rejected: ${withdrawalId}`);
          
          await db.update(withdrawals)
            .set({
              status: 'failed',
              processedAt: new Date()
            })
            .where(eq(withdrawals.id, withdrawalId));
          
          break;
          
        case 'PROCESSING':
        case 'PENDING':
          // Withdrawal still processing
          console.log(`[LiraPay] Withdrawal processing: ${withdrawalId}`);
          
          await db.update(withdrawals)
            .set({
              status: 'processing'
            })
            .where(eq(withdrawals.id, withdrawalId));
          
          break;
          
        default:
          console.log(`[LiraPay] Unknown status ${status} for withdrawal ${withdrawalId}`);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('[LiraPay] Error processing webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Get balance (if LiraPay provides this endpoint)
export async function getLiraPayBalance() {
  try {
    const response = await fetch(`${LIRAPAY_BASE_URL}/v1/balance`, {
      method: 'GET',
      headers: {
        'api-secret': LIRAPAY_API_SECRET,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[LiraPay] Balance error:', responseText);
      throw new Error(`LiraPay balance error: ${responseText}`);
    }

    const data = JSON.parse(responseText);

    return {
      success: true,
      balance: data.available_balance || 0,
      pendingBalance: data.pending_balance || 0,
      totalBalance: data.total_balance || 0
    };

  } catch (error) {
    console.error('[LiraPay] Error getting balance:', error);
    // Return default values if balance endpoint is not available
    return {
      success: false,
      balance: 0,
      pendingBalance: 0,
      totalBalance: 0
    };
  }
}