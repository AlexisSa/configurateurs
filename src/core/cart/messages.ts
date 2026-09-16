/** Messages panier Oxatis (bridge parent xeilom.fr). */

export const ADD_TO_CART_MESSAGE_TYPE = "XEILOM_ADD_TO_CART";
export const ADD_TO_CART_RESULT_MESSAGE_TYPE = "XEILOM_ADD_TO_CART_RESULT";

export const OXATIS_ORIGIN = "https://www.xeilom.fr";
/** Délai max avant notification d’échec (le bridge peut ouvrir le modal lentement). */
export const CART_TIMEOUT_MS = 8000;

export type OxatisCartItem = {
  productId: number;
  quantity: number;
};

export type AddToCartMessage = {
  type: typeof ADD_TO_CART_MESSAGE_TYPE;
  items: OxatisCartItem[];
  productId: number;
  quantity: number;
};

export type AddToCartResultMessage = {
  type: typeof ADD_TO_CART_RESULT_MESSAGE_TYPE;
  success: boolean;
  productId?: number;
  itemCount?: number;
  method?: string;
  error?: string;
};

export function buildOxatisCartUrl(items: OxatisCartItem[]): string {
  const params = items
    .map(
      (item) =>
        `ItmID=${item.productId}&itemQty=${Math.max(1, Math.floor(item.quantity) || 1)}`,
    )
    .join("&");
  return `${OXATIS_ORIGIN}/PBShoppingCart.asp?${params}`;
}
