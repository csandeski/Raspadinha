import { AffiliateTracker } from './affiliate-tracker';

/**
 * Adiciona o parâmetro ref aos URLs internos de navegação
 * @param path - O caminho para onde navegar (ex: '/register')
 * @returns O caminho com o parâmetro ref se disponível
 */
export function getPathWithRef(path: string): string {
  const ref = AffiliateTracker.getAffiliateRef();
  
  if (!ref) return path;
  
  // Extrair o pathname sem query string
  const [pathname] = path.split('?');
  
  // Páginas onde o ref deve ser mantido
  const criticalPaths = ['/', '/register', '/login', '/landing'];
  
  if (criticalPaths.includes(pathname)) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}ref=${ref}`;
  }
  
  return path;
}

/**
 * Hook para navegação mantendo o parâmetro ref
 */
export function useNavigateWithRef() {
  const navigate = (path: string) => {
    window.location.href = getPathWithRef(path);
  };
  
  return navigate;
}