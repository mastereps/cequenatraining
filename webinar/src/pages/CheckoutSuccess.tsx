import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../store/CartContext";

const CheckoutSuccess = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <section className="max-w-[800px] mx-auto px-4 pt-32 pb-20 text-center">
      <h1 className="text-3xl font-heading uppercase mb-4">Payment Success</h1>
      <p className="text-sm text-white/70">
        Thanks! Your GCash payment was received.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex rounded bg-lantern px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black hover:brightness-110"
        >
          Continue Shopping
        </Link>
      </div>
    </section>
  );
};

export default CheckoutSuccess;
