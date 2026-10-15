import type { CartLine, StoreSettings } from "./types";

export const MAX_QTY_PER_LINE = 20;

export type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "setQty"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "replaceAll"; lines: CartLine[] }
  | { type: "clear" };

function clampQty(quantity: number, maxStock: number): number {
  return Math.max(1, Math.min(Math.floor(quantity), maxStock, MAX_QTY_PER_LINE));
}

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "hydrate":
    case "replaceAll":
      return action.lines;
    case "add": {
      const existing = state.find((l) => l.variantId === action.line.variantId);
      if (existing) {
        return state.map((l) =>
          l.variantId === existing.variantId
            ? {
                ...l,
                maxStock: action.line.maxStock,
                quantity: clampQty(l.quantity + action.line.quantity, action.line.maxStock),
              }
            : l,
        );
      }
      return [
        ...state,
        { ...action.line, quantity: clampQty(action.line.quantity, action.line.maxStock) },
      ];
    }
    case "setQty":
      return state.map((l) =>
        l.variantId === action.variantId
          ? { ...l, quantity: clampQty(action.quantity, l.maxStock) }
          : l,
      );
    case "remove":
      return state.filter((l) => l.variantId !== action.variantId);
    case "clear":
      return [];
  }
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function shippingFor(
  subtotal: number,
  settings: Pick<StoreSettings, "shipping_fee" | "free_shipping_over">,
): number {
  if (subtotal <= 0) return 0;
  return subtotal >= settings.free_shipping_over ? 0 : settings.shipping_fee;
}

/** Validates data read back from localStorage before trusting it. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === "object" &&
        typeof (l as CartLine).variantId === "string" &&
        typeof (l as CartLine).productId === "string" &&
        typeof (l as CartLine).price === "number" &&
        typeof (l as CartLine).quantity === "number" &&
        (l as CartLine).quantity > 0,
    );
  } catch {
    return [];
  }
}
