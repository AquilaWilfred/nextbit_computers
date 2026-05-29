"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin, Navigation, CheckCircle, Package, Phone, Loader2, Lock,
  Truck, LogOut, Sparkles, RotateCcw, Search, X, User, Map,
  PhoneCall, Wifi, WifiOff, DollarSign, History, Mic, Volume2,
  VolumeX,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/auth/useAuth";
import { formatPrice } from "@/lib/cart";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriverInfo { id: number; name: string }
interface DriverProfile { id: number; name: string; isAvailable: boolean }

interface Delivery {
  id: number;
  orderNumber: string;
  shippingFullName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry?: string;
  shippingPhone?: string;
  total: number;
  paymentStatus: string;
}

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  withdrawable: number;
}
interface EarningsBreakdownItem { orderNumber: string; date: string; earnings: number }
interface ChartDataItem { day: string; earnings: number }
interface EarningsData {
  summary: EarningsSummary;
  breakdown: EarningsBreakdownItem[];
  chartData: ChartDataItem[];
}
interface PayoutItem { id: number; amount: number; requestedAt: string; status: string }

interface PublicSettings {
  general?: { storeName?: string };
  appearance?: { logoUrl?: string };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Request failed");
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Settings — session-cached, zero CLS */
function usePublicSettings() {
  const CACHE_KEY = "settings_cache_general_appearance";
  const [data, setData] = useState<PublicSettings>(() => {
    if (typeof sessionStorage === "undefined") return {};
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    if (Object.keys(data).length > 0) return;
    fetch("/api/settings/public?keys=general&keys=appearance")
      .then((r) => r.json())
      .then((json: PublicSettings) => {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(json)); } catch {}
        setData(json);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const storeName =
    data.general?.storeName ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("store_name_cache") : null) ||
    "Store";
  const logoUrl =
    data.appearance?.logoUrl ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("store_logo_cache") : null) ||
    null;

  return { storeName, logoUrl };
}

/** Deliveries — polling every 10 s */
function useDeliveries(agentId: number | null, enabled: boolean) {
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!enabled || !agentId) return;
    try {
      const data = await apiFetch<Delivery[]>(`/api/delivery/my-deliveries?agentId=${agentId}`);
      setDeliveries(data);
    } catch {
      // silently fail on background poll
    } finally {
      setIsLoading(false);
    }
  }, [agentId, enabled]);

  useEffect(() => {
    fetch_();
    if (!enabled) return;
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_, enabled]);

  return { deliveries, isLoading, refetch: fetch_ };
}

/** Driver profile — polling every 10 s */
function useDriverProfile(agentId: number | null, enabled: boolean) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !agentId) return;
    try {
      const data = await apiFetch<DriverProfile>(`/api/delivery/driver-profile?agentId=${agentId}`);
      setProfile(data);
    } catch {}
  }, [agentId, enabled]);

  useEffect(() => {
    fetch_();
    if (!enabled) return;
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_, enabled]);

  return { profile, refetch: fetch_ };
}

// ---------------------------------------------------------------------------
// TypewriterText (unchanged logic, extracted for clarity)
// ---------------------------------------------------------------------------

function TypewriterText({
  text, onComplete, renderContent,
}: {
  text: string;
  onComplete: () => void;
  renderContent: (c: string) => React.ReactNode;
}) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); onComplete(); }
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
// Main Component
// ---------------------------------------------------------------------------

export default function DriverDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { storeName, logoUrl } = usePublicSettings();

  const [activeTab, setActiveTab] = useState<"deliveries" | "earnings">("deliveries");
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const up = () => { setIsOnline(true); toast.success("You are back online!"); };
    const down = () => { setIsOnline(false); toast.error("You are offline. Some features may be unavailable."); };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Driver auth state (localStorage-based, separate from user session)
  const [isDriverAuth, setIsDriverAuth] = useState(false);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("driver_auth_token");
    if (!saved) return;
    try {
      const info: DriverInfo = JSON.parse(saved);
      setDriverInfo(info);
      setIsDriverAuth(true);
    } catch {
      setIsDriverAuth(true);
    }
  }, []);

  useEffect(() => {
    if (!isDriverAuth) {
      setAiChatOpen(false);
    }
  }, [isDriverAuth]);

  const { deliveries, isLoading } = useDeliveries(driverInfo?.id ?? null, isDriverAuth);
  const { profile: driverProfile, refetch: refetchProfile } = useDriverProfile(
    driverInfo?.id ?? null,
    isDriverAuth && !!driverInfo?.id
  );

  // Availability toggle
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const handleToggleAvailability = async (checked: boolean) => {
    if (!driverProfile) return;
    setIsUpdatingAvailability(true);
    try {
      await apiFetch("/api/delivery/update-availability", {
        method: "POST",
        body: JSON.stringify({ agentId: driverProfile.id, isAvailable: checked }),
      });
      toast.success("Status updated successfully!");
      refetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  // Complete delivery via OTP
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);
  const handleCompleteDelivery = async (orderId: number) => {
    setIsCompletingDelivery(true);
    try {
      await apiFetch("/api/delivery/verify-otp-complete", {
        method: "POST",
        body: JSON.stringify({ orderId, otp }),
      });
      toast.success("Delivery marked as completed!");
      setActiveOrderId(null);
      setOtp("");
      wsRef.current?.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setIsCompletingDelivery(false);
    }
  };

  // WebSocket + geolocation for live trip tracking
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTrip = (orderId: number) => {
    setActiveOrderId(orderId);
    toast.success("Trip started! Broadcasting location…");

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${proto}//${window.location.host}/ws/delivery/${orderId}`);

      socket.onopen = () => {
        wsRef.current = socket;
        if (!navigator.geolocation) {
          toast.error("Geolocation is not supported by your browser");
          return;
        }
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                heading: pos.coords.heading ?? 0,
              }));
            }
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      };

      socket.onclose = () => {
        reconnectTimeoutRef.current = setTimeout(connect, 3_000);
      };
    };

    connect();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      wsRef.current?.close();
    };
  }, []);

  // Driver PIN login
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPin(true);
    try {
      const data = await apiFetch<{ agentId: number; agentName: string }>(
        "/api/delivery/verify-driver-pin",
        { method: "POST", body: JSON.stringify({ phone: phone.trim(), pin }) }
      );
      const info: DriverInfo = { id: data.agentId, name: data.agentName };
      localStorage.setItem("driver_auth_token", JSON.stringify(info));
      setDriverInfo(info);
      setIsDriverAuth(true);
      toast.success(`Welcome back, ${data.agentName}`);
      window.dispatchEvent(new Event("driverAuthChanged"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleDriverLogout = () => {
    localStorage.removeItem("driver_auth_token");
    setIsDriverAuth(false);
    setDriverInfo(null);
    wsRef.current?.close();
    toast.success("Signed out of driver portal");
    window.dispatchEvent(new Event("driverAuthChanged"));
  };

  const handleAiToggle = () => {
    if (!isDriverAuth) {
      toast.error("Driver login is required to open the AI assistant.");
      return;
    }
    setAiChatOpen((prev) => !prev);
  };

  // Google Maps directions
  const getDirections = (order: Delivery) => {
    const fallback = () =>
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(`${order.shippingAddress}, ${order.shippingCity}`)}`,
        "_blank"
      );

    if (!navigator.geolocation) { fallback(); return; }
    toast.info("Getting your current location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const origin = `${coords.latitude},${coords.longitude}`;
        const dest = encodeURIComponent(
          `${order.shippingAddress}, ${order.shippingCity}${order.shippingCountry ? `, ${order.shippingCountry}` : ""}`
        );
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
          "_blank"
        );
      },
      () => { toast.error("Unable to get location."); fallback(); }
    );
  };

  // ---------------------------------------------------------------------------
  // AI Chat (REST-based, no tRPC)
  // ---------------------------------------------------------------------------

  const [aiChatOpen, setAiChatOpen] = useState(() => {
    try { return sessionStorage.getItem("store_ai_open") === "true"; } catch { return false; }
  });
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem("store_ai_messages");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = sessionStorage.getItem("store_ai_position");
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch { return { x: 0, y: 0 }; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [isChatPending, setIsChatPending] = useState(false);

  // Init greeting once driverInfo loads
  useEffect(() => {
    if (chatMessages.length === 0) {
      const name = driverInfo?.name || "Driver";
      setChatMessages([{ role: "assistant", content: `Hi, ${name}! I'm your delivery assistant. How can I help?` }]);
    }
  }, [driverInfo?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist chat state
  useEffect(() => { try { sessionStorage.setItem("store_ai_open", String(aiChatOpen)); } catch {} }, [aiChatOpen]);
  useEffect(() => { try { sessionStorage.setItem("store_ai_messages", JSON.stringify(chatMessages)); } catch {} }, [chatMessages]);
  useEffect(() => { try { sessionStorage.setItem("store_ai_position", JSON.stringify(chatPosition)); } catch {} }, [chatPosition]);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current)
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, aiChatOpen]);
  useEffect(() => {
    if (streamingMessageIndex === null) return;
    const id = setInterval(() => {
      if (chatScrollRef.current)
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
    return () => clearInterval(id);
  }, [streamingMessageIndex]);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const r = new SpeechRecognitionAPI();
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((res: any) => res[0].transcript)
        .join("");
      setChatInput(transcript);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  const toggleListening = () => {
    const r = recognitionRef.current as any;
    if (isListening) { r?.stop(); setIsListening(false); }
    else if (r) { r.start(); setIsListening(true); toast.info("Listening…"); }
    else toast.error("Voice input is not supported in your browser.");
  };

  const speakResponse = (text: string) => {
    if (isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/[*_#`]/g, "");
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
  };

  // Drag handlers
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button,input")) return;
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

  // Send message to AI via REST
  const sendAiMessage = useCallback(async (message: string, history: ChatMessage[]) => {
    setIsChatPending(true);
    try {
      const data = await apiFetch<{ reply: string; suggestions?: string[] }>(
        "/api/ai/driver-chat",
        {
          method: "POST",
          body: JSON.stringify({ message, history: history.slice(1), agentId: driverInfo?.id }),
        }
      );
      setChatMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: data.reply }];
        setStreamingMessageIndex(next.length - 1);
        return next;
      });
      if (data.suggestions?.length) setDynamicSuggestions(data.suggestions);
      speakResponse(data.reply);
    } catch (err) {
      const msg =
        err instanceof Error && (err.message.includes("quota") || err.message.includes("429"))
          ? "The AI is currently unavailable due to high traffic. Please try again later."
          : "Sorry, I ran into a network error. Please try again.";
      setChatMessages((prev) => [...prev, { role: "assistant" as const, content: msg }]);
    } finally {
      setIsChatPending(false);
    }
  }, [driverInfo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatPending) return;
    setChatInput("");
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(next);
    setDynamicSuggestions([]);
    sendAiMessage(text, next);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (isChatPending) return;
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: prompt }];
    setChatMessages(next);
    setDynamicSuggestions([]);
    sendAiMessage(prompt, next);
  };

  const handleNewChat = () => {
    const name = driverInfo?.name || "Driver";
    setChatMessages([{ role: "assistant", content: `Hi, ${name}! I'm your delivery assistant. How can I help?` }]);
    setChatInput("");
    toast.success("New chat started!");
  };

  const driverSuggestedPrompts = [
    "What are my deliveries today?",
    "How do I request a payout?",
    "Show my offline status",
  ];

  const renderMessageContent = (content: string): React.ReactNode => {
    const parts = content.split(/\[([^\]]+)\]\(([^)]+)\)/g);
    const els: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      const boldParts = parts[i].split(/(\*\*.*?\*\*)/g);
      boldParts.forEach((p, j) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          els.push(<strong key={`b-${i}-${j}`}>{p.slice(2, -2)}</strong>);
        } else if (p) {
          p.split("\n").forEach((line, k, arr) => {
            els.push(<span key={`t-${i}-${j}-${k}`}>{line}</span>);
            if (k < arr.length - 1) els.push(<span key={`br-${i}-${j}-${k}`} className="block h-1.5" />);
          });
        }
      });
      if (i + 1 < parts.length) {
        els.push(
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
    return els;
  };

  const filteredMessages = chatMessages.filter(
    (m) => !searchHistoryQuery.trim() || m.content.toLowerCase().includes(searchHistoryQuery.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render branches
  // ---------------------------------------------------------------------------

  let mainContent: React.ReactNode;

  if (isLoading || authLoading) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center" aria-live="polite" aria-label="Loading">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
      </div>
    );
  } else if (!isAuthenticated) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" aria-hidden />
          <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to your account first.</p>
          <Button onClick={() => { window.location.href = "/auth?redirect=/driver-portal"; }} className="bg-[var(--brand)] text-white">
            Go to Login
          </Button>
        </div>
      </div>
    );
  } else if (!isDriverAuth) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 shadow-lg border-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4" aria-hidden>
              <Truck className="w-8 h-8 text-[var(--brand)]" />
            </div>
            <h1 className="text-2xl font-bold font-display">Driver Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your credentials to view your deliveries</p>
          </div>
          <form onSubmit={handleDriverLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input id="phone" placeholder="e.g. +254712345678" className="pl-10 h-11" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">Access PIN</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input
                  id="pin"
                  type="password"
                  placeholder="••••"
                  className="pl-10 font-mono tracking-widest text-lg h-11"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={4}
                  autoFocus
                  required
                  autoComplete="current-password"
                  inputMode="numeric"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-[var(--brand)] text-white hover:opacity-90"
              disabled={pin.length < 4 || !phone || isVerifyingPin}
            >
              {isVerifyingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login as Driver"}
            </Button>
          </form>
        </Card>
      </div>
    );
  } else {
    mainContent = (
      <div className="container pt-6 pb-8 max-w-lg mx-auto flex-1">
        {/* Header row */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold mb-1">Driver Dashboard</h1>
              <p className="text-muted-foreground">Hello, {driverInfo?.name || user?.name || "Driver"}</p>
            </div>

            {driverProfile && (
              <div className="flex items-center gap-2 bg-card border border-border p-2.5 rounded-xl shadow-sm">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 ${isOnline ? "text-green-600" : "text-red-600"}`}>
                  {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                  <span>{isOnline ? "Online" : "Offline"}</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex items-center gap-3 pl-1">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{driverProfile.isAvailable ? "Available" : "Offline"}</span>
                    <span className="text-xs text-muted-foreground">{activeOrderId ? "Out for delivery" : "Awaiting orders"}</span>
                  </div>
                  <Switch
                    checked={driverProfile.isAvailable}
                    onCheckedChange={handleToggleAvailability}
                    disabled={isUpdatingAvailability || !!activeOrderId || !isOnline}
                    aria-label="Toggle availability"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col items-center justify-center text-center bg-card border-border shadow-sm">
              <Package className="w-5 h-5 text-[var(--brand)] mb-2 opacity-80" aria-hidden />
              <p className="text-2xl font-bold leading-none mb-1">{deliveries?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Packages in Vehicle</p>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center bg-card border-border shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-500 mb-2 opacity-80" aria-hidden />
              <p className="text-2xl font-bold leading-none mb-1">{activeOrderId ? 1 : 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Active Trip</p>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6" role="tablist">
          {(["deliveries", "earnings"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "text-[var(--brand)] border-[var(--brand)]"
                  : "text-muted-foreground border-transparent hover:bg-muted/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Deliveries */}
        {activeTab === "deliveries" && (
          <div className="space-y-4" role="tabpanel">
            {deliveries && deliveries.length > 0 ? (
              deliveries.map((order) => {
                const isActive = activeOrderId === order.id;
                return (
                  <Card key={order.id} className={`p-5 shadow-sm transition-all overflow-hidden ${isActive ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-mono text-sm font-bold text-[var(--brand)]">#{order.orderNumber}</p>
                        <p className="text-sm font-medium mt-0.5">{order.shippingFullName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatPrice(order.total)}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mt-1 border ${
                          order.paymentStatus === "paid"
                            ? "bg-green-500/10 text-green-600 border-green-200"
                            : "bg-orange-500/10 text-orange-600 border-orange-200"
                        }`}>
                          {order.paymentStatus === "paid" ? "Paid Online" : "Collect Cash"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border/50">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center shrink-0" aria-hidden>
                          <MapPin className="w-4 h-4 text-[var(--brand)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{order.shippingAddress}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{order.shippingCity}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button variant="secondary" className="flex-1 gap-2 text-xs h-9 bg-background hover:bg-muted shadow-sm" onClick={() => getDirections(order)}>
                          <Map className="w-3.5 h-3.5" /> Directions
                        </Button>
                        <Button variant="secondary" className="flex-1 gap-2 text-xs h-9 bg-background hover:bg-muted shadow-sm" onClick={() => { window.location.href = `tel:${order.shippingPhone}`; }}>
                          <PhoneCall className="w-3.5 h-3.5" /> Call Customer
                        </Button>
                      </div>
                    </div>

                    {!isActive ? (
                      <Button
                        onClick={() => startTrip(order.id)}
                        className="w-full bg-[var(--brand)] text-white gap-2 h-12 text-base font-semibold shadow-sm hover:opacity-90"
                        disabled={!isOnline}
                      >
                        <Navigation className="w-5 h-5" /> Start Delivery
                      </Button>
                    ) : (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-center gap-2 bg-[var(--brand)]/10 text-[var(--brand)] py-2.5 rounded-lg border border-[var(--brand)]/20" aria-live="polite">
                          <div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-ping" aria-hidden />
                          <p className="text-xs font-bold uppercase tracking-wider">Live Tracking Active</p>
                        </div>
                        <div className="bg-muted/50 rounded-xl p-4 border border-border/50 text-center">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block font-semibold">Customer Delivery PIN</Label>
                          <div className="flex gap-2 justify-center max-w-[240px] mx-auto">
                            <Input
                              aria-label="Enter 4-digit OTP"
                              placeholder="Enter 4-digit OTP"
                              value={otp}
                              maxLength={4}
                              inputMode="numeric"
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                              className="text-center font-mono text-2xl tracking-[0.5em] h-12 bg-background shadow-inner"
                            />
                            <Button
                              onClick={() => handleCompleteDelivery(order.id)}
                              disabled={otp.length !== 4 || isCompletingDelivery || !isOnline}
                              className="bg-green-600 text-white hover:bg-green-700 h-12 px-6 shadow-md"
                              aria-label="Confirm delivery OTP"
                            >
                              {isCompletingDelivery ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                            Ask the customer for their 4-digit PIN to complete this delivery securely.
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden />
                <p>No assigned deliveries.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "earnings" && (
          <div role="tabpanel">
            <EarningsContent agentId={driverInfo?.id ?? null} />
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 relative">
      <header className="bg-background border-b border-border sticky top-0 z-50 shadow-sm relative">
        <div className="container">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 z-10" aria-label={`${storeName} home`}>
              {logoUrl
                ? <img src={logoUrl} alt={storeName} className="h-8 object-contain" width={80} height={32} />
                : <div className="w-8 h-8 rounded-md bg-[var(--brand)]/10 flex items-center justify-center" aria-hidden><Truck className="w-4 h-4 text-[var(--brand)]" /></div>}
              <span className="font-display font-bold text-lg tracking-tight hidden sm:block">{storeName}</span>
            </Link>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none" aria-hidden>
              <Truck className="w-5 h-5 text-[var(--brand)]" />
              <span className="font-display font-bold text-lg tracking-tight text-[var(--brand)]">Driver Portal</span>
            </div>

            <div className="flex items-center gap-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAiToggle}
                disabled={!isDriverAuth}
                title={isDriverAuth ? "Toggle AI Assistant" : "Driver login is required to use AI"}
                aria-label="Toggle AI Assistant"
              >
                <Sparkles className="w-4 h-4 text-[var(--brand)]" />
              </Button>
              {isAuthenticated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent hover:ring-[var(--brand)]/30 transition-all ml-1" aria-label="Driver menu">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center border border-[var(--brand)]/20">
                        <span className="text-sm font-semibold text-[var(--brand)]">
                          {(isDriverAuth ? driverInfo?.name : user?.name)?.charAt(0)?.toUpperCase() ?? "U"}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2.5 border-b border-border bg-muted/30 mb-1">
                      <p className="text-sm font-semibold truncate">{isDriverAuth ? driverInfo?.name : user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        {isDriverAuth ? <><Truck className="w-3 h-3" /> Delivery Agent</> : <><User className="w-3 h-3" /> Customer</>}
                      </p>
                    </div>
                    {isDriverAuth && (
                      <DropdownMenuItem onClick={() => setActiveTab("earnings")} className="cursor-pointer py-2">
                        <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" /> My Earnings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" /> Customer Account
                      </Link>
                    </DropdownMenuItem>
                    {isDriverAuth && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDriverLogout} className="text-destructive focus:text-destructive cursor-pointer py-2">
                          <LogOut className="w-4 h-4 mr-2" /> Sign Out of Portal
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {mainContent}

      <footer className="border-t border-border bg-card mt-auto shrink-0">
        <div className="container flex flex-col sm:flex-row items-center justify-between p-6 gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <nav aria-label="Footer links" className="flex items-center gap-4">
            <Link href="/legal/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/legal/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          </nav>
        </div>
      </footer>

      {/* Floating AI Chat */}
      {aiChatOpen && isDriverAuth && (
        <div
          className="fixed bottom-6 right-6 z-[100]"
          style={{
            transform: `translate(${chatPosition.x}px, ${chatPosition.y}px)`,
          }}
          role="dialog"
          aria-label="Delivery assistant chat"
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
                <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center" aria-hidden>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[0.95rem]">{storeName}</h3>
                  <p className="text-[0.7rem] text-muted-foreground font-medium">Delivery Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNewChat} title="New Chat" aria-label="Start new chat"><RotateCcw className="w-3 h-3" /></Button>
                <Button variant={isSearchingHistory ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setIsSearchingHistory(!isSearchingHistory); if (isSearchingHistory) setSearchHistoryQuery(""); }} aria-label="Search chat history"><Search className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { setIsMuted(!isMuted); if (!isMuted) window.speechSynthesis?.cancel(); }} aria-label={isMuted ? "Unmute AI voice" : "Mute AI voice"}>
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:text-destructive" onClick={() => { setAiChatOpen(false); window.speechSynthesis?.cancel(); }} aria-label="Close chat"><X className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            {isSearchingHistory && (
              <div className="p-3 border-b border-border bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search history…"
                    aria-label="Search chat history"
                    className="w-full h-8 pl-8 pr-8 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                    value={searchHistoryQuery}
                    onChange={(e) => setSearchHistoryQuery(e.target.value)}
                    autoFocus
                  />
                  {searchHistoryQuery && (
                    <button onClick={() => setSearchHistoryQuery("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gradient-to-b from-background/50 to-background" ref={chatScrollRef} aria-live="polite">
              {filteredMessages.length > 0 ? (
                filteredMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 flex-shrink-0`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 break-words whitespace-normal ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-tr-md bg-[var(--brand)] text-white shadow-md"
                        : "rounded-2xl rounded-tl-md bg-muted text-foreground shadow-sm"
                    }`}>
                      <div className={`text-sm leading-relaxed whitespace-pre-line ${msg.role === "user" ? "font-medium" : ""}`}>
                        {msg.role === "assistant" && streamingMessageIndex === i
                          ? <TypewriterText text={msg.content} onComplete={() => setStreamingMessageIndex(null)} renderContent={renderMessageContent} />
                          : msg.role === "assistant" ? renderMessageContent(msg.content) : msg.content}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No messages found for &ldquo;{searchHistoryQuery}&rdquo;
                </p>
              )}

              {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant" && !isChatPending && !searchHistoryQuery && (
                <div className="flex flex-col gap-2 mt-2 flex-shrink-0 animate-in fade-in duration-300">
                  <p className="text-[0.75rem] text-muted-foreground font-semibold uppercase tracking-wider px-1">Suggested for you</p>
                  <div className="flex flex-wrap gap-2">
                    {(dynamicSuggestions.length > 0 ? dynamicSuggestions : driverSuggestedPrompts).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="text-xs bg-background hover:bg-[var(--brand)]/10 text-muted-foreground hover:text-[var(--brand)] border border-border/50 hover:border-[var(--brand)]/30 rounded-full px-3 py-1.5 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isChatPending && !searchHistoryQuery && (
                <div className="flex justify-start animate-in fade-in duration-300 flex-shrink-0">
                  <div className="bg-muted rounded-2xl rounded-tl-md p-3 flex items-center gap-2 h-11 px-4 shadow-sm" aria-label="AI is typing">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
              <form className="flex gap-2" onSubmit={handleAiSubmit}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    aria-label="Chat input"
                    placeholder={isListening ? "Listening…" : "Ask about deliveries…"}
                    className="w-full h-10 pl-3.5 pr-9 text-sm rounded-lg border border-input/60 bg-background focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition-colors ${isListening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[var(--brand)] text-white hover:opacity-90 h-10 px-4 rounded-lg font-medium shadow-md"
                  disabled={!chatInput.trim() || isChatPending}
                >
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EarningsContent — extracted sub-component, all tRPC removed
// ---------------------------------------------------------------------------

function EarningsContent({ agentId }: { agentId: number | null }) {
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutHistory, setPayoutHistory] = useState<PayoutItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  const fetchEarnings = useCallback(async () => {
    if (!agentId) return;
    try {
      const data = await apiFetch<EarningsData>(
        `/api/delivery/earnings?agentId=${agentId}&timeRange=week`
      );
      setEarningsData(data);
    } catch { /* non-fatal */ }
    finally { setIsLoading(false); }
  }, [agentId]);

  const fetchHistory = useCallback(async () => {
    if (!agentId) return;
    try {
      const data = await apiFetch<PayoutItem[]>(`/api/delivery/payout-history?agentId=${agentId}`);
      setPayoutHistory(data);
    } catch {}
    finally { setHistoryLoading(false); }
  }, [agentId]);

  useEffect(() => {
    fetchEarnings();
    fetchHistory();
  }, [fetchEarnings, fetchHistory]);

  const handleRequestPayout = async () => {
    if (!agentId || !earningsData) return;
    setIsRequestingPayout(true);
    try {
      await apiFetch("/api/delivery/request-payout", {
        method: "POST",
        body: JSON.stringify({ agentId, amount: earningsData.summary.withdrawable }),
      });
      toast.success("Payout request submitted! It will be processed shortly.");
      setShowPayoutModal(false);
      fetchEarnings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request payout.");
      setShowPayoutModal(false);
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (isLoading) return <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)] mx-auto mt-10" />;
  if (!earningsData) return (
    <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
      No earnings data available.
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { label: "Today", value: earningsData.summary.today, highlight: false },
          { label: "This Week", value: earningsData.summary.week, highlight: true },
          { label: "This Month", value: earningsData.summary.month, highlight: false },
        ] as const).map(({ label, value, highlight }) => (
          <Card key={label} className={`p-4 text-center ${highlight ? "bg-[var(--brand)]/10 border-[var(--brand)]/20" : ""}`}>
            <p className={`text-xs font-medium uppercase ${highlight ? "text-[var(--brand)]" : "text-muted-foreground"}`}>{label}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "text-[var(--brand)]" : ""}`}>{formatPrice(value)}</p>
          </Card>
        ))}
      </div>

      {/* Payout CTA */}
      <Card className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
        <div>
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">Available for Payout</p>
          <p className="text-3xl font-bold mt-1 text-green-700 dark:text-green-300">{formatPrice(earningsData.summary.withdrawable)}</p>
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md"
          onClick={() => setShowPayoutModal(true)}
          disabled={(earningsData.summary.withdrawable ?? 0) <= 0}
        >
          <DollarSign className="w-5 h-5" /> Request Payout
        </Button>
      </Card>

      {/* Chart */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 text-muted-foreground">Weekly Income</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earningsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v)} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                formatter={(v: number) => [formatPrice(v), "Earnings"]}
              />
              <Bar dataKey="earnings" fill="var(--brand)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent earnings */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden /> Recent Earnings
        </h3>
        <div className="space-y-2">
          {earningsData.breakdown.map((item, i) => (
            <Card key={i} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs font-semibold">#{item.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
              </div>
              <p className="font-bold text-green-600">+{formatPrice(item.earnings)}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Payout history */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 text-muted-foreground flex items-center gap-2">
          <History className="w-4 h-4" aria-hidden /> Payout History
        </h3>
        {historyLoading ? (
          <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : payoutHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No payout history found.</p>
        ) : (
          <div className="space-y-2">
            {payoutHistory.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50">
                <div>
                  <p className="font-semibold">{formatPrice(payout.amount)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(payout.requestedAt).toLocaleString()}</p>
                </div>
                <Badge
                  variant={payout.status === "failed" ? "destructive" : "secondary"}
                  className={`capitalize ${payout.status === "completed" ? "bg-green-100 text-green-800" : ""}`}
                >
                  {payout.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payout confirmation modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal aria-label="Confirm payout">
          <Card className="w-full max-w-md shadow-xl animate-in zoom-in-95 duration-300">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Confirm Payout</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPayoutModal(false)} aria-label="Close">✕</Button>
              </div>
              <div className="text-center bg-muted/50 p-6 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">You are about to request a payout of</p>
                <p className="text-4xl font-bold my-2 text-[var(--brand)]">{formatPrice(earningsData.summary.withdrawable)}</p>
                <p className="text-sm text-muted-foreground">to your registered M-Pesa number.</p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Payouts are processed within 24 hours. Ensure your M-Pesa details are correct in your profile.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPayoutModal(false)}>Cancel</Button>
                <Button
                  type="button"
                  disabled={isRequestingPayout}
                  className="bg-green-600 text-white hover:bg-green-700 min-w-24"
                  onClick={handleRequestPayout}
                >
                  {isRequestingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}