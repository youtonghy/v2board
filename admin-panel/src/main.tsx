import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toast } from "@heroui/react";

ReactDOM.createRoot(document.getElementById("admin-v2-root") as HTMLElement).render(
  <React.StrictMode>
    <Toast.Provider />
    <App />
  </React.StrictMode>
);
