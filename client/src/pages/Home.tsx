import { useEffect, useMemo, useState } from "react";
import "./HomeTypography.css";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Facebook,
  Heart,
  Instagram,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  books,
  categoryToSlug,
  categoryNotes,
  formatPrice,
  getBookDetailPath,
  journalEntries,
  readingPaths,
  type Book,
} from "@/data/catalog";

type Cart = Record<string, number>;

function BookCover({ book, compact = false }: { book: Book; compact?: boolean }) {
  const [base, accent, ink] = book.cover.palette;
  return (
    <div
      className={`book-cover book-cover--${book.cover.variant} ${compact ? "book-cover--compact" : ""}`}
      style={{ "--cover-base": base, "--cover-accent": accent, "--cover-ink": ink } as React.CSSProperties}
      aria-label={`Cover for ${book.title}`}
    >
      <div className="book-cover__grain" />
      <span className="book-cover__publisher">INK & IVORY EDITIONS</span>
      <div className="book-cover__motif" />
      <div className="book-cover__copy">
        <span>{book.title}</span>
        <small>{book.author}</small>
      </div>
      <span className="book-cover__motif-copy">{book.cover.motif}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, linkLabel, onLink }: { eyebrow: string; title: string; linkLabel?: string; onLink?: () => void }) {
  return (
    <div className="section-heading">
      <span className="section-heading__particle" aria-hidden="true"><BookOpen size={16} /><i>✦</i></span>
      <div>
        <span className="section-heading__mark">EX LIBRIS <b>✦</b> INK &amp; IVORY</span>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {linkLabel && (
        <button className="text-link" onClick={onLink}>
          {linkLabel} <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ProductCard({
  book,
  isWishlisted,
  onToggleWish,
  onAdd,
  onQuickView,
  onDetails,
}: {
  book: Book;
  isWishlisted: boolean;
  onToggleWish: (book: Book) => void;
  onAdd: (book: Book) => void;
  onQuickView: (book: Book) => void;
  onDetails: (book: Book) => void;
}) {
  return (
    <article className="product-card">
      <div className="product-card__visual">
        {book.badge && <span className="badge">{book.badge}</span>}
        <button
          className={`icon-button product-card__heart ${isWishlisted ? "is-active" : ""}`}
          onClick={() => onToggleWish(book)}
          aria-label={isWishlisted ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
        >
          <Heart size={17} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
        <BookCover book={book} />
        <button className="quick-view" onClick={() => onQuickView(book)}>
          Quick view <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="product-card__meta">
        <p className="product-card__category">{book.category}</p>
        <h3><button className="product-card__title-button" onClick={() => onDetails(book)}>{book.title}</button></h3>
        <p className="product-card__author">{book.author}</p>
        <div className="product-card__bottom">
          <div className="price-block">
            <span>{formatPrice(book.price)}</span>
            {book.originalPrice && <del>{formatPrice(book.originalPrice)}</del>}
          </div>
          <button className="add-button" onClick={() => onAdd(book)} aria-label={`Add ${book.title} to bag`}>
            <Plus size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Cart>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickView, setQuickView] = useState<Book | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("ink-and-ivory-bag") || "{}"));
      setWishlist(JSON.parse(localStorage.getItem("ink-and-ivory-wishlist") || "[]"));
      setRecentSearches(JSON.parse(localStorage.getItem("ink-and-ivory-recent-searches") || "[]"));
    } catch {
      localStorage.removeItem("ink-and-ivory-bag");
      localStorage.removeItem("ink-and-ivory-wishlist");
      localStorage.removeItem("ink-and-ivory-recent-searches");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("ink-and-ivory-bag", JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("ink-and-ivory-wishlist", JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("ink-and-ivory-recent-searches", JSON.stringify(recentSearches));
  }, [recentSearches, hydrated]);

  const matchingBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return books;
    return books.filter(book =>
      [book.title, book.author, book.category, book.isbn, ...book.keywords].some(value => value.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const catalogBooks = useMemo(() => {
    return matchingBooks.filter(book => activeCategory === "All" || book.category === activeCategory);
  }, [activeCategory, matchingBooks]);

  const cartEntries = useMemo(
    () => Object.entries(cart).flatMap(([id, quantity]) => {
      const book = books.find(item => item.id === id);
      return book ? [{ book, quantity }] : [];
    }),
    [cart],
  );

  const wishlistBooks = useMemo(() => books.filter(book => wishlist.includes(book.id)), [wishlist]);
  const bagCount = cartEntries.reduce((total, entry) => total + entry.quantity, 0);
  const bagTotal = cartEntries.reduce((total, entry) => total + entry.book.price * entry.quantity, 0);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showCategory = (category: string) => {
    setLocation(`/category/${categoryToSlug(category)}`);
  };

  const addToBag = (book: Book) => {
    setCart(current => ({ ...current, [book.id]: (current[book.id] || 0) + 1 }));
    toast.success(`${book.title} is now in your bag.`, { description: "A good choice deserves a place on the shelf." });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(current => {
      const quantity = (current[id] || 0) + change;
      if (quantity <= 0) {
        const { [id]: _, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: quantity };
    });
  };

  const removeFromBag = (book: Book) => {
    setCart(current => {
      const { [book.id]: _, ...rest } = current;
      return rest;
    });
    toast.message(`${book.title} was removed from your bag.`);
  };

  const toggleWish = (book: Book) => {
    const saved = wishlist.includes(book.id);
    setWishlist(current => (saved ? current.filter(id => id !== book.id) : [...current, book.id]));
    toast.success(saved ? `${book.title} was removed from your wishlist.` : `${book.title} was saved to your wishlist.`);
  };

  const rememberSearch = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    setRecentSearches(current => [cleaned, ...current.filter(search => search.toLowerCase() !== cleaned.toLowerCase())].slice(0, 4));
  };

  const closeSearch = () => {
    rememberSearch(searchQuery);
    setSearchOpen(false);
  };

  const selectSearch = (value: string) => {
    setSearchQuery(value);
    rememberSearch(value);
    setSearchOpen(true);
  };

  const navItems = [
    ["Shop", "catalogue"],
    ["Categories", "categories"],
    ["Bestsellers", "bestsellers"],
    ["New arrivals", "arrivals"],
    ["Journal", "journal"],
  ] as const;

  return (
    <div className="site-shell">
      <div className="announcement">Complimentary shipping on orders over ₹999 <span>—</span> Turn the page.</div>

      <header className="site-header">
        <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
        <button className="brand" onClick={() => scrollTo("top")} aria-label="Go to the beginning of the page">
          <span className="brand__mark"><BookOpen size={17} /></span>
          <span>INK <i>&</i> IVORY</span>
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map(([label, id]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          <button className="header-action header-action--search" onClick={() => setSearchOpen(true)} aria-label="Search books"><Search size={18} /><span>Search</span></button>
          <button className="header-action" onClick={() => setWishlistOpen(true)} aria-label={`Wishlist with ${wishlist.length} books`}><Heart size={18} /><span className="action-count">{wishlist.length}</span></button>
          <button className="header-action" onClick={() => setBagOpen(true)} aria-label={`Shopping bag with ${bagCount} items`}><ShoppingBag size={18} /><span className="action-count">{bagCount}</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <span className="hero__particle hero__particle--book" aria-hidden="true"><BookOpen size={23} /></span>
          <span className="hero__particle hero__particle--star" aria-hidden="true">✦</span>
          <div className="hero__lead">
            <p className="eyebrow"><span className="eyebrow__dot" /> Independent booksellers, Mumbai</p>
            <h1>Stories<br /><em>worth</em> keeping.</h1>
            <p className="hero__copy">A considered collection for curious minds, quiet evenings, and the pages that become part of you.</p>
            <div className="hero__actions">
              <button className="button button--dark" onClick={() => scrollTo("catalogue")}>Explore the collection <ArrowRight size={17} /></button>
              <button className="text-link text-link--large" onClick={() => scrollTo("bestsellers")}>Browse bestsellers <ChevronRight size={16} /></button>
            </div>
            <div className="hero__edition"><span>01</span><p>THE READER'S EDITION<br />AUTUMN / WINTER 2026</p></div>
          </div>
          <div className="hero__image-wrap">
            <img src="/manus-storage/ink-ivory-hero_707437ca.jpg" alt="Books, coffee, glasses and paper arranged in an editorial still life" className="hero__image" />
            <span className="hero__stamp">CURATED<br /><i>with care</i></span>
            <div className="hero__vertical-note">FOR THE LOVE OF A WELL-MADE BOOK</div>
          </div>
        </section>

        <section className="marquee" aria-label="Bookstore qualities">
          <span>Literary discoveries</span><i>✦</i><span>Fine editions</span><i>✦</i><span>Books for curious minds</span><i>✦</i><span>Stories worth keeping</span><i>✦</i>
        </section>

        <section id="categories" className="section category-section">
          <SectionHeading eyebrow="Find your next obsession" title="A shelf for every mood." />
          <div className="category-grid">
            {categoryNotes.map(([category, note], index) => (
              <button className={`category-card category-card--${index + 1}`} onClick={() => showCategory(category)} key={category}>
                <span className="category-card__number">0{index + 1}</span>
                <div><h3>{category}</h3><p>{note}</p></div>
                <ArrowUpRight size={20} />
              </button>
            ))}
          </div>
        </section>

        <section className="feature-split section">
          <div className="feature-split__image"><img src="/manus-storage/ink-ivory-discovery_870c035a.jpg" alt="Curated stack of finely made books and pressed leaves" /></div>
          <div className="feature-split__copy">
            <p className="eyebrow">A more considered shelf</p>
            <h2>Books you will<br /><em>make room for.</em></h2>
            <p>We believe a good book is not simply finished. It is carried—into conversations, onto bedside tables, and through the years.</p>
            <button className="text-link text-link--large" onClick={() => showCategory("Fiction")}>Meet the collection <ArrowRight size={16} /></button>
          </div>
          <span className="feature-split__scribble">read<br />slowly</span>
        </section>

        <section id="catalogue" className="section catalogue-section">
          <SectionHeading eyebrow={searchQuery ? `Search results for “${searchQuery}”` : "The edit"} title={searchQuery ? `${catalogBooks.length} books found` : "Featured titles."} linkLabel={activeCategory !== "All" || searchQuery ? "Clear filters" : "View all books"} onLink={() => { setSearchQuery(""); setActiveCategory("All"); }} />
          <div className="catalogue-toolbar">
            <div className="category-pills" aria-label="Filter books by category">
              {["All", ...categoryNotes.map(([name]) => name)].map(category => <button key={category} onClick={() => category === "All" ? (setActiveCategory("All"), setSearchQuery("")) : showCategory(category)} className={activeCategory === category ? "is-selected" : ""}>{category}</button>)}
            </div>
            <button className="search-launcher" onClick={() => setSearchOpen(true)}><Search size={16} /> Search the shelves</button>
          </div>
          {catalogBooks.length > 0 ? (
            <div className="product-grid">
              {catalogBooks.slice(0, searchQuery || activeCategory !== "All" ? 18 : 8).map(book => <ProductCard key={book.id} book={book} isWishlisted={wishlist.includes(book.id)} onToggleWish={toggleWish} onAdd={addToBag} onQuickView={setQuickView} onDetails={book => setLocation(getBookDetailPath(book))} />)}
            </div>
          ) : (
            <div className="empty-search"><Sparkles size={25} /><h3>Nothing found quite yet.</h3><p>Try an author, a title, or a different category.</p><button className="text-link" onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}>Return to the full collection <ArrowRight size={15} /></button></div>
          )}
        </section>

        <section id="bestsellers" className="bestseller-section">
          <div className="section bestseller-section__inner">
            <SectionHeading eyebrow="The readers' edit" title="Bestsellers, beautifully bound." />
            <div className="bestseller-list">
              {books.filter(book => book.bestseller).slice(0, 5).map((book, index) => (
                <button key={book.id} className="bestseller-row" onClick={() => setLocation(getBookDetailPath(book))}>
                  <span className="bestseller-row__number">0{index + 1}</span>
                  <BookCover book={book} compact />
                  <div className="bestseller-row__title"><p>{book.category}</p><h3>{book.title}</h3><span>{book.author}</span></div>
                  <span className="bestseller-row__price">{formatPrice(book.price)}</span>
                  <ArrowUpRight className="bestseller-row__arrow" size={19} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="arrivals" className="section arrivals-section">
          <SectionHeading eyebrow="Fresh off the press" title="New arrivals." linkLabel="See all new books" onLink={() => { setActiveCategory("All"); setSearchQuery(""); scrollTo("catalogue"); }} />
          <div className="arrival-grid">
            {books.filter(book => book.arrival).slice(0, 6).map(book => <ProductCard key={book.id} book={book} isWishlisted={wishlist.includes(book.id)} onToggleWish={toggleWish} onAdd={addToBag} onQuickView={setQuickView} onDetails={book => setLocation(getBookDetailPath(book))} />)}
          </div>
        </section>

        <section className="reading-paths section">
          <p className="eyebrow">A little direction</p>
          <div className="reading-paths__layout"><h2>Not sure what<br />to <em>read?</em></h2><p>Start with a feeling. We will point you toward a book with something to say.</p></div>
          <div className="reading-paths__buttons">
            {readingPaths.map(path => <button key={path.label} onClick={() => showCategory(path.category)}>{path.label}<ArrowRight size={17} /></button>)}
          </div>
        </section>

        <section id="journal" className="journal-section">
          <div className="section">
            <SectionHeading eyebrow="From the bookshelf" title="Notes for the reading life." linkLabel="Visit the journal" onLink={() => toast.message("The journal is arriving soon.")} />
            <div className="journal-grid">
              <article className="journal-feature">
                <img src="/manus-storage/ink-ivory-journal_4f2aa92e.jpg" alt="Open book, letter, flower and reading glasses in a dark editorial still life" />
                <div className="journal-feature__overlay"><p className="eyebrow">The reading life</p><h3>{journalEntries[0].title}</h3><button className="text-link text-link--light" onClick={() => toast.message("The journal is arriving soon.")}>Read the story <ArrowRight size={16} /></button></div>
              </article>
              <div className="journal-list">
                {journalEntries.slice(1).map((entry, index) => <article key={entry.title} className="journal-list__item"><span>0{index + 2}</span><div><p className="eyebrow">{entry.eyebrow}</p><h3>{entry.title}</h3><p>{entry.description}</p></div><button className="circle-link" onClick={() => toast.message("The journal is arriving soon.")} aria-label={`Read ${entry.title}`}><ArrowUpRight size={18} /></button></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="newsletter-section">
          <img src="/manus-storage/ink-ivory-newsletter_8bb98c65.jpg" alt="Letter, ribbon and open book styled on textured ivory paper" />
          <div className="newsletter-section__panel">
            <p className="eyebrow">A note, occasionally</p>
            <h2>Letters for<br /><em>readers.</em></h2>
            <p>New books, thoughtful recommendations, and stories worth discovering—delivered with care.</p>
            <form onSubmit={event => { event.preventDefault(); toast.success("You are on the list.", { description: "We will write only when there is something worth sharing." }); event.currentTarget.reset(); }}>
              <label className="sr-only" htmlFor="newsletter-email">Your email</label>
              <input id="newsletter-email" type="email" required placeholder="YOUR EMAIL" />
              <button className="button button--dark" type="submit">Join the club <ArrowRight size={17} /></button>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__top">
          <div className="footer-brand"><button className="brand brand--footer" onClick={() => scrollTo("top")}><span className="brand__mark"><BookOpen size={17} /></span><span>INK <i>&</i> IVORY</span></button><p>Stories worth keeping.</p></div>
          <div className="footer-links"><div><p>Shop</p><button onClick={() => scrollTo("catalogue")}>All books</button><button onClick={() => scrollTo("bestsellers")}>Bestsellers</button><button onClick={() => scrollTo("arrivals")}>New arrivals</button></div><div><p>Company</p><button onClick={() => toast.message("About INK & IVORY is coming soon.")}>About</button><button onClick={() => toast.message("Author pages are coming soon.")}>Authors</button><button onClick={() => scrollTo("journal")}>Journal</button></div><div><p>Help</p><button onClick={() => toast.message("Contact support: hello@inkandivory.example")}>Contact</button><button onClick={() => toast.message("Complimentary standard shipping on orders above ₹999.")}>Shipping</button><button onClick={() => toast.message("Returns are accepted within 14 days of delivery.")}>Returns</button></div></div>
        </div>
        <div className="site-footer__bottom"><p>© 2026 Ink & Ivory. Made for the reading life.</p><div className="social-links"><button aria-label="Instagram"><Instagram size={17} /></button><button aria-label="Facebook"><Facebook size={17} /></button><button aria-label="Pinterest"><span className="social-letter">P</span></button></div><p>UPI &nbsp; • &nbsp; VISA &nbsp; • &nbsp; MASTERCARD</p></div>
      </footer>

      {menuOpen && <div className="modal-backdrop modal-backdrop--menu" onMouseDown={() => setMenuOpen(false)}><aside className="mobile-menu" onMouseDown={event => event.stopPropagation()}><div className="drawer__head"><button className="brand" onClick={() => scrollTo("top")}><span>INK <i>&</i> IVORY</span></button><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div><nav>{navItems.map(([label, id], index) => <button onClick={() => scrollTo(id)} key={id}><span>0{index + 1}</span>{label}<ArrowUpRight size={18} /></button>)}</nav><div className="mobile-menu__footer"><button onClick={() => { setMenuOpen(false); setSearchOpen(true); }}><Search size={17} /> Search the shelves</button><button onClick={() => { setMenuOpen(false); setWishlistOpen(true); }}><Heart size={17} /> Wishlist ({wishlist.length})</button></div></aside></div>}

      {searchOpen && <div className="modal-backdrop" onMouseDown={closeSearch}><section className="search-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search the collection"><div className="drawer__head"><div><p className="eyebrow">Search the shelves</p><h2>What are you looking for?</h2></div><button className="icon-button" onClick={closeSearch} aria-label="Close search"><X /></button></div><div className="search-input"><Search size={20} /><input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") rememberSearch(searchQuery); }} placeholder="Title, author, category, ISBN…" /><button onClick={() => setSearchQuery("")} aria-label="Clear search"><X size={16} /></button></div>{!searchQuery && <div className="search-suggestions"><div><p className="eyebrow">Popular searches</p><div className="suggestion-pills">{["Fiction", "Psychology", "Self Development", "Mystery"].map(term => <button onClick={() => selectSearch(term)} key={term}>{term}</button>)}</div>{recentSearches.length > 0 && <div className="recent-searches"><p className="eyebrow">Recent searches</p><div className="suggestion-pills">{recentSearches.map(term => <button onClick={() => selectSearch(term)} key={term}>{term}</button>)}</div></div>}</div><div><p className="eyebrow">Start here</p><div className="suggested-books">{books.slice(0, 3).map(book => <button key={book.id} onClick={() => { setQuickView(book); closeSearch(); }}><BookCover book={book} compact /><span>{book.title}<small>{book.author}</small></span><ArrowUpRight size={17} /></button>)}</div></div></div>}{searchQuery && <div className="search-results"><p className="eyebrow">{matchingBooks.length} {matchingBooks.length === 1 ? "book" : "books"} found</p>{matchingBooks.length ? matchingBooks.map(book => <button key={book.id} onClick={() => { setQuickView(book); closeSearch(); }}><BookCover book={book} compact /><span><small>{book.category}</small>{book.title}<em>{book.author}</em></span><ArrowUpRight size={18} /></button>) : <p className="search-results__empty">No book came to mind. Try a title, author, or category.</p>}</div>}</section></div>}

      {quickView && <div className="modal-backdrop" onMouseDown={() => setQuickView(null)}><section className="quick-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${quickView.title} details`}><button className="quick-modal__close icon-button" onClick={() => setQuickView(null)} aria-label="Close book details"><X /></button><div className="quick-modal__cover"><BookCover book={quickView} /></div><div className="quick-modal__content"><p className="eyebrow">{quickView.category} · {quickView.edition}</p><h2>{quickView.title}</h2><p className="quick-modal__author">by {quickView.author}</p><p className="quick-modal__description">{quickView.description}</p><div className="quick-modal__details"><span>{quickView.pages} pages</span><span>{quickView.isbn}</span></div><div className="quick-modal__price">{formatPrice(quickView.price)} {quickView.originalPrice && <del>{formatPrice(quickView.originalPrice)}</del>}</div><div className="quick-modal__actions"><button className="button button--dark" onClick={() => addToBag(quickView)}><ShoppingBag size={17} /> Add to bag</button><button className={`button button--outline ${wishlist.includes(quickView.id) ? "is-saved" : ""}`} onClick={() => toggleWish(quickView)}><Heart size={17} fill={wishlist.includes(quickView.id) ? "currentColor" : "none"} />{wishlist.includes(quickView.id) ? "Saved" : "Save"}</button></div></div></section></div>}

      {bagOpen && <div className="modal-backdrop modal-backdrop--drawer" onMouseDown={() => setBagOpen(false)}><aside className="side-drawer" onMouseDown={event => event.stopPropagation()} aria-label="Shopping bag"><div className="drawer__head"><div><p className="eyebrow">Your selection</p><h2>Shopping bag <span>({bagCount})</span></h2></div><button className="icon-button" onClick={() => setBagOpen(false)} aria-label="Close bag"><X /></button></div>{cartEntries.length ? <><div className="bag-items">{cartEntries.map(({ book, quantity }) => <article className="bag-item" key={book.id}><BookCover book={book} compact /><div><h3>{book.title}</h3><p>{book.author}</p><span>{formatPrice(book.price)}</span><div className="quantity"><button onClick={() => updateQuantity(book.id, -1)} aria-label={`Reduce ${book.title} quantity`}><Minus size={13} /></button><b>{quantity}</b><button onClick={() => updateQuantity(book.id, 1)} aria-label={`Increase ${book.title} quantity`}><Plus size={13} /></button></div></div><button className="remove-button" onClick={() => removeFromBag(book)} aria-label={`Remove ${book.title} from bag`}><Trash2 size={16} /></button></article>)}</div><div className="bag-summary"><p><span>Subtotal</span><strong>{formatPrice(bagTotal)}</strong></p><p><span>Shipping</span><em>Complimentary over ₹999</em></p><div><span>Bag total</span><strong>{formatPrice(bagTotal)}</strong></div><button className="button button--dark button--full" onClick={() => toast.message("Your bag is saved. Checkout will be available when payment is connected.")}>Keep reading <ArrowRight size={17} /></button></div></> : <div className="drawer-empty"><ShoppingBag size={29} /><h3>Your bag is waiting.</h3><p>There is always room for one more good story.</p><button className="button button--dark" onClick={() => { setBagOpen(false); scrollTo("catalogue"); }}>Explore books <ArrowRight size={16} /></button></div>}</aside></div>}

      {wishlistOpen && <div className="modal-backdrop modal-backdrop--drawer" onMouseDown={() => setWishlistOpen(false)}><aside className="side-drawer" onMouseDown={event => event.stopPropagation()} aria-label="Wishlist"><div className="drawer__head"><div><p className="eyebrow">Saved for later</p><h2>Wishlist <span>({wishlist.length})</span></h2></div><button className="icon-button" onClick={() => setWishlistOpen(false)} aria-label="Close wishlist"><X /></button></div>{wishlistBooks.length ? <div className="bag-items wishlist-items">{wishlistBooks.map(book => <article className="bag-item" key={book.id}><BookCover book={book} compact /><div><h3>{book.title}</h3><p>{book.author}</p><span>{formatPrice(book.price)}</span><button className="mini-add" onClick={() => addToBag(book)}>Add to bag <Plus size={13} /></button></div><button className="remove-button" onClick={() => toggleWish(book)} aria-label={`Remove ${book.title} from wishlist`}><Trash2 size={16} /></button></article>)}</div> : <div className="drawer-empty"><Heart size={29} /><h3>Keep a little list.</h3><p>Save books you want to return to when the time is right.</p><button className="button button--dark" onClick={() => { setWishlistOpen(false); scrollTo("catalogue"); }}>Browse the edit <ArrowRight size={16} /></button></div>}</aside></div>}
    </div>
  );
}
