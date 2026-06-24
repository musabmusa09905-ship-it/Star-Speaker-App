import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initializeTheme } from "./lib/theme.js";
import "./styles.css";

initializeTheme();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
