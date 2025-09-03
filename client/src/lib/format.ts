// Brazilian currency formatting utilities

export function formatBRL(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
}

// Format numbers with dots as thousand separator (for clicks, registrations, etc)
export function formatNumber(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  // Use de-DE locale for dot separator (1.000 instead of 1,000)
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}