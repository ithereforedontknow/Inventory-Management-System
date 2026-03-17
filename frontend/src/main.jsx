import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a2e",
            color: "#cdd6f4",
            border: "1px solid #232338",
            fontFamily: "Inter, sans-serif",
          },
          success: { iconTheme: { primary: "#a6e3a1", secondary: "#1a1a2e" } },
          error: { iconTheme: { primary: "#f38ba8", secondary: "#1a1a2e" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);
