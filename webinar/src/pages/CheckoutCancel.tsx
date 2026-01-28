import { Link } from "react-router-dom";

const CheckoutCancel = () => {
  return (
    <section className="max-w-[800px] mx-auto px-4 pt-32 pb-20 text-center">
      <h1 className="text-3xl font-heading uppercase mb-4">Payment Canceled</h1>
      <p className="text-sm text-white/70">
        Your payment was canceled. You can try again anytime.
      </p>
      <div className="mt-6">
        <Link
          to="/checkout"
          className="inline-flex rounded bg-lantern px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black hover:brightness-110"
        >
          Back to Checkout
        </Link>
      </div>
    </section>
  );
};

export default CheckoutCancel;
