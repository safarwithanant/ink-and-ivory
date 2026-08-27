export type CartState = Record<string, number>;

export function updateCartItemQuantity(cart: CartState, bookId: string, amount: number, maxPerTitle = 10): CartState {
  const next = { ...cart };
  const quantity = (next[bookId] || 0) + amount;
  if (quantity <= 0) delete next[bookId];
  else next[bookId] = Math.min(quantity, maxPerTitle);
  return next;
}

export function getCartItemCount(cart: CartState) {
  return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
}
