import { Link } from "react-router-dom";
import { useCart } from "../store/CartContext";
import { useAuth } from "../store/AuthContext";
import { formatPrice } from "../utils/formatPrice";

const clampQuantity = (value: number) => Math.min(99, Math.max(1, value));

const CartPage = () => {
  const { items, subtotalCents, updateItemQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const currency = items[0]?.currency || "PHP";
  const checkoutHref = user ? "/checkout" : "/login?next=/checkout";

  return (
    <section className="max-w-[1240px] mx-auto px-4 pt-32 pb-20 text-slate-900 dark:text-white">
      <h1 className="text-3xl font-heading uppercase mb-10">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-800 dark:bg-[#0f0f0f] dark:text-slate-300">
          Your cart is empty.
          <div className="mt-4">
            <Link to="/" className="text-lantern underline">
              Continue shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-center dark:border-white/10"
              >
                <div className="h-24 w-24 rounded bg-slate-100 p-2 dark:bg-white/5">
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
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-sm text-slate-600 dark:text-white/70">
                  {formatPrice(item.price_cents, item.currency)}
                </div>
                <div className="inline-flex items-center gap-2 rounded border border-slate-300 px-2 py-1 dark:border-white/20">
                  <button
                    type="button"
                    onClick={() =>
                      updateItemQuantity(
                        item.id,
                        clampQuantity(item.quantity - 1)
                      )
                    }
                    disabled={item.quantity <= 1}
                    className={`h-8 w-8 rounded text-lg ${
                      item.quantity <= 1
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    -
                  </button>
                  <span className="min-w-[24px] text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateItemQuantity(
                        item.id,
                        clampQuantity(item.quantity + 1)
                      )
                    }
                    className="h-8 w-8 rounded text-lg hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
                <div className="text-sm font-semibold">
                  {formatPrice(
                    item.price_cents * item.quantity,
                    item.currency
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f0f]">
            <h2 className="text-lg font-semibold uppercase mb-4">Summary</h2>
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">
              <span>Subtotal</span>
              <span className="text-slate-900 dark:text-white">
                {formatPrice(subtotalCents, currency)}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-white/50">
              Taxes and shipping calculated at checkout.
            </p>
            <Link
              to={checkoutHref}
              className="mt-6 block rounded bg-[#e3b323] py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-black hover:brightness-110"
            >
              {user ? "Checkout" : "Login to checkout"}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default CartPage;
