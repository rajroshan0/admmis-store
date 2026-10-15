"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cartCount, cartReducer, cartSubtotal, parseStoredCart } from "@/shared/cart";
import type { CartLine } from "@/shared/types";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "admmis-cart-v1";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  /** True when a refresh from the server changed prices/stock or dropped items. */
  changed: boolean;
  add: (line: CartLine) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Re-check price + stock of every line against the database. */
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);
  const [changed, setChanged] = useState(false);
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;

  // Load the saved cart after mount (localStorage doesn't exist on the server).
  useEffect(() => {
    try {
      dispatch({ type: "hydrate", lines: parseStoredCart(localStorage.getItem(STORAGE_KEY)) });
    } catch {
      /* private mode etc. — start with an empty cart */
    }
    setReady(true);
  }, []);

  // Save on every change (after the first load, so we never wipe the saved cart).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full / blocked */
    }
  }, [lines, ready]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        dispatch({ type: "hydrate", lines: parseStoredCart(e.newValue) });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = useCallback(async () => {
    const current = linesRef.current;
    if (current.length === 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, stock, products!inner(price, is_active, images)")
      .in("id", current.map((l) => l.variantId));
    if (error || !data) return; // offline or error: keep what we have

    type Row = {
      id: string;
      stock: number;
      products: { price: number; is_active: boolean; images: string[] } | { price: number; is_active: boolean; images: string[] }[];
    };
    const byId = new Map<string, { stock: number; price: number; active: boolean; image: string | null }>();
    for (const row of data as unknown as Row[]) {
      const p = Array.isArray(row.products) ? row.products[0] : row.products;
      if (p) byId.set(row.id, { stock: row.stock, price: p.price, active: p.is_active, image: p.images?.[0] ?? null });
    }

    let didChange = false;
    const next: CartLine[] = [];
    for (const l of current) {
      const fresh = byId.get(l.variantId);
      if (!fresh || !fresh.active || fresh.stock < 1) {
        didChange = true; // gone or sold out
        continue;
      }
      const quantity = Math.min(l.quantity, fresh.stock);
      if (quantity !== l.quantity || fresh.price !== l.price || fresh.stock !== l.maxStock) didChange = true;
      next.push({ ...l, price: fresh.price, maxStock: fresh.stock, quantity, image: fresh.image ?? l.image });
    }
    if (didChange) {
      dispatch({ type: "replaceAll", lines: next });
      setChanged(true);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      ready,
      changed,
      add: (line) => dispatch({ type: "add", line }),
      setQty: (variantId, quantity) => dispatch({ type: "setQty", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      clear: () => dispatch({ type: "clear" }),
      refresh,
    }),
    [lines, ready, changed, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
