import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/affiliate-tracker"; // Initialize affiliate tracking

// Register service worker for offline caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('SW registered:', registration))
      .catch(error => console.log('SW registration failed:', error));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
