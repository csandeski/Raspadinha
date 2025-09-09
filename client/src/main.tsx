import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/affiliate-tracker"; // Initialize affiliate tracking

createRoot(document.getElementById("root")!).render(<App />);
