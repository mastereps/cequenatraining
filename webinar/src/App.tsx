import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import CartDrawer from "./components/CartDrawer";
import LandingPage from "./landing-page/LandingPage";
import BookDetails from "./pages/BookDetails";
import AboutPage from "./pages/AboutPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import Footer from "./pages/Footer";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import PrivacyPolicy from "./pages/Privacy/PrivacyPolicy";
import ProductsCollectionPage from "./pages/ProductsCollectionPage";
import WebinarsPage from "./pages/webinars/WebinarsPage";
import WebinarDetailPage from "./pages/webinars/WebinarDetailPage";
import WebinarRegisterPage from "./pages/webinars/WebinarRegisterPage";
import WebinarSubmittedPage from "./pages/webinars/WebinarSubmittedPage";
import VerifyPage from "./pages/webinars/VerifyPage";
import WebinarConfirmedPage from "./pages/webinars/WebinarConfirmedPage";
import WebinarPaymentAdminIndexPage from "./pages/webinars/WebinarPaymentAdminIndexPage";
import WebinarPaymentAdminPage from "./pages/webinars/WebinarPaymentAdminPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBooksPage from "./pages/admin/AdminBooksPage";
import AdminWebinarsPage from "./pages/admin/AdminWebinarsPage";
import AdminPlaceholderPage from "./pages/admin/AdminPlaceholderPage";
import RequireRole from "./components/RequireRole";
import { isAdminUser, isSuperAdmin } from "./features/auth/roles";
import { CART_CHECKOUT_ENABLED } from "./config/commerce";
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

function App() {
  // The admin area brings its own shell, so the marketing chrome is skipped there.
  const isAdminArea = useLocation().pathname.startsWith("/admin");

  return (
    <>
      {!isAdminArea && <NavBar />}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/products" element={<ProductsCollectionPage />} />
        <Route path="/products/:slug" element={<BookDetails />} />
        <Route path="/webinars" element={<WebinarsPage />} />
        <Route path="/webinars/:slug" element={<WebinarDetailPage />} />
        <Route path="/webinars/:slug/register" element={<WebinarRegisterPage />} />
        <Route path="/webinars/:slug/submitted" element={<WebinarSubmittedPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/webinars/:slug/confirmed" element={<WebinarConfirmedPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole allow={isAdminUser}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route
            path="content"
            element={
              <RequireRole allow={isSuperAdmin}>
                <AdminContentPage />
              </RequireRole>
            }
          />
          <Route path="webinars/payments" element={<WebinarPaymentAdminIndexPage />} />
          <Route path="webinars/:slug/payments" element={<WebinarPaymentAdminPage />} />
          <Route path="webinars" element={<AdminWebinarsPage />} />
          <Route path="events" element={<AdminPlaceholderPage title="Events" />} />
          <Route path="registrations" element={<AdminPlaceholderPage title="Registrations" />} />
          <Route path="orders" element={<AdminPlaceholderPage title="Orders" />} />
          <Route path="books" element={<AdminBooksPage />} />
          <Route path="users" element={<AdminPlaceholderPage title="Users" />} />
          <Route path="settings" element={<AdminPlaceholderPage title="Settings" />} />
        </Route>
        <Route
          path="/cart"
          element={
            CART_CHECKOUT_ENABLED ? <CartPage /> : <Navigate to="/products" replace />
          }
        />
        <Route
          path="/checkout"
          element={
            CART_CHECKOUT_ENABLED ? <CheckoutPage /> : <Navigate to="/products" replace />
          }
        />
        <Route
          path="/checkout/success"
          element={
            CART_CHECKOUT_ENABLED ? (
              <CheckoutSuccess />
            ) : (
              <Navigate to="/products" replace />
            )
          }
        />
        <Route
          path="/checkout/cancel"
          element={
            CART_CHECKOUT_ENABLED ? <CheckoutCancel /> : <Navigate to="/products" replace />
          }
        />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      {CART_CHECKOUT_ENABLED && <CartDrawer />}
      {!isAdminArea && <Footer />}
    </>
  );
}

export default App;
