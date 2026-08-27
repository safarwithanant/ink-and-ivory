export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  originalPrice?: number;
  edition: string;
  pages: number;
  isbn: string;
  description: string;
  cover: {
    palette: [string, string, string];
    motif: string;
    variant: "arc" | "frame" | "sun" | "line" | "flower" | "grid";
  };
  badge?: "New" | "Signed" | "Limited";
  featured?: boolean;
  arrival?: boolean;
  bestseller?: boolean;
  keywords: string[];
};

export const books: Book[] = [
  {
    id: "quiet-architect",
    title: "The Quiet Architect",
    author: "Elias Rowan",
    category: "Psychology",
    price: 599,
    edition: "Hardcover · First edition",
    pages: 272,
    isbn: "978-81-963481-0-4",
    description: "A lucid examination of the unseen structures that shape attention, habit, and a life lived on purpose.",
    cover: { palette: ["#2b1a20", "#e8ddc9", "#b9944c"], motif: "A study in inner rooms", variant: "arc" },
    badge: "Signed",
    featured: true,
    bestseller: true,
    keywords: ["mind", "habit", "behaviour", "inner life"],
  },
  {
    id: "art-starting-again",
    title: "The Art of Starting Again",
    author: "Clara Bennett",
    category: "Self Development",
    price: 499,
    originalPrice: 599,
    edition: "Paperback · Illustrated",
    pages: 224,
    isbn: "978-81-963481-1-1",
    description: "Tender, practical pages for meeting a changed season with curiosity, courage, and a kinder map.",
    cover: { palette: ["#692b38", "#f0dcb6", "#251718"], motif: "A new beginning", variant: "sun" },
    badge: "New",
    featured: true,
    arrival: true,
    keywords: ["change", "growth", "motivation", "wellbeing"],
  },
  {
    id: "after-last-train",
    title: "After the Last Train",
    author: "Noah Ellis",
    category: "Fiction",
    price: 449,
    edition: "Paperback · Literary fiction",
    pages: 336,
    isbn: "978-81-963481-2-8",
    description: "On a rain-soaked platform, two strangers discover the strange mercy of a missed departure.",
    cover: { palette: ["#182532", "#e7d9bd", "#9d3e3e"], motif: "A night journey", variant: "line" },
    featured: true,
    arrival: true,
    keywords: ["novel", "literary", "travel", "contemporary"],
  },
  {
    id: "thinking-systems",
    title: "Thinking in Systems",
    author: "Adrian Cole",
    category: "Business",
    price: 699,
    edition: "Hardcover · Revised edition",
    pages: 304,
    isbn: "978-81-963481-3-5",
    description: "A sharply drawn guide to seeing organisations as living systems—and making better decisions inside them.",
    cover: { palette: ["#152724", "#d9c69d", "#cc6d4d"], motif: "Patterns that move", variant: "grid" },
    bestseller: true,
    featured: true,
    keywords: ["leadership", "strategy", "work", "decision making"],
  },
  {
    id: "weight-of-words",
    title: "The Weight of Words",
    author: "Mira Lawson",
    category: "Poetry",
    price: 399,
    edition: "Paperback · Poetry collection",
    pages: 128,
    isbn: "978-81-963481-4-2",
    description: "Poems of quiet weather, complicated love, and the sentences we keep folded in our pockets.",
    cover: { palette: ["#3a2035", "#e5bdba", "#ebdfc8"], motif: "Small weather", variant: "flower" },
    arrival: true,
    keywords: ["poems", "love", "nature", "literature"],
  },
  {
    id: "room-sunlight",
    title: "A Room Full of Sunlight",
    author: "Eleanor Hayes",
    category: "Fiction",
    price: 549,
    edition: "Hardcover · Book club edition",
    pages: 368,
    isbn: "978-81-963481-5-9",
    description: "A house, a summer, and the small acts of bravery that turn a family toward the light.",
    cover: { palette: ["#be623d", "#f3d69b", "#3b2420"], motif: "Late afternoon", variant: "sun" },
    featured: true,
    bestseller: true,
    keywords: ["family", "summer", "novel", "home"],
  },
  {
    id: "human-pattern",
    title: "The Human Pattern",
    author: "Daniel Mercer",
    category: "Psychology",
    price: 649,
    edition: "Hardcover · Illustrated",
    pages: 320,
    isbn: "978-81-963481-6-6",
    description: "An absorbing field guide to the rituals, biases, and social scripts that make us recognisably human.",
    cover: { palette: ["#20343b", "#d8ded2", "#b35940"], motif: "How we become", variant: "arc" },
    bestseller: true,
    keywords: ["behaviour", "society", "mind", "science"],
  },
  {
    id: "small-habits",
    title: "Small Habits, Big Days",
    author: "Oliver Reed",
    category: "Self Development",
    price: 499,
    edition: "Paperback · Guided edition",
    pages: 208,
    isbn: "978-81-963481-7-3",
    description: "A beautifully spare handbook for building the kinds of days that quietly change a year.",
    cover: { palette: ["#74513b", "#e7dfb9", "#26322a"], motif: "Begin in small ways", variant: "line" },
    arrival: true,
    keywords: ["habits", "routine", "goals", "productivity"],
  },
  {
    id: "last-letter",
    title: "The Last Letter",
    author: "Sophie Laurent",
    category: "Romance",
    price: 449,
    edition: "Paperback · Romantic fiction",
    pages: 352,
    isbn: "978-81-963481-8-0",
    description: "When an old letter surfaces in a borrowed flat, a reluctant curator follows its unfinished love story across Paris.",
    cover: { palette: ["#732f3b", "#f0ceb8", "#703d3a"], motif: "Some stories wait", variant: "flower" },
    featured: true,
    keywords: ["love story", "paris", "letters", "romance"],
  },
  {
    id: "beyond-obvious",
    title: "Beyond the Obvious",
    author: "Marcus Vale",
    category: "Philosophy",
    price: 599,
    edition: "Hardcover · Modern classics",
    pages: 248,
    isbn: "978-81-963481-9-7",
    description: "An invitation to doubt familiar answers and find a more generous way of looking at ordinary life.",
    cover: { palette: ["#25242b", "#dbd1b9", "#996f43"], motif: "Look twice", variant: "frame" },
    bestseller: true,
    keywords: ["ideas", "ethics", "thinking", "meaning"],
  },
  {
    id: "founders-notebook",
    title: "The Founders' Notebook",
    author: "James Carter",
    category: "Business",
    price: 749,
    edition: "Hardcover · Casebound",
    pages: 288,
    isbn: "978-81-963482-0-0",
    description: "Notes on making, failing, listening, and building the kind of company people want to belong to.",
    cover: { palette: ["#10212a", "#c9aa6a", "#efe3cc"], motif: "Build what matters", variant: "grid" },
    badge: "Limited",
    bestseller: true,
    keywords: ["startup", "founders", "leadership", "work"],
  },
  {
    id: "where-light-ends",
    title: "Where the Light Ends",
    author: "Amelia Rose",
    category: "Mystery & Thriller",
    price: 529,
    edition: "Paperback · Suspense",
    pages: 384,
    isbn: "978-81-963482-1-7",
    description: "A coastal town refuses to speak of one vanished girl; a new detective refuses to leave it alone.",
    cover: { palette: ["#151821", "#d9d3bf", "#94433a"], motif: "Nothing stays hidden", variant: "line" },
    featured: true,
    arrival: true,
    keywords: ["suspense", "crime", "coastal", "detective"],
  },
  {
    id: "long-way-home",
    title: "The Long Way Home",
    author: "Theo Martin",
    category: "Biography",
    price: 579,
    edition: "Hardcover · Biography",
    pages: 352,
    isbn: "978-81-963482-2-4",
    description: "A moving record of one artist's pilgrimage through grief, landscape, and the work of beginning over.",
    cover: { palette: ["#5d3424", "#e0c19b", "#2c2c24"], motif: "A life in landscapes", variant: "arc" },
    keywords: ["memoir", "artist", "journey", "life story"],
  },
  {
    id: "ordinary-life",
    title: "Notes from an Ordinary Life",
    author: "Hannah Brooks",
    category: "Lifestyle",
    price: 499,
    edition: "Paperback · Illustrated essays",
    pages: 192,
    isbn: "978-81-963482-3-1",
    description: "A graceful companion to the rituals of home, friendship, food, and making a little more room for wonder.",
    cover: { palette: ["#69807a", "#e8d6b5", "#a84e3a"], motif: "Make the ordinary luminous", variant: "flower" },
    arrival: true,
    keywords: ["home", "food", "slow living", "essays"],
  },
  {
    id: "language-mind",
    title: "The Language of Mind",
    author: "Nathan Wright",
    category: "Science",
    price: 699,
    edition: "Hardcover · Illustrated science",
    pages: 336,
    isbn: "978-81-963482-4-8",
    description: "A precise, poetic exploration of how the brain makes language—and language returns the favour.",
    cover: { palette: ["#213046", "#ded3b4", "#d8694e"], motif: "Thought, spoken", variant: "grid" },
    bestseller: true,
    keywords: ["brain", "language", "cognition", "neuroscience"],
  },
  {
    id: "thousand-moments",
    title: "A Thousand Small Moments",
    author: "Lily Harper",
    category: "Romance",
    price: 449,
    edition: "Paperback · Love story",
    pages: 320,
    isbn: "978-81-963482-5-5",
    description: "A florist and an archivist keep crossing paths through a year of tiny, exquisite coincidences.",
    cover: { palette: ["#7d3d4a", "#f0e0c7", "#ae8557"], motif: "In the small things", variant: "flower" },
    arrival: true,
    keywords: ["love", "florist", "contemporary romance", "relationship"],
  },
  {
    id: "courage-different",
    title: "The Courage to Be Different",
    author: "Ethan Blake",
    category: "Self Development",
    price: 549,
    edition: "Hardcover · Practical wisdom",
    pages: 240,
    isbn: "978-81-963482-6-2",
    description: "A clear-eyed case for trading approval for alignment—and making a life unmistakably your own.",
    cover: { palette: ["#4c2739", "#d8cda4", "#1b1b1a"], motif: "Choose your shape", variant: "frame" },
    featured: true,
    keywords: ["confidence", "identity", "purpose", "mindset"],
  },
  {
    id: "midnight-march",
    title: "Midnight in March",
    author: "Isabella Grey",
    category: "Mystery & Thriller",
    price: 599,
    edition: "Hardcover · Suspense",
    pages: 368,
    isbn: "978-81-963482-7-9",
    description: "At midnight each March, a bell rings in the abandoned observatory. This year, someone answers.",
    cover: { palette: ["#161d2d", "#d9c8a3", "#a94245"], motif: "The bell remembers", variant: "sun" },
    badge: "New",
    featured: true,
    bestseller: true,
    keywords: ["mystery", "dark academia", "observatory", "thriller"],
  },
];

export const categoryNotes = [
  ["Fiction", "Stories that stay open in the mind."],
  ["Psychology", "A closer study of being human."],
  ["Self Development", "Small shifts. Larger days."],
  ["Business", "Ideas for work worth doing."],
  ["Romance", "For the heart's long attention."],
  ["Mystery & Thriller", "Turn the page, then lock the door."],
  ["Philosophy", "Thoughts with good bones."],
  ["Poetry", "Language to carry home."],
] as const;

export const readingPaths = [
  { label: "I want to learn", category: "Science" },
  { label: "I want to escape", category: "Fiction" },
  { label: "I want to think", category: "Philosophy" },
  { label: "I want to fall in love", category: "Romance" },
  { label: "I want to build", category: "Business" },
  { label: "I want to be inspired", category: "Self Development" },
] as const;

export const journalEntries = [
  {
    eyebrow: "The reading life",
    title: "What to read when you feel stuck",
    description: "Five companions for the days when the next right page feels impossibly far away.",
  },
  {
    eyebrow: "On thinking",
    title: "7 books that will change how you think",
    description: "A considered shelf of writers who make the familiar feel productively strange.",
  },
  {
    eyebrow: "A new season",
    title: "The books we're taking into 2026",
    description: "Some are new, some are old, and all deserve a place by the bedside.",
  },
] as const;

export const categoryMeta: Record<string, { description: string; note: string }> = {
  Fiction: { description: "Fiction for disappearing into, then carrying back with you.", note: "Stories worth stepping inside." },
  Psychology: { description: "Clearer ways of seeing ourselves and the people around us.", note: "A study of being human." },
  "Self Development": { description: "Quiet tools for becoming more of who you are.", note: "Small shifts. Larger days." },
  Business: { description: "Thoughtful ideas for building work that matters.", note: "For the work of making." },
  Poetry: { description: "Language with enough room to breathe.", note: "A line for your pocket." },
  Romance: { description: "Love stories with warmth, wit, and long attention.", note: "For the heart's long attention." },
  Philosophy: { description: "Books that make the familiar feel newly interesting.", note: "Thoughts with good bones." },
  "Mystery & Thriller": { description: "Atmosphere, tension, and the pleasure of one more page.", note: "Follow the clue." },
  Biography: { description: "Lives examined with honesty, curiosity, and grace.", note: "A life in full." },
  Lifestyle: { description: "Gentle companions for a more considered everyday.", note: "Make the ordinary luminous." },
  Science: { description: "Big questions made lucid, lyrical, and alive.", note: "Curiosity has its own shelf." },
};

export function categoryToSlug(category: string) {
  return category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getCategoryFromSlug(slug: string) {
  return Object.keys(categoryMeta).find(category => categoryToSlug(category) === slug);
}

export function filterCategoryBooks(category: string, query: string) {
  const term = query.trim().toLowerCase();
  return books.filter(book => {
    if (book.category !== category) return false;
    if (!term) return true;
    return [book.title, book.author, ...book.keywords].some(value => value.toLowerCase().includes(term));
  });
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}
