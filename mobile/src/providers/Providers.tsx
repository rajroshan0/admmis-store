import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
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
import { supabase } from "@/lib/supabase";
import { cartCount, cartReducer, cartSubtotal, parseStoredCart } from "@/shared/cart";
import { isLang, translate, type DictKey } from "@/shared/i18n";
import type { CartLine, Lang } from "@/shared/types";

/* ───────────── Language ───────────── */
interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}
const LangContext = createContext<LangValue | null>(null);
const LANG_KEY = "admmis-lang";

function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (isLang(v)) setLangState(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
      },
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <Providers>");
  return ctx;
}

/* ───────────── Auth ───────────── */
interface AuthValue {
  ready: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <Providers>");
  return ctx;
}

/* ───────────── Cart ───────────── */
const CART_KEY = "admmis-cart-v1";

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  changed: boolean;
  add: (line: CartLine) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Re-check price + stock of every line against the database. */
  refresh: () => Promise<void>;
}
const CartContext = createContext<CartValue | null>(null);

function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);
  const [changed, setChanged] = useState(false);
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then((raw) => dispatch({ type: "hydrate", lines: parseStoredCart(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Save after every change (but only once the saved cart has been loaded, so we never wipe it).
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, ready]);

  const refresh = useCallback(async () => {
    const current = linesRef.current;
    if (current.length === 0) return;
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, stock, products!inner(price, is_active, images)")
      .in("id", current.map((l) => l.variantId));
    if (error || !data) return; // offline: keep what we have

    type P = { price: number; is_active: boolean; images: string[] };
    type Row = { id: string; stock: number; products: P | P[] };
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
        didChange = true;
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

  const value = useMemo<CartValue>(
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

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <Providers>");
  return ctx;
}

/* ───────────── Favorites (saved on this phone) ───────────── */
const FAV_KEY = "admmis-favs-v1";

interface FavValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
}
const FavContext = createContext<FavValue | null>(null);

function FavProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY)
      .then((raw) => {
        try {
          const data: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(data)) setIds(data.filter((x): x is string => typeof x === "string"));
        } catch {
          /* ignore a damaged value */
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids)).catch(() => {});
  }, [ids, ready]);

  const value = useMemo<FavValue>(
    () => ({
      ids,
      has: (id) => ids.includes(id),
      toggle: (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur])),
    }),
    [ids],
  );
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites(): FavValue {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites must be used inside <Providers>");
  return ctx;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <FavProvider>{children}</FavProvider>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  );
}
