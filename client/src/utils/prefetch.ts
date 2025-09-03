// Prefetch critical resources for better performance
export function prefetchResources() {
  // List of critical images to prefetch
  const criticalImages = [
    "/logos/logomania.png",
    "/banners/hero-mobile.png",
    "/banners/hero-desktop.png",
    "/premios/banner-pix.webp",
    "/premios/banner-me-mimei.webp",
    "/premios/banner-eletronicos.webp",
    "/premios/banner-super-premios.webp",
  ];

  // Prefetch images after page load
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      criticalImages.forEach((src) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = src;
        document.head.appendChild(link);
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      criticalImages.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }, 1000);
  }
}

// Prefetch next page resources
export function prefetchRoute(route: string) {
  // List of routes and their associated resources
  const routeResources: Record<string, string[]> = {
    "/game/premio-pix": ["/premios/banner-pix.webp"],
    "/game/premio-me-mimei": ["/premios/banner-me-mimei.webp"],
    "/game/premio-eletronicos": ["/premios/banner-eletronicos.webp"],
    "/game/premio-super-premios": ["/premios/banner-super-premios.webp"],
  };

  const resources = routeResources[route];
  if (!resources) return;

  resources.forEach((src) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = src;
    document.head.appendChild(link);
  });
}
