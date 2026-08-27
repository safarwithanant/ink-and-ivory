export type PurchasedBook = { bookId: string; quantity: number };

export function encodePurchasedBooks(items: PurchasedBook[]) {
  return items.map(item => `${item.bookId}:${item.quantity}`).join(",");
}

export function decodePurchasedBooks(value: string | undefined): PurchasedBook[] {
  if (!value) return [];
  return value.split(",").flatMap(entry => {
    const [bookId, quantityValue] = entry.split(":");
    const quantity = Number(quantityValue);
    return bookId && Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? [{ bookId, quantity }] : [];
  });
}
