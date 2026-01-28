import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type Book from "../entities/Book";
import { resolveBookImage } from "../utils/bookImages";
import { getPurchaseOptions } from "../utils/bookAvailability";

export type CartItem = {
  id: number;
  slug: string;
  title: string;
  price_cents: number;
  currency: string;
  image_url: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  subtotalCents: number;
  notice: string | null;
  isOpen: boolean;
  addItem: (book: Book, quantity?: number) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "cart_items";

const clampQuantity = (value: number) => Math.min(99, Math.max(1, value));

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, []);

  const subtotalCents = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [items]
  );

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2500);
  };

  const addItem = (book: Book, quantity = 1) => {
    if (!book) return;
    const purchaseOptions = getPurchaseOptions(book.slug);
    if (!purchaseOptions.internalAvailable) {
      showNotice("This book is available externally only.");
      return;
    }
    const nextQuantity = clampQuantity(quantity);
    const imageUrl = resolveBookImage(book.slug, book.cover_image_url);

    setItems((prev) => {
      const existing = prev.find((item) => item.id === book.id);
      if (existing) {
        return prev.map((item) =>
          item.id === book.id
            ? { ...item, quantity: clampQuantity(item.quantity + nextQuantity) }
            : item
        );
      }
      return [
        ...prev,
        {
          id: book.id,
          slug: book.slug,
          title: book.title,
          price_cents: book.price_cents,
          currency: book.currency,
          image_url: imageUrl,
          quantity: nextQuantity,
        },
      ];
    });
    showNotice("Product added to cart successfully.");
    setIsOpen(true);
  };

  const updateItemQuantity = (id: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: clampQuantity(quantity) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const value: CartContextValue = {
    items,
    subtotalCents,
    notice,
    isOpen,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
