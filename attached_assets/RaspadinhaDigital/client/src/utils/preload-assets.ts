// Sistema global de pré-carregamento de assets críticos

// Lista de imagens críticas que devem ser pré-carregadas no início do app
export const criticalImages = [
  // Banners principais
  '/banners/banner1.webp',
  '/banners/banner2.webp',
  '/banners/banner3.webp',
  '/banners/banner4.webp',
  
  // Banners dos jogos
  '/premios/banner-pix.webp',
  '/premios/banner-me-mimei.webp',
  '/premios/banner-eletronicos.webp',
  '/premios/banner-super-premios.webp',
  '/premios/jogo-esquilo/banner-esquilo-mania.webp',
  
  // Imagens do Jogo do Esquilo
  '/premios/jogo-esquilo/chest-closed.png',
  '/premios/jogo-esquilo/chest-open.png',
  '/premios/jogo-esquilo/fox.png',
  '/premios/jogo-esquilo/acorn.png',
  '/premios/jogo-esquilo/apple.png',
  '/premios/jogo-esquilo/golden-acorn.png',
  '/premios/jogo-esquilo/pinecone.png',
  '/premios/jogo-esquilo/ring.png',
  '/premios/jogo-esquilo/forest-bg.png',
  '/premios/jogo-esquilo/chest-grid.webp',
  '/premios/jogo-esquilo/bonus-chest-grid.webp',
  
  // Logos e imagens comuns
  '/logos/logomania.svg',
];

// Cache de imagens carregadas
const loadedImages = new Set<string>();

// Função para pré-carregar uma imagem
export const preloadImage = (src: string): Promise<void> => {
  if (loadedImages.has(src)) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      loadedImages.add(src);
      resolve();
    };
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`);
      resolve(); // Continua mesmo com erro
    };
  });
};

// Função para pré-carregar todas as imagens críticas
export const preloadCriticalAssets = async () => {
  console.log('Starting critical assets preload...');
  
  const startTime = performance.now();
  
  // Carrega em batches para não sobrecarregar
  const batchSize = 5;
  
  for (let i = 0; i < criticalImages.length; i += batchSize) {
    const batch = criticalImages.slice(i, i + batchSize);
    await Promise.all(batch.map(src => preloadImage(src)));
  }
  
  const endTime = performance.now();
  console.log(`Critical assets preloaded in ${(endTime - startTime).toFixed(2)}ms`);
};

// Função para verificar se uma imagem está carregada
export const isImageLoaded = (src: string): boolean => {
  return loadedImages.has(src);
};

// Função para adicionar imagens ao cache dinamicamente
export const addToImageCache = (src: string) => {
  loadedImages.add(src);
};