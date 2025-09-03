// Utility functions to format zero values in a more professional way

export const formatZeroValue = (
  value: number | string | undefined | null,
  type: 'clicks' | 'registrations' | 'deposits' | 'money' | 'codes' | 'network' | 'generic' = 'generic',
  showMessage: boolean = true
): { display: string; message?: string } => {
  const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
  
  if (numValue === 0 || isNaN(numValue)) {
    let message = '';
    
    switch (type) {
      case 'clicks':
        message = 'Nenhum clique ainda';
        break;
      case 'registrations':
        message = 'Nenhum cadastro ainda';
        break;
      case 'deposits':
        message = 'Nenhum depósito ainda';
        break;
      case 'money':
        message = 'Sem ganhos ainda';
        break;
      case 'codes':
        message = 'Nenhum código ativo';
        break;
      case 'network':
        message = 'Nenhum indicado ainda';
        break;
      default:
        message = 'Sem dados ainda';
    }
    
    return {
      display: '—',
      message: showMessage ? message : undefined
    };
  }
  
  // Return formatted value if not zero
  if (type === 'money') {
    return {
      display: `R$ ${numValue.toFixed(2).replace('.', ',')}`
    };
  }
  
  return {
    display: numValue.toString()
  };
};

export const formatStatValue = (
  value: number | string | undefined | null,
  type: 'clicks' | 'registrations' | 'deposits' | 'money' | 'codes' | 'network' | 'generic' = 'generic'
): string => {
  const result = formatZeroValue(value, type, false);
  return result.display;
};