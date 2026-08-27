import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Heart, Search, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import "./CategoryPage.css";
import { books, categoryMeta, categoryToSlug, filterCategoryBooks, formatPrice, getBookDetailPath, getCategoryFromSlug, type Book } from "@/data/catalog";

function CategoryBookCover({ book }: { book: Book }) {
  const [base, accent, ink] = book.cover.palette;
  return (
    <div className={`book-cover book-cover--${book.cover.variant}`} style={{ "--cover-base": base, "--cover-accent": accent, "--cover-ink": ink } as CSSProperties}>
      <div className="book-cover__grain" />
      <span className="book-cover__publisher">INK & IVORY EDITIONS</span>
      <div className="book-cover__motif" />
      <div className="book-cover__copy"><span>{book.title}</span><small>{book.author}</small></div>
      <span className="book-cover__motif-copy">{book.cover.motif}</span>
    </div>
  );
}

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const [, setLocation] = useLocation();
  const category = getCategoryFromSlug(params?.slug || "");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("ink-and-ivory-bag") || "{}"));
      setWishlist(JSON.parse(localStorage.getItem("ink-and-ivory-wishlist") || "[]"));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem("ink-and-ivory-bag", JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("ink-and-ivory-wishlist", JSON.stringify(wishlist)); }, [wishlist, hydrated]);

  const categoryBooks = useMemo(() => books.filter(book => book.category === category), [category]);
  const visibleBooks = useMemo(() => category ? filterCategoryBooks(category, query) : [], [category, query]);
  const bagCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  const addToBag = (book: Book) => {
    setCart(current => ({ ...current, [book.id]: (current[book.id] || 0) + 1 }));
    toast.success(`${book.title} is now in your bag.`);
  };

  const toggleWishlist = (book: Book) => {
    const saved = wishlist.includes(book.id);
    setWishlist(current => saved ? current.filter(id => id !== book.id) : [...current, book.id]);
    toast.success(saved ? `${book.title} was removed from your wishlist.` : `${book.title} was saved to your wishlist.`);
  };

  if (!category) {
    return <main className="category-not-found"><BookOpen size={28} /><h1>That shelf is elsewhere.</h1><button className="button button--dark" onClick={() => setLocation("/")}>Return home <ArrowRight size={16} /></button></main>;
  }

  const meta = categoryMeta[category];
  return (
    <div className="category-page">
      <header className="category-page__header">
        <button className="brand" onClick={() => setLocation("/")} aria-label="Return to INK & IVORY home"><span className="brand__mark"><BookOpen size={17} /></span><span>INK <i>&</i> IVORY</span></button>
        <div className="category-page__controls"><span><Heart size={17} /> {wishlist.length}</span><span><ShoppingBag size={17} /> {bagCount}</span></div>
      </header>
      <main>
        <section className="category-hero">
          <button className="back-link" onClick={() => setLocation("/")}><ArrowLeft size={16} /> All shelves</button>
          <span className="category-hero__bookmark" aria-hidden="true"><BookOpen size={24} /></span>
          <p>The INK & IVORY library</p>
          <h1>{category}.</h1>
          <div><span>{categoryBooks.length} {categoryBooks.length === 1 ? "title" : "titles"} in this edit</span><p>{meta.description}</p></div>
        </section>
        <section className="category-content">
          <aside className="category-aside">
            <p className="category-aside__label">Browse the library</p>
            <nav aria-label="Book categories">
              {Object.keys(categoryMeta).map(name => <button className={name === category ? "is-current" : ""} onClick={() => setLocation(`/category/${categoryToSlug(name)}`)} key={name}>{name}<ArrowRight size={14} /></button>)}
            </nav>
            <blockquote>“{meta.note}”</blockquote>
          </aside>
          <div className="category-library">
            <div className="category-library__tools">
              <div><h2>On this shelf</h2><p>Selected with a reader’s eye.</p></div>
              <label className="category-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${category.toLowerCase()}…`} />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label>
            </div>
            {visibleBooks.length ? <div className="category-book-grid">{visibleBooks.map(book => <article className="category-book" key={book.id}><button className="category-book__visual" onClick={() => setLocation(getBookDetailPath(book))} aria-label={`Open ${book.title}`}><CategoryBookCover book={book} />{book.badge && <span className="badge">{book.badge}</span>}</button><div className="category-book__meta"><h3><button onClick={() => setLocation(getBookDetailPath(book))}>{book.title}</button></h3><p>{book.author}</p><div><span>{formatPrice(book.price)}</span><button className={wishlist.includes(book.id) ? "wish-button is-saved" : "wish-button"} onClick={() => toggleWishlist(book)} aria-label={`Toggle ${book.title} wishlist`}><Heart size={16} fill={wishlist.includes(book.id) ? "currentColor" : "none"} /></button><button className="add-button" onClick={() => addToBag(book)} aria-label={`Add ${book.title} to bag`}>Add <ArrowRight size={14} /></button></div></div></article>)}</div> : <div className="category-empty"><BookOpen size={25} /><h3>No match on this shelf.</h3><p>Try another title or author.</p><button className="text-link" onClick={() => setQuery("")}>Clear search <X size={14} /></button></div>}
          </div>
        </section>
      </main>
    </div>
  );
}
