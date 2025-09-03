import { formatDistanceToNow, format, isToday, isYesterday, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  const seconds = differenceInSeconds(now, dateObj);
  const minutes = differenceInMinutes(now, dateObj);
  const hours = differenceInHours(now, dateObj);
  const days = differenceInDays(now, dateObj);
  
  // Se foi há menos de 1 minuto
  if (seconds < 60) {
    if (seconds === 0) return 'agora mesmo';
    if (seconds === 1) return 'há 1 seg';
    return `há ${seconds} segundos`;
  }
  
  // Se foi há menos de 1 hora
  if (minutes < 60) {
    if (minutes === 1) return 'há 1 min';
    return `há ${minutes} minutos`;
  }
  
  // Se foi há menos de 24 horas
  if (hours < 24) {
    if (hours === 1) return 'há 1h';
    return `há ${hours}h`;
  }
  
  // Se foi ontem
  if (isYesterday(dateObj)) {
    return `ontem às ${format(dateObj, 'HH:mm')}`;
  }
  
  // Para datas mais antigas que ontem, mostrar data formatada
  const currentYear = now.getFullYear();
  const dateYear = dateObj.getFullYear();
  
  if (currentYear === dateYear) {
    // Formato: "20 set" (para o mesmo ano)
    const monthName = format(dateObj, "MMM", { locale: ptBR });
    const day = format(dateObj, "d");
    return `${day} ${monthName}`;
  }
  
  // Se foi em outro ano
  // Formato: "20 set de 2025"
  const monthName = format(dateObj, "MMM", { locale: ptBR });
  const day = format(dateObj, "d");
  const year = format(dateObj, "yyyy");
  return `${day} ${monthName} de ${year}`;
}