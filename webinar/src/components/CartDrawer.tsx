import { Link } from "react-router-dom";
import { useCart } from "../store/CartContext";
import { formatPrice } from "../utils/formatPrice";

const clampQuantity = (value: number) => Math.min(99, Math.max(1, value));

const CartDrawer = () => {
  const {
    items,
    subtotalCents,
    notice,
    isOpen,
    closeCart,
    updateItemQuantity,
    removeItem,
  } = useCart();

  const currency = items[0]?.currency || "PHP";

  return (
    <div
      className={`fixed inset-0 z-[1000] ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden bg-[#1a1a1a] text-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h2 className="text-lg font-heading uppercase tracking-wide">
            Shopping Cart
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="text-2xl cursor-pointer leading-none text-white/70 hover:text-white"
            aria-label="Close cart"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {notice && (
            <div className="mb-4 rounded bg-[#e7f4e4] px-4 py-2 text-sm text-[#2f7a36]">
              {notice}
            </div>
          )}
          {items.length === 0 ? (
            <p className="text-sm text-white/60">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-white/10 pb-4"
                >
                  <div className="h-16 w-16 flex-shrink-0 rounded bg-white/5 p-2">
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
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-lantern">
                      {formatPrice(item.price_cents, item.currency)}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded border border-white/20 px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(
                              item.id,
                              clampQuantity(item.quantity - 1),
                            )
                          }
                          disabled={item.quantity <= 1}
                          className={`h-8 w-8 cursor-pointer rounded text-lg ${
                            item.quantity <= 1
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-white/10"
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
                              clampQuantity(item.quantity + 1),
                            )
                          }
                          className="h-8 w-8 cursor-pointer rounded text-lg hover:bg-white/10"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs cursor-pointer uppercase tracking-[0.2em] text-white/60 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-white/10 px-6 py-5">
          <div className="flex items-center justify-between text-sm uppercase tracking-[0.2em] text-white/60">
            <span>Subtotal</span>
            <span className="text-white">
              {formatPrice(subtotalCents, currency)}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              to="/checkout"
              onClick={closeCart}
              className="rounded bg-[#e3b323] py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-black hover:brightness-110"
            >
              Checkout
            </Link>
            <Link
              to="/cart"
              onClick={closeCart}
              className="text-center text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
            >
              View cart
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CartDrawer;
