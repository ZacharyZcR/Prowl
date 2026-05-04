import { createRoot } from "react-dom/client";
import App from "./App";
import { initErrorReporter } from "./lib/error-reporter";
import "./i18n";
import "./assets/globals.css";

initErrorReporter();

createRoot(document.getElementById("root")!).render(<App />);
