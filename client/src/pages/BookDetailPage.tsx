import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import "./BookDetailPage.css";
import { categoryToSlug, formatPrice, getBookById, getBookDetailPath, getRelatedBooks, type Book } from "@/data/catalog";

function DetailCover({ book, compact = false }: { book: Book; compact?: boolean }) {
  const [base, accent, ink] = book.cover.palette;
  return <div className={`book-cover book-cover--${book.cover.variant} ${compact ? "book-cover--compact" : ""}`} style={{ "--cover-base": base, "--cover-accent": accent, "--cover-ink": ink } as CSSProperties}><div className="book-cover__grain" /><span className="book-cover__publisher">INK & IVORY EDITIONS</span><div className="book-cover__motif" /><div className="book-cover__copy"><span>{book.title}</span><small>{book.author}</small></div><span className="book-cover__motif-copy">{book.cover.motif}</span></div>;
}

export default function BookDetailPage() {
  const [, params] = useRoute("/book/:id");
  const [, setLocation] = useLocation();
  const book = getBookById(params?.id || "");
  const [format, setFormat] = useState("Hardcover");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("ink-and-ivory-bag") || "{}"));
      setWishlist(JSON.parse(localStorage.getItem("ink-and-ivory-wishlist") || "[]"));
    } finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("ink-and-ivory-bag", JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("ink-and-ivory-wishlist", JSON.stringify(wishlist)); }, [wishlist, hydrated]);

  const relatedBooks = useMemo(() => book ? getRelatedBooks(book) : [], [book]);
  const bagCount = Object.values(cart).reduce((total, itemQuantity) => total + itemQuantity, 0);

  if (!book) return <main className="book-not-found"><BookOpen size={28} /><h1>That title is not on this shelf.</h1><button className="button button--dark" onClick={() => setLocation("/")}>Return home <ArrowRight size={16} /></button></main>;

  const isSaved = wishlist.includes(book.id);
  const addToBag = () => {
    setCart(current => ({ ...current, [book.id]: (current[book.id] || 0) + quantity }));
    toast.success(`${quantity} ${quantity === 1 ? "copy" : "copies"} of ${book.title} ${quantity === 1 ? "is" : "are"} now in your bag.`);
  };
  const toggleWishlist = () => {
    setWishlist(current => isSaved ? current.filter(id => id !== book.id) : [...current, book.id]);
    toast.success(isSaved ? `${book.title} was removed from your wishlist.` : `${book.title} was saved to your wishlist.`);
  };

  return <div className="book-detail-page">
    <header className="book-detail-header"><button className="brand" onClick={() => setLocation("/")} aria-label="Return to INK & IVORY home"><span className="brand__mark"><BookOpen size={17} /></span><span>INK <i>&</i> IVORY</span></button><div><button onClick={() => setLocation(`/category/${categoryToSlug(book.category)}`)}>{book.category}</button><span><Heart size={16} /> {wishlist.length}</span><span><ShoppingBag size={16} /> {bagCount}</span></div></header>
    <main>
      <section className="book-detail-hero">
        <button className="book-back" onClick={() => setLocation(`/category/${categoryToSlug(book.category)}`)}><ArrowLeft size={16} /> Back to {book.category}</button>
        <div className="book-detail-hero__visual"><span className="book-detail-hero__shape" /><DetailCover book={book} /></div>
        <div className="book-detail-hero__copy"><p className="book-detail-hero__category">{book.category}</p><h1>{book.title}</h1><p className="book-detail-hero__author">by {book.author}</p><p className="book-detail-hero__description">{book.description}</p><div className="book-detail-hero__price"><strong>{formatPrice(book.price)}</strong>{book.originalPrice && <del>{formatPrice(book.originalPrice)}</del>}</div><div className="format-selector"><p>Choose an edition</p><div>{["Hardcover", "Paperback", "Digital edition"].map(option => <button className={format === option ? "is-selected" : ""} onClick={() => setFormat(option)} key={option}>{format === option && <Check size={13} />}{option}</button>)}</div></div><div className="purchase-row"><div className="detail-quantity"><button onClick={() => setQuantity(current => Math.max(1, current - 1))} aria-label="Reduce quantity"><Minus size={15} /></button><b>{quantity}</b><button onClick={() => setQuantity(current => current + 1)} aria-label="Increase quantity"><Plus size={15} /></button></div><button className="button button--dark" onClick={addToBag}><ShoppingBag size={17} /> Add to bag</button><button className={isSaved ? "detail-wish is-saved" : "detail-wish"} onClick={toggleWishlist} aria-label="Toggle wishlist"><Heart size={18} fill={isSaved ? "currentColor" : "none"} /></button></div><p className="delivery-note">Complimentary shipping on orders over ₹999.</p></div>
      </section>
      <section className="book-information"><div className="book-information__story"><p className="detail-label">A closer look</p><h2>Made for the<br /><em>reading life.</em></h2><p>{book.description} This edition is selected for its considered design, tactile finish, and the kind of writing that keeps returning to you long after the final page.</p></div><dl className="book-specs"><div><dt>Edition</dt><dd>{book.edition}</dd></div><div><dt>Pages</dt><dd>{book.pages}</dd></div><div><dt>ISBN</dt><dd>{book.isbn}</dd></div><div><dt>Publisher</dt><dd>INK &amp; IVORY Editions</dd></div><div><dt>Language</dt><dd>English</dd></div><div><dt>Publication</dt><dd>Autumn 2026</dd></div></dl></section>
      <section className="review-section"><div><p className="detail-label">Reader notes</p><h2>Verified reviews,<br /><em>when they arrive.</em></h2></div><div className="review-section__empty"><BookOpen size={26} /><h3>No verified reviews published yet.</h3><p>Reader notes appear here only after a confirmed purchase. We will keep this shelf honest.</p></div></section>
      <section className="related-section"><div className="related-section__heading"><div><p className="detail-label">Keep reading</p><h2>You may also like.</h2></div><button className="text-link" onClick={() => setLocation(`/category/${categoryToSlug(book.category)}`)}>Explore {book.category} <ArrowRight size={16} /></button></div><div className="related-grid">{relatedBooks.map(related => <article key={related.id} className="related-book"><button className="related-book__visual" onClick={() => setLocation(getBookDetailPath(related))} aria-label={`Open ${related.title}`}><DetailCover book={related} /></button><h3><button onClick={() => setLocation(getBookDetailPath(related))}>{related.title}</button></h3><p>{related.author}</p><span>{formatPrice(related.price)}</span></article>)}</div></section>
    </main>
  </div>;
}
