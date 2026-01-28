// import LoginForm from "./components/LoginForm";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import CartDrawer from "./components/CartDrawer";
import LandingPage from "./landing-page/LandingPage";
import BookDetails from "./pages/BookDetails";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import Footer from "./pages/Footer";
import PrivacyPolicy from "./pages/Privacy/PrivacyPolicy";
// import EventsList from "./components/EventList";
// import SearchInput from "./components/SearchInput";
// import { useState } from "react";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

function App() {
  // const [searchText, setSearchText] = useState("");
  // const [topic, setTopic] = useState("All");
  // const [order, setOrder] = useState("dateAsc");

  return (
    <>
      <NavBar />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/products/:slug" element={<BookDetails />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/checkout/cancel" element={<CheckoutCancel />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      <CartDrawer />
      <Footer />
    </>
  );
}

export default App;
