import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format money values without currency symbol (XX.XXX,XX format)
export function formatMoney(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
}

export function suggestEmailDomains(partialDomain: string): string[] {
  const popularDomains = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'yahoo.com.br',
    'icloud.com',
    'live.com',
    'bol.com.br',
    'uol.com.br',
    'terra.com.br'
  ];
  
  if (!partialDomain) return popularDomains.slice(0, 5);
  
  return popularDomains
    .filter(domain => domain.toLowerCase().startsWith(partialDomain.toLowerCase()))
    .slice(0, 5);
}
