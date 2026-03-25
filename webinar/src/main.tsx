import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { CartProvider } from "./store/CartContext";
import { AuthProvider } from "./store/AuthContext";

const savedTheme = window.localStorage.getItem("theme");
document.documentElement.classList.toggle("dark", savedTheme ? savedTheme === "dark" : true);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
