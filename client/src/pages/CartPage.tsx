import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Heart, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { books, formatPrice } from "@/data/catalog";
import { getCartItemCount, updateCartItemQuantity, type CartState } from "@/lib/cart";
import { trpc } from "@/lib/trpc";
import "./CartPage.css";

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [cart, setCart] = useState<CartState>({});
  const [hydrated, setHydrated] = useState(false);
  const checkout = trpc.checkout.createSession.useMutation();

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("ink-and-ivory-bag") || "{}")); }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("ink-and-ivory-bag", JSON.stringify(cart)); }, [cart, hydrated]);

  const entries = useMemo(() => books.flatMap(book => cart[book.id] ? [{ book, quantity: cart[book.id] }] : []), [cart]);
  const itemCount = getCartItemCount(cart);
  const subtotal = entries.reduce((total, { book, quantity }) => total + book.price * quantity, 0);
  const shipping = subtotal >= 999 ? 0 : entries.length ? 99 : 0;
  const total = subtotal + shipping;

  const updateQuantity = (bookId: string, amount: number) => setCart(current => updateCartItemQuantity(current, bookId, amount));

  const beginCheckout = async () => {
    if (!entries.length) return;
    if (loading) return;
    if (!isAuthenticated) {
      toast.message("Please sign in to continue to secure checkout.");
      startLogin();
      return;
    }
    try {
      const result = await checkout.mutateAsync({ items: entries.map(({ book, quantity }) => ({ bookId: book.id, quantity })) });
      toast.message("Opening secure checkout in a new tab.");
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout. Please try again.");
    }
  };

  return <div className="cart-page"><header className="cart-header"><button className="brand" onClick={() => setLocation("/")} aria-label="Return to INK & IVORY home"><span className="brand__mark"><BookOpen size={17} /></span><span>INK <i>&</i> IVORY</span></button><button className="cart-header__continue" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Continue browsing</button></header><main className="cart-main"><div className="cart-main__heading"><p>Your selection</p><h1>Shopping bag <span>({itemCount})</span></h1></div>{entries.length ? <div className="cart-layout"><section className="cart-items">{entries.map(({ book, quantity }) => <article key={book.id} className="cart-item"><div className={`cart-item__cover book-cover book-cover--${book.cover.variant}`} style={{ "--cover-base": book.cover.palette[0], "--cover-accent": book.cover.palette[1], "--cover-ink": book.cover.palette[2] } as React.CSSProperties}><div className="book-cover__grain" /><span className="book-cover__publisher">INK & IVORY EDITIONS</span><div className="book-cover__motif" /><div className="book-cover__copy"><span>{book.title}</span><small>{book.author}</small></div><span className="book-cover__motif-copy">{book.cover.motif}</span></div><div className="cart-item__details"><p>{book.category}</p><h2>{book.title}</h2><span>by {book.author}</span><small>{book.edition}</small><button className="cart-item__remove" onClick={() => updateQuantity(book.id, -quantity)}><Trash2 size={14} /> Remove</button></div><div className="cart-item__actions"><strong>{formatPrice(book.price * quantity)}</strong><div className="cart-quantity"><button onClick={() => updateQuantity(book.id, -1)} aria-label={`Reduce ${book.title} quantity`}><Minus size={14} /></button><b>{quantity}</b><button onClick={() => updateQuantity(book.id, 1)} aria-label={`Increase ${book.title} quantity`}><Plus size={14} /></button></div></div></article>)}</section><aside className="cart-summary"><p className="detail-label">Order summary</p><h2>For your<br /><em>next chapter.</em></h2><div className="cart-summary__rows"><p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p><p><span>Shipping</span><strong>{shipping ? formatPrice(shipping) : "Complimentary"}</strong></p><p className="cart-summary__total"><span>Total</span><strong>{formatPrice(total)}</strong></p></div><button className="button button--dark button--full" onClick={beginCheckout} disabled={checkout.isPending || loading}>{checkout.isPending ? "Opening checkout…" : <><ShoppingBag size={17} /> Secure checkout</>}</button><p className="cart-summary__note">Secure payment and shipping details are collected by Stripe.</p></aside></div> : <section className="cart-empty"><ShoppingBag size={34} /><p className="detail-label">Your bag is waiting</p><h2>Every good shelf<br /><em>starts somewhere.</em></h2><p>There is always room for one more story.</p><button className="button button--dark" onClick={() => setLocation("/")}>Explore the collection <ArrowRight size={17} /></button></section>}</main></div>;
}
