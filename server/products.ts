import { TRPCError } from "@trpc/server";

export type CheckoutItemInput = {
  bookId: string;
  quantity: number;
};

export const checkoutProducts = {
  "quiet-architect": { name: "The Quiet Architect", description: "by Elias Rowan", unitAmount: 59900 },
  "art-starting-again": { name: "The Art of Starting Again", description: "by Clara Bennett", unitAmount: 49900 },
  "after-last-train": { name: "After the Last Train", description: "by Noah Ellis", unitAmount: 44900 },
  "thinking-systems": { name: "Thinking in Systems", description: "by Adrian Cole", unitAmount: 69900 },
  "weight-of-words": { name: "The Weight of Words", description: "by Mira Lawson", unitAmount: 39900 },
  "room-sunlight": { name: "A Room Full of Sunlight", description: "by Eleanor Hayes", unitAmount: 54900 },
  "human-pattern": { name: "The Human Pattern", description: "by Daniel Mercer", unitAmount: 64900 },
  "small-habits": { name: "Small Habits, Big Days", description: "by Oliver Reed", unitAmount: 49900 },
  "last-letter": { name: "The Last Letter", description: "by Sophie Laurent", unitAmount: 44900 },
  "beyond-obvious": { name: "Beyond the Obvious", description: "by Marcus Vale", unitAmount: 59900 },
  "founders-notebook": { name: "The Founders' Notebook", description: "by James Carter", unitAmount: 74900 },
  "where-light-ends": { name: "Where the Light Ends", description: "by Amelia Rose", unitAmount: 52900 },
  "long-way-home": { name: "The Long Way Home", description: "by Theo Martin", unitAmount: 57900 },
  "ordinary-life": { name: "Notes from an Ordinary Life", description: "by Hannah Brooks", unitAmount: 49900 },
  "language-mind": { name: "The Language of Mind", description: "by Nathan Wright", unitAmount: 69900 },
  "thousand-moments": { name: "A Thousand Small Moments", description: "by Lily Harper", unitAmount: 44900 },
  "courage-different": { name: "The Courage to Be Different", description: "by Ethan Blake", unitAmount: 54900 },
  "midnight-march": { name: "Midnight in March", description: "by Isabella Grey", unitAmount: 59900 },
} as const;

export function getCheckoutProducts(items: CheckoutItemInput[]) {
  const combined = new Map<string, number>();
  items.forEach(item => combined.set(item.bookId, (combined.get(item.bookId) || 0) + item.quantity));

  return Array.from(combined, ([bookId, quantity]) => {
    const product = checkoutProducts[bookId as keyof typeof checkoutProducts];
    if (!product) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A selected book is no longer available for checkout." });
    }
    if (quantity < 1 || quantity > 10) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Each title can have between one and ten copies in a checkout." });
    }
    return { bookId, quantity, product };
  });
}
