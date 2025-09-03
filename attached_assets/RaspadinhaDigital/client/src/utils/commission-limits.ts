/**
 * Calculates the maximum commission allowed for a partner based on the affiliate's commission
 * 
 * Rules:
 * 1. If affiliate has percentage commission (e.g., 85%):
 *    - Partner with fixed commission: max = affiliate_percentage * minimum_deposit (15 BRL)
 *    - Partner with percentage commission: max = affiliate_percentage
 * 
 * 2. If affiliate has fixed commission (e.g., 10 BRL):
 *    - Partner with fixed commission: max = affiliate_fixed_amount
 *    - Partner with percentage commission: calculated as percentage of fixed amount
 */

const MINIMUM_DEPOSIT = 15; // Minimum deposit amount in BRL

export interface AffiliateCommission {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CommissionLimits {
  maxPercentage: number;
  maxFixed: number;
  explanation: string;
}

export function calculatePartnerCommissionLimits(
  affiliateCommission: AffiliateCommission,
  partnerCommissionType: 'percentage' | 'fixed'
): CommissionLimits {
  
  if (affiliateCommission.type === 'percentage') {
    // Affiliate has percentage commission
    const affiliatePercentage = affiliateCommission.value;
    
    if (partnerCommissionType === 'percentage') {
      // Partner percentage cannot exceed affiliate percentage
      return {
        maxPercentage: affiliatePercentage,
        maxFixed: (affiliatePercentage / 100) * MINIMUM_DEPOSIT,
        explanation: `Como você tem ${affiliatePercentage}% de comissão, o parceiro pode ter no máximo ${affiliatePercentage}% em comissão percentual.`
      };
    } else {
      // Partner wants fixed, calculate max based on minimum deposit
      const maxFixedAmount = (affiliatePercentage / 100) * MINIMUM_DEPOSIT;
      return {
        maxPercentage: affiliatePercentage,
        maxFixed: maxFixedAmount,
        explanation: `Como você tem ${affiliatePercentage}% de comissão, o parceiro pode ter no máximo R$ ${maxFixedAmount.toFixed(2)} em comissão fixa (${affiliatePercentage}% do depósito mínimo de R$ ${MINIMUM_DEPOSIT}).`
      };
    }
  } else {
    // Affiliate has fixed commission
    const affiliateFixedAmount = affiliateCommission.value;
    
    if (partnerCommissionType === 'fixed') {
      // Partner fixed cannot exceed affiliate fixed
      return {
        maxPercentage: (affiliateFixedAmount / MINIMUM_DEPOSIT) * 100,
        maxFixed: affiliateFixedAmount,
        explanation: `Como você tem R$ ${affiliateFixedAmount.toFixed(2)} de comissão fixa, o parceiro pode ter no máximo R$ ${affiliateFixedAmount.toFixed(2)} em comissão fixa.`
      };
    } else {
      // Partner wants percentage, calculate based on fixed amount over minimum deposit
      const maxPercentageFromFixed = (affiliateFixedAmount / MINIMUM_DEPOSIT) * 100;
      
      return {
        maxPercentage: Math.min(maxPercentageFromFixed, 100),
        maxFixed: affiliateFixedAmount,
        explanation: `Como você tem R$ ${affiliateFixedAmount.toFixed(2)} de comissão fixa, o parceiro pode ter no máximo ${Math.min(maxPercentageFromFixed, 100).toFixed(1)}% em comissão percentual (equivalente ao seu valor fixo de R$ ${affiliateFixedAmount.toFixed(2)} sobre o depósito mínimo de R$ ${MINIMUM_DEPOSIT}).`
      };
    }
  }
}

export function validatePartnerCommission(
  affiliateCommission: AffiliateCommission,
  partnerCommissionType: 'percentage' | 'fixed',
  partnerCommissionValue: number
): { valid: boolean; error?: string } {
  
  const limits = calculatePartnerCommissionLimits(affiliateCommission, partnerCommissionType);
  
  if (partnerCommissionType === 'percentage') {
    if (partnerCommissionValue > limits.maxPercentage) {
      return {
        valid: false,
        error: `A comissão percentual não pode ser maior que ${limits.maxPercentage.toFixed(1)}%`
      };
    }
  } else {
    if (partnerCommissionValue > limits.maxFixed) {
      return {
        valid: false,
        error: `A comissão fixa não pode ser maior que R$ ${limits.maxFixed.toFixed(2)}`
      };
    }
  }
  
  if (partnerCommissionValue <= 0) {
    return {
      valid: false,
      error: 'A comissão deve ser maior que zero'
    };
  }
  
  return { valid: true };
}