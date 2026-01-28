import { useState } from "react";
import { useCart } from "../store/CartContext";
import { formatPrice } from "../utils/formatPrice";

const CheckoutPage = () => {
  const { items, subtotalCents } = useCart();
  const currency = items[0]?.currency || "PHP";
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleGcashPayment = async () => {
    if (items.length === 0 || paying) return;
    setPaying(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/payments/gcash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        message?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.message || "Payment request failed.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment request failed.";
      setPaymentError(message);
      setPaying(false);
    }
  };

  return (
    <section className="max-w-[1240px] mx-auto px-4 pt-32 pb-20 text-slate-900 dark:text-white">
      <h1 className="text-3xl font-heading uppercase mb-10">Checkout</h1>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-900 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-white">
          <h2 className="text-lg font-semibold uppercase mb-4">Contact</h2>
          <p className="text-sm text-slate-500 dark:text-white/60">
            Checkout form coming soon. This page is wired for routing now.
          </p>
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">
              Payment
            </h3>
            <button
              type="button"
              onClick={handleGcashPayment}
              disabled={paying || items.length === 0}
              className="mt-4 w-full rounded bg-[#00a34a] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? "Redirecting..." : "Pay with GCash"}
            </button>
            {paymentError && (
              <p className="mt-3 text-xs text-red-400">{paymentError}</p>
            )}
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-900 dark:border-white/10 dark:bg-[#0f0f0f] dark:text-white">
          <h2 className="text-lg font-semibold uppercase mb-4">
            Order summary
          </h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-white/5 p-2">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/10" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm">
                  {formatPrice(item.price_cents * item.quantity, item.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">
              <span>Subtotal</span>
              <span className="text-slate-900 dark:text-white">
                {formatPrice(subtotalCents, currency)}
              </span>
            </div>
            {/* <div className="mt-2 text-xs text-slate-500 dark:text-white/50">
              Taxes calculated at checkout.
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CheckoutPage;
