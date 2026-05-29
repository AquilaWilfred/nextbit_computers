"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/auth/useAuth";
import { getLoginUrl } from "@/lib/const";
import { useFetch, useMutation, useProxyFetch } from "@/lib/api-hooks";
import { apiClient, proxyClient } from "@/lib/api-client";
import { getGuestCart, clearGuestCart, formatPrice, GuestCartItem } from "@/lib/cart";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Heart,
  User,
  UserPlus,
  X,
  LayoutDashboard,
  Headphones,
  Loader2,
  Sparkles,
  RotateCcw,
  Mic,
  Volume2,
  VolumeX,
  Wrench,
  Recycle,
  Shield,
  CreditCard,
  Crown,
  Activity,
  List,
} from "lucide-react";
import { dynamicIconMap } from "@/lib/iconMap";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string | null;
  order?: number;
  active?: boolean;
}

interface CartItem {
  productId: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
}

interface PublicSettings {
  general?: { storeName?: string };
  appearance?: {
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoTextSide?: string;
    logoTextDisplay?: string;
    logoTextSpacing?: number;
    logoOpacity?: number;
    logoCropMode?: string;
    logoCropAmount?: number;
    logoTextItems?: Array<{
      text: string;
      font?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
      position?: string;
    }>;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: any[];
  suggestions?: string[];
}

interface AiHistoryEntry {
  role: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categoryIcons: Record<string, React.ReactNode> = {
  laptops:     <Monitor   className="w-4 h-4" />,
  desktops:    <Cpu       className="w-4 h-4" />,
  accessories: <Headphones className="w-4 h-4" />,
};

const getCategoryIcon = (cat: Category) => {
  if (cat.icon && dynamicIconMap[cat.icon]) {
    const CustomIcon = dynamicIconMap[cat.icon];
    return <CustomIcon className="w-4 h-4" />;
  }
  return categoryIcons[cat.slug] ?? <Package className="w-4 h-4" />;
};

const customerSuggestedPrompts = [
  "Find a gaming laptop",
  "What is your return policy?",
  "Recommend a budget PC",
];

// ---------------------------------------------------------------------------
// TypewriterText — unchanged, no data deps
// ---------------------------------------------------------------------------

function TypewriterText({
  text,
  onComplete,
  renderContent,
}: {
  text: string;
  onComplete: () => void;
  renderContent: (content: string) => React.ReactNode;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        onComplete();
      }
    }, 15);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <>
      {renderContent(displayed)}
      <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[var(--brand)] animate-pulse" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

export default function Navbar() {
  const { theme, cycleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const location = usePathname();
  const router   = useRouter();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scrolled,        setScrolled]        = useState(false);
  const [isPageScrolling, setIsPageScrolling] = useState(false);
  const [mounted,         setMounted]         = useState(false);

  // ── AI Chat State ─────────────────────────────────────────────────────────
  const [aiChatOpen, setAiChatOpen] = useState(false); // initialised safely in useEffect
  const [chatInput,  setChatInput]  = useState("");
  const [chatMessages,       setChatMessages]       = useState<ChatMessage[]>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [isMuted,    setIsMuted]    = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [isDragging,   setIsDragging]   = useState(false);

  const searchRef    = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dragStartRef  = useRef({ x: 0, y: 0 });
  const recognitionRef = useRef<any>(null);

  // ── SSR-safe session/localStorage initialisation ──────────────────────────
  useEffect(() => {
    setMounted(true);

    // Restore AI open state
    try {
      setAiChatOpen(sessionStorage.getItem("store_ai_open") === "true");
    } catch {}

    // Restore chat position
    try {
      const saved = sessionStorage.getItem("store_ai_position");
      if (saved) setChatPosition(JSON.parse(saved));
    } catch {}

    // Restore messages or set greeting
    try {
      const saved = sessionStorage.getItem("store_ai_messages");
      if (saved) { setChatMessages(JSON.parse(saved)); return; }
    } catch {}

    const displayName    = user?.name ? `, ${user.name}` : " there";
    let contextGreeting  = "What are you looking for today?";
    if (location.includes("/api/cart"))             contextGreeting = "Need help reviewing your cart before checkout?";
    else if (location.includes("/products"))    contextGreeting = "Looking for something specific in our catalog?";
    else if (location.includes("/dashboard/orders")) contextGreeting = "Need help tracking your recent orders?";
    setChatMessages([{ role: "assistant", content: `Hi${displayName}! I'm your shopping assistant. ${contextGreeting}` }]);
  }, []); // run once on mount — intentionally empty deps

  // Voice recognition setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous    = false;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setChatInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  // ── REST Data Fetching ────────────────────────────────────────────────────

  const { data: categoriesData } = useFetch<Category[]>('/api/categories');
  const { data: cartData }       = useProxyFetch<CartItem[]>('/api/cart', { enabled: isAuthenticated });
  const { data: settingsData }   = useFetch<PublicSettings>('/api/settings/public');
  const { data: searchData, isLoading: searching } = useFetch<Product[]>(
    `/products?search=${encodeURIComponent(debouncedSearch)}&limit=5`,
    debouncedSearch.trim().length > 1
  );

  // AI history — only fetched when chat is open and user is authenticated
  const { data: dbHistory } = useProxyFetch<AiHistoryEntry[]>('/ai/history', {
    enabled: isAuthenticated && aiChatOpen,
  });

  // ── REST Mutations ────────────────────────────────────────────────────────

  const aiChatMutation    = useMutation((data: any) => proxyClient.post("/ai/chat", data));
  const clearHistoryMutation = useMutation(() => proxyClient.post("/ai/clear-history", {}));

  // ── Derived Data ──────────────────────────────────────────────────────────

  const categories       = categoriesData ?? [];
  const activeCategories = categories.filter((c) => c.active !== false);
  const orderedCategories = [...activeCategories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const rootCategories   = orderedCategories.filter((c) => !c.parentId);

  // Settings — safe SSR: no direct localStorage access at render time
  const settings        = settingsData;
  const storeName       = settings?.general?.storeName ?? "Store";
  const logoUrl         = settings?.appearance?.logoUrl;
  const logoWidth       = settings?.appearance?.logoWidth;
  const logoHeight      = settings?.appearance?.logoHeight;
  const logoTextSide    = settings?.appearance?.logoTextSide    ?? "none";
  const logoTextDisplay = settings?.appearance?.logoTextDisplay ?? "inline";
  const logoTextSpacing = settings?.appearance?.logoTextSpacing ?? 16;
  const logoOpacity     = settings?.appearance?.logoOpacity     ?? 1;
  const logoCropMode    = settings?.appearance?.logoCropMode    ?? "none";
  const logoCropAmount  = settings?.appearance?.logoCropAmount  ?? 0;
  const logoTextItems   = Array.isArray(settings?.appearance?.logoTextItems)
    ? (settings!.appearance!.logoTextItems!).filter(
        (item) => typeof item?.text === "string" && item.text.trim() !== ""
      )
    : [];

  // Cart count
  const [guestCartCount, setGuestCartCount] = useState(0);
  useEffect(() => {
    const update = () => setGuestCartCount(getGuestCart().length);
    update();
    window.addEventListener("storage", update);
    window.addEventListener("guestCartUpdated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("guestCartUpdated", update);
    };
  }, []);
  const cartCount = isAuthenticated ? (cartData?.length ?? 0) : guestCartCount;

  // ── Side-effects ──────────────────────────────────────────────────────────

  // Load DB chat history into state once (only if state is still at the greeting)
  useEffect(() => {
    if (dbHistory && dbHistory.length > 0 && chatMessages.length <= 1) {
      setChatMessages(
        dbHistory.map((h) => ({ role: h.role as "user" | "assistant", content: h.message })).reverse()
      );
    }
  }, [dbHistory]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Scroll listener
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Scroll transparency while AI chat is open
  useEffect(() => {
    if (!aiChatOpen) return;
    let t: NodeJS.Timeout;
    const handler = () => {
      setIsPageScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setIsPageScrolling(false), 300);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [aiChatOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, aiChatOpen]);

  // Keep scrolling during stream
  useEffect(() => {
    if (streamingMessageIndex === null) return;
    const id = setInterval(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
    return () => clearInterval(id);
  }, [streamingMessageIndex]);

  // Persist AI state
  useEffect(() => {
    try { sessionStorage.setItem("store_ai_open", String(aiChatOpen)); } catch {}
  }, [aiChatOpen]);

  useEffect(() => {
    try { sessionStorage.setItem("store_ai_messages", JSON.stringify(chatMessages)); } catch {}
  }, [chatMessages]);

  useEffect(() => {
    try { sessionStorage.setItem("store_ai_position", JSON.stringify(chatPosition)); } catch {}
  }, [chatPosition]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [mobileOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const speakResponse = useCallback((text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/[*_#`]/g, "");
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
  }, [isMuted]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("Listening...");
    } else {
      toast.error("Voice input is not supported in your browser.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const buildCartContext = useCallback(() => {
    return isAuthenticated
      ? (cartData ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity }))
      : getGuestCart().map((i: GuestCartItem) => ({ productId: String(i.productId), quantity: i.quantity }));
  }, [isAuthenticated, cartData]);

  const sendToAi = useCallback(
    (messages: ChatMessage[], userMessage: string) => {
      const cartContext = buildCartContext();
      aiChatMutation
        .mutate({
          message: userMessage,
          history: messages.slice(1),
          cartContext: cartContext.length > 0 ? cartContext : undefined,
          userId:    user?.id,
          userEmail: user?.email,
        })
        .then((data: any) => {
          setChatMessages((prev) => {
            const next = [...prev, { role: "assistant" as const, content: data.reply, products: data.products }];
            setStreamingMessageIndex(next.length - 1);
            return next;
          });
          speakResponse(data.reply);
        })
        .catch((err: Error) => {
          const isQuota = err.message.includes("quota") || err.message.includes("429");
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: isQuota
                ? "The AI is currently unavailable due to high traffic. Please try again later."
                : "Sorry, I ran into a network error. Please try again.",
            },
          ]);
        });
    },
    [buildCartContext, aiChatMutation, user, speakResponse]
  );

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || aiChatMutation.isPending) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setDynamicSuggestions([]);
    const updated: ChatMessage[] = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(updated);
    sendToAi(updated, userMsg);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (aiChatMutation.isPending) return;
    setDynamicSuggestions([]);
    const updated: ChatMessage[] = [...chatMessages, { role: "user", content: prompt }];
    setChatMessages(updated);
    sendToAi(updated, prompt);
  };

  const handleNewChat = () => {
    const displayName = user?.name ? `, ${user.name}` : " there";
    setChatMessages([{ role: "assistant", content: `Hi${displayName}! I'm your shopping assistant. What are you looking for today?` }]);
    setChatInput("");
    try { sessionStorage.removeItem("store_ai_messages"); } catch {}
    if (isAuthenticated) clearHistoryMutation.mutate({}).catch(() => {});
    toast.success("New chat started!");
  };

  // ── Drag Handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - chatPosition.x, y: e.clientY - chatPosition.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setChatPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };
  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ── Logo Helpers ──────────────────────────────────────────────────────────

  const getLogoCropWrapperStyle = (): React.CSSProperties => {
    const amount = Math.min(Math.max(logoCropAmount, 0), 50);
    const style: React.CSSProperties = {
      width: logoWidth ? `${logoWidth}px` : undefined,
      height: logoHeight ? `${logoHeight}px` : undefined,
      maxWidth: "100%", maxHeight: "100%", minWidth: 0,
      overflow: "hidden", display: "inline-flex",
      alignItems: "center", justifyContent: "center",
    };
    if      (logoCropMode === "crop-left")   style.clipPath = `inset(0 0 0 ${amount}%)`;
    else if (logoCropMode === "crop-right")  style.clipPath = `inset(0 ${amount}% 0 0)`;
    else if (logoCropMode === "crop-top")    style.clipPath = `inset(${amount}% 0 0 0)`;
    else if (logoCropMode === "crop-bottom") style.clipPath = `inset(0 0 ${amount}% 0)`;
    return style;
  };

  const getLogoCropImageStyle = (): React.CSSProperties => ({
    width: "100%", height: "100%",
    opacity: logoOpacity,
    objectFit: logoCropMode === "none" ? "contain" : "cover",
    objectPosition:
      logoCropMode === "crop-left"   ? "left center"   :
      logoCropMode === "crop-right"  ? "right center"  :
      logoCropMode === "crop-top"    ? "center top"    :
      logoCropMode === "crop-bottom" ? "center bottom" : "center",
  });

  const renderLogoImage = () => (
    <div style={getLogoCropWrapperStyle()} className="overflow-hidden rounded-sm max-w-full min-w-0">
      <img
        src={logoUrl}
        alt={storeName}
        className="h-full w-full"
        style={getLogoCropImageStyle()}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );

  const getLogoTextItemsForSide = (side: "left" | "right" | "top" | "bottom") =>
    logoTextItems.filter((item) =>
      item.position && item.position !== "default" ? item.position === side : logoTextSide === side
    );

  const getTextBlockMarginStyle = (side: "left" | "right" | "top" | "bottom"): React.CSSProperties => {
    const px = `${logoTextSpacing}px`;
    if (side === "left")   return { marginRight: px };
    if (side === "right")  return { marginLeft: px };
    if (side === "top")    return { marginBottom: px };
    if (side === "bottom") return { marginTop: px };
    return {};
  };

  const renderLogoTextBlock = (side: "left" | "right" | "top" | "bottom") => {
    const items = getLogoTextItemsForSide(side);
    if (items.length === 0) return null;

    const itemStyles = (item: typeof items[0]): React.CSSProperties => ({
      fontFamily:     item.font ?? "Inter",
      fontWeight:     item.bold ? 700 : 400,
      fontStyle:      item.italic ? "italic" : "normal",
      textDecoration: item.underline ? "underline" : "none",
      color:          item.color ?? "inherit",
    });

    if (logoTextDisplay === "list") {
      return (
        <ul className="list-disc pl-4 text-sm leading-tight">
          {items.map((item, i) => <li key={i} style={itemStyles(item)}>{item.text}</li>)}
        </ul>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm leading-tight max-w-full min-w-0" style={getTextBlockMarginStyle(side)}>
        {items.map((item, i) => (
          <span key={i} style={itemStyles(item)} className="max-w-full truncate overflow-hidden whitespace-nowrap">
            {item.text}
          </span>
        ))}
      </div>
    );
  };

  const logoTextHasVertical =
    logoTextSide === "top" || logoTextSide === "bottom" ||
    getLogoTextItemsForSide("top").length > 0 || getLogoTextItemsForSide("bottom").length > 0;

  const logoLinkClassName = `flex shrink min-w-0 max-w-full overflow-hidden gap-2 ${
    logoTextHasVertical ? "flex-col items-center" : "items-center"
  }`;

  // ── Markdown renderer ─────────────────────────────────────────────────────

  const renderMessageContent = useCallback((content: string): React.ReactNode => {
    const parts = content.split(/\[([^\]]+)\]\(([^)]+)\)/g);
    const elements: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      const boldParts = parts[i].split(/(\*\*.*?\*\*)/g);
      boldParts.forEach((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          elements.push(<strong key={`b-${i}-${j}`}>{part.slice(2, -2)}</strong>);
        } else if (part) {
          part.split("\n").forEach((line, k, arr) => {
            elements.push(<span key={`t-${i}-${j}-${k}`}>{line}</span>);
            if (k < arr.length - 1) elements.push(<span key={`br-${i}-${j}-${k}`} className="block h-1.5" />);
          });
        }
      });
      if (i + 1 < parts.length) {
        elements.push(
          <Link
            key={`lnk-${i}`}
            href={parts[i + 2]}
            onClick={() => { setAiChatOpen(false); window.speechSynthesis?.cancel(); }}
            className="text-[var(--brand)] hover:underline font-semibold transition-colors"
          >
            {parts[i + 1]}
          </Link>
        );
      }
    }
    return elements;
  }, []);

  // ── Autocomplete ──────────────────────────────────────────────────────────

  const renderAutocomplete = () => {
    if (searchQuery.trim().length <= 1) return null;
    const results = searchData ?? [];
    return (
      <div className="absolute top-full left-0 right-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
        {searching ? (
          <div className="p-4 flex justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col">
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                onClick={() => { setSearchOpen(false); setMobileOpen(false); setSearchQuery(""); }}
                className="flex items-center gap-3 p-2 hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-[var(--brand)] font-semibold">{formatPrice(product.price)}</p>
                </div>
              </Link>
            ))}
            <button
              type="submit"
              className="p-2 text-xs text-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium border-t border-border"
            >
              View all results for &quot;{searchQuery}&quot;
            </button>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
        )}
      </div>
    );
  };

  // ── Mobile Menu Portal ────────────────────────────────────────────────────

  const LogoBlock = ({ onClick }: { onClick?: () => void }) => (
    <Link
      href="/"
      onClick={onClick}
      className={logoLinkClassName}
      style={{ userSelect: "none" }}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {renderLogoTextBlock("top")}
      {renderLogoTextBlock("left")}
      {logoUrl
        ? renderLogoImage()
        : !logoTextItems.length && (
            <span className="font-display font-bold text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[100px] sm:max-w-[140px] lg:max-w-[180px]">
              {storeName}
            </span>
          )}
      {renderLogoTextBlock("right")}
      {renderLogoTextBlock("bottom")}
    </Link>
  );

  const mobileMenuPortal = mounted
    ? createPortal(
        <>
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-[2147483647] lg:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div
            className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-background border-r border-border z-[2147483647] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Sidebar header */}
            <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
              <LogoBlock onClick={() => setMobileOpen(false)} />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close mobile menu">
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Sidebar content */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col">
              <form onSubmit={handleSearch} className="flex gap-2 mb-6 relative">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  aria-label="Search products"
                  className="flex-1 h-11 px-4 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-[var(--brand)] shadow-sm"
                />
                <Button type="submit" size="icon" className="bg-[var(--brand)] text-white h-11 w-11 rounded-xl shadow-sm hover:opacity-90 shrink-0" aria-label="Submit search">
                  <Search className="w-4 h-4" />
                </Button>
                {renderAutocomplete()}
              </form>

              <div className="space-y-1.5 mb-6">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Navigation</p>
                {[
                  { href: "/",                   label: "Home" },
                  { href: "/products",           label: "All Products" },
                  { href: "/products?featured=true", label: "Deals" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                {rootCategories.map((cat) => {
                  const children = orderedCategories.filter((c) => c.parentId === cat.id);
                  return (
                    <div key={cat.id} className="space-y-1">
                      <Link
                        href={`/products?category=${cat.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                      >
                        {getCategoryIcon(cat)} {cat.name}
                      </Link>
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/products?category=${child.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-6 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors ml-4"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  );
                })}
                
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Services</p>
                  {[
                    { href: "/repairs", label: "Repairs & Parts", icon: <Wrench className="w-4 h-4" /> },
                    { href: "/e-waste", label: "E-Waste & Trade-In", icon: <Recycle className="w-4 h-4" /> },
                    { href: "/listings", label: "Listings", icon: <List className="w-4 h-4" /> },
                    { href: "/insurance", label: "Insurance", icon: <Shield className="w-4 h-4" /> },
                    { href: "/nextbit-wallet", label: "NextBit Wallet", icon: <CreditCard className="w-4 h-4" /> },
                    { href: "/vip", label: "VIP Services", icon: <Crown className="w-4 h-4" /> },
                    { href: "/conflicts", label: "Resolution Hub", icon: <Headphones className="w-4 h-4" /> },
                  ].map(({ href, label, icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                    >
                      {icon} {label}
                    </Link>
                  ))}
                </div>
                
                {isAuthenticated && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Link
                      href="/dashboard/diagnostics"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                    >
                      <Activity className="w-4 h-4" /> Device Diagnostics
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-3">
                {isAuthenticated ? (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => { setMobileOpen(false); router.push("/dashboard"); }}>
                    Dashboard
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setMobileOpen(false); router.push(getLoginUrl(location)); }}>
                      Sign In
                    </Button>
                    <Button className="flex-1 bg-[var(--brand)] text-white" onClick={() => { setMobileOpen(false); router.push(getLoginUrl(location, "register")); }}>
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body as Element
      )
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <header
        className={`sticky top-0 z-[99998] transition-all duration-500 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl shadow-sm border-b border-border"
            : "bg-background border-b border-transparent"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <LogoBlock />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === "/" ? "text-[var(--brand)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Home
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Products <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link href="/products" className="flex items-center gap-2 cursor-pointer">
                      <Package className="w-4 h-4" /> All Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {rootCategories.map((cat) => {
                    const children = orderedCategories.filter((c) => c.parentId === cat.id);
                    if (children.length > 0) {
                      return (
                        <DropdownMenuSub key={cat.id}>
                          <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                            {getCategoryIcon(cat)} {cat.name}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-56 p-1.5 shadow-xl border-border/60">
                            <DropdownMenuItem asChild className="py-2.5 px-3">
                              <Link href={`/products?category=${cat.slug}`} className="cursor-pointer font-semibold text-[var(--brand)]">
                                All {cat.name}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {children.map((child) => (
                              <DropdownMenuItem key={child.id} asChild className="group/item py-2.5 px-3">
                                <Link
                                  href={`/products?category=${child.slug}`}
                                  className="cursor-pointer flex items-center justify-between w-full text-muted-foreground"
                                >
                                  <span>{child.name}</span>
                                  <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-[var(--brand)]" />
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      );
                    }
                    return (
                      <DropdownMenuItem key={cat.id} asChild>
                        <Link href={`/products?category=${cat.slug}`} className="flex items-center gap-2 cursor-pointer">
                          {getCategoryIcon(cat)} {cat.name}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/products?featured=true" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Deals
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
                  Services
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 p-1.5">
                  <DropdownMenuItem asChild>
                    <Link href="/repairs" className="flex items-center gap-2 cursor-pointer">
                      <Wrench className="w-4 h-4" />
                      Repairs & Parts
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/e-waste" className="flex items-center gap-2 cursor-pointer">
                      <Recycle className="w-4 h-4" />
                      E-Waste & Trade-In
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/listings" className="flex items-center gap-2 cursor-pointer">
                      <List className="w-4 h-4" />
                      Listings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/insurance" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="w-4 h-4" />
                      Insurance
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/nextbit-wallet" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="w-4 h-4" />
                      NextBit Wallet
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/vip" className="flex items-center gap-2 cursor-pointer">
                      <Crown className="w-4 h-4" />
                      VIP Services
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/conflicts" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Resolution Hub
              </Link>

              {isAuthenticated && (
                <Link href="/dashboard/diagnostics" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Diagnostics
                </Link>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center gap-2 relative">
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    aria-label="Search products"
                    className="w-48 sm:w-64 lg:w-80 h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} aria-label="Close search">
                    <X className="w-4 h-4" />
                  </Button>
                  {renderAutocomplete()}
                </form>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="hidden md:flex" aria-label="Open search">
                  <Search className="w-4 h-4" />
                </Button>
              )}

              {/* AI Assistant */}
              <Button variant="ghost" size="icon" onClick={() => setAiChatOpen((p) => !p)} className="hidden md:flex" aria-label="Toggle AI Assistant">
                <Sparkles className="w-4 h-4 text-[var(--brand)]" />
              </Button>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link href="/dashboard/wishlist">
                  <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Wishlist">
                    <Heart className="w-4 h-4" />
                  </Button>
                </Link>
              )}

              {/* Cart */}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Theme toggle */}
              {cycleTheme && (
                <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Cycle theme">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                </Button>
              )}

              {/* User menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <div className="w-7 h-7 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-[var(--brand)]">
                          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/orders" className="flex items-center gap-2 cursor-pointer">
                        <Package className="w-4 h-4" /> My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/technician" className="flex items-center gap-2 cursor-pointer">
                        <Headphones className="w-4 h-4" /> Technician Portal
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin/dashboard" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="w-4 h-4" /> Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  {/* Desktop auth buttons */}
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.push(getLoginUrl(location))}>
                      Sign In
                    </Button>
                    <Button size="sm" className="bg-[var(--brand)] text-white hover:opacity-90" onClick={() => router.push(getLoginUrl(location, "register"))}>
                      Sign Up
                    </Button>
                  </div>
                  {/* Mobile auth icons */}
                  <div className="flex items-center gap-1 sm:hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.push(getLoginUrl(location))} aria-label="Sign In">
                      <LogIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => router.push(getLoginUrl(location, "register"))} aria-label="Sign Up">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* AI Assistant mobile */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setAiChatOpen((p) => !p)} aria-label="Toggle AI Assistant">
                <Sparkles className="w-4 h-4 text-[var(--brand)]" />
              </Button>

              {/* Mobile menu toggle */}
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open mobile menu">
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuPortal}
      </header>

      {/* ── Floating AI Chat ─────────────────────────────────────────────── */}
      {aiChatOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[100] transition-opacity duration-300 ${isPageScrolling ? "opacity-50" : "opacity-100"}`}
          style={{ transform: `translate(${chatPosition.x}px, ${chatPosition.y}px)` }}
        >
          <div className="w-80 sm:w-96 h-[32rem] bg-card border border-border shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Chat header */}
            <div
              className={`px-5 py-4 border-b border-border/50 bg-gradient-to-r from-[var(--brand)]/8 to-[var(--brand)]/4 flex items-center justify-between select-none touch-none flex-shrink-0 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <div className="flex items-center gap-2.5 pointer-events-none">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-[0.95rem]">{storeName}</h3>
                  <p className="text-[0.7rem] text-muted-foreground font-medium">Shopping Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[var(--brand)]/10 text-muted-foreground" onClick={handleNewChat} aria-label="New Chat">
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-[var(--brand)]/10 text-muted-foreground"
                  onClick={() => { setIsMuted((p) => !p); if (!isMuted) window.speechSynthesis?.cancel(); }}
                  aria-label="Toggle Voice"
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  onClick={() => { setAiChatOpen(false); window.speechSynthesis?.cancel(); }}
                  aria-label="Close chat"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gradient-to-b from-background/50 to-background" ref={chatScrollRef}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 flex-shrink-0`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 break-words whitespace-normal ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-tr-md bg-[var(--brand)] text-white shadow-md"
                        : "rounded-2xl rounded-tl-md bg-muted text-foreground shadow-sm"
                    }`}
                  >
                    <div className={`text-sm leading-relaxed whitespace-pre-line ${msg.role === "user" ? "font-medium" : "font-normal"}`}>
                      {msg.role === "assistant" ? (
                        <>
                          {streamingMessageIndex === i ? (
                            <TypewriterText
                              text={msg.content}
                              onComplete={() => setStreamingMessageIndex(null)}
                              renderContent={renderMessageContent}
                            />
                          ) : (
                            renderMessageContent(msg.content)
                          )}
                          {/* Product cards */}
                          {msg.products && msg.products.length > 0 && streamingMessageIndex !== i && (
                            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 animate-in fade-in duration-500">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended</p>
                              <div className="flex overflow-x-auto gap-3 pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {msg.products.map((p: any) => (
                                  <Link
                                    key={p.id}
                                    href={`/products/${p.slug}`}
                                    onClick={() => setAiChatOpen(false)}
                                    className="flex-shrink-0 w-36 bg-background rounded-xl p-2.5 snap-start shadow-sm border border-border/50 hover:border-[var(--brand)] hover:shadow-md transition-all group"
                                  >
                                    <div className="w-full h-24 bg-muted/50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                      {p.image
                                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        : <Package className="w-6 h-6 text-muted-foreground/50" />
                                      }
                                    </div>
                                    <p className="text-[11px] font-semibold truncate" title={p.name}>{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{p.brand || "Standard"}</p>
                                    <p className="text-[12px] font-bold text-[var(--brand)] mt-1">{formatPrice(p.price)}</p>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Suggested prompts */}
              {chatMessages.length > 0 &&
                chatMessages[chatMessages.length - 1].role === "assistant" &&
                !aiChatMutation.isPending && (
                <div className="flex flex-col gap-2 mt-2 flex-shrink-0 animate-in fade-in duration-300">
                  <p className="text-[0.75rem] text-muted-foreground font-semibold uppercase tracking-wider px-1">Suggested for you</p>
                  <div className="flex flex-wrap gap-2">
                    {(dynamicSuggestions.length > 0 ? dynamicSuggestions : customerSuggestedPrompts).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="text-xs bg-background hover:bg-[var(--brand)]/10 text-muted-foreground hover:text-[var(--brand)] border border-border/50 hover:border-[var(--brand)]/30 rounded-full px-3 py-1.5 transition-all duration-200 text-left flex-shrink-0"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {aiChatMutation.isPending && (
                <div className="flex justify-start animate-in fade-in duration-300 flex-shrink-0">
                  <div className="bg-muted rounded-2xl rounded-tl-md p-3 flex items-center gap-2 h-11 px-4 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
              <form className="flex gap-2" onSubmit={handleAiSubmit}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    aria-label="Chat input"
                    placeholder={isListening ? "Listening..." : "Ask about our laptops..."}
                    className="w-full h-10 pl-3.5 pr-9 text-sm rounded-lg border border-input/60 bg-background hover:border-input focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-all placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors p-1 rounded hover:bg-muted/50 ${
                      isListening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Voice Search"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[var(--brand)] text-white hover:opacity-90 h-10 px-4 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!chatInput.trim() || aiChatMutation.isPending}
                >
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}