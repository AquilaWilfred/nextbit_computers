"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CreditCard, Globe, Smartphone, DollarSign, CheckCircle, Star,
  Shield, Zap, Lock, Users, Wallet, ArrowRight, Eye, EyeOff,
  Copy, Download, RefreshCw, Activity, Clock, TrendingUp, Award,
  Unlock, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/* ─────────────────── Types (matching backend) ─────────────────── */

interface CardProduct {
  id: string;
  name: string;
  type: "e_nextbit" | "visa_cyber" | "visa_black";
  features: string[];
  benefits: string[];
  fees: { annual: number; foreignTxn: number; atm: number };
  requirements: string[];
  popular?: boolean;
  colorScheme: { bg: string; gradient: string; cardBg: string; accent: string };
}

interface CardApplication {
  id: string;
  cardType: string;
  status: "pending" | "approved" | "rejected" | "active";
  appliedAt: string;
  approvedAt?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

interface VirtualCard {
  id: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "expired";
  lastFour: string;
  cardType: string;
}

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  status: string;
}

interface UserStats {
  rewardsEarned: number;
  securityLevel: string;
  totalSpent: number;
  cardsIssued: number;
}

/* ─────────────────── API Service ─────────────────── */

const API_BASE = "/api/cards";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

/* ─────────────────── Realistic 3-D Card ─────────────────── */
function FlipCard({
  card,
  balance,
  onToggleFreeze,
  onCopy,
  toggling,
  cardholderName,
}: {
  card: VirtualCard;
  balance: number;
  onToggleFreeze: () => void;
  onCopy: (text: string, label: string) => void;
  toggling: boolean;
  cardholderName: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const balanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maskedNumber = card.cardNumber.replace(/(\d{4}) (\d{4}) (\d{4}) (\d{4})/, "$1 •••• •••• $4");
  const displayNumber = showNumber ? card.cardNumber : maskedNumber;

  const handleBalanceReveal = () => {
    setShowBalance(true);
    if (balanceTimerRef.current) clearTimeout(balanceTimerRef.current);
    balanceTimerRef.current = setTimeout(() => setShowBalance(false), 3000);
  };

  return (
    <div className="w-full flex flex-col items-center gap-5">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600&display=swap');
        .card-scene{width:380px;height:240px;perspective:1100px;cursor:pointer;user-select:none}
        .card-3d{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .75s cubic-bezier(.4,0,.2,1)}
        .card-3d.flipped{transform:rotateY(180deg)}
        .card-face{position:absolute;width:100%;height:100%;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
        .card-front{background:linear-gradient(135deg,#0d0d1a 0%,#0d2040 35%,#0a1628 65%,#1a0d2e 100%);box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 .5px rgba(0,242,255,.18),inset 0 1px 0 rgba(0,242,255,.12)}
        .card-back{background:linear-gradient(135deg,#0a0a18 0%,#0d1e3a 40%,#110d26 100%);transform:rotateY(180deg);box-shadow:0 24px 64px rgba(0,0,0,.55),0 0 0 .5px rgba(0,242,255,.18)}
        .card-grid-overlay{position:absolute;inset:0;border-radius:18px;background-image:linear-gradient(rgba(0,242,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,242,255,.025) 1px,transparent 1px);background-size:22px 22px}
        .holo-orb{position:absolute;width:90px;height:90px;border-radius:50%;background:conic-gradient(from 0deg,rgba(0,242,255,.18),rgba(0,85,255,.18),rgba(0,217,192,.18),rgba(0,242,255,.18));filter:blur(14px);top:16px;right:20px;animation:holoSpin 7s linear infinite;opacity:.55}
        @keyframes holoSpin{to{transform:rotate(360deg)}}
        .chip-wrap{position:absolute;top:26px;left:22px;width:44px;height:33px;background:linear-gradient(145deg,#c8a84b,#f0d060,#a8861e,#e8c040);border-radius:5px;display:flex;align-items:center;justify-content:center}
        .chip-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:34px;height:25px;gap:2px}
        .chip-cell{background:rgba(0,0,0,.13);border:.5px solid rgba(0,0,0,.18);border-radius:1px}
        .chip-center{background:rgba(0,0,0,.26)}
        .nfc-svg{position:absolute;top:30px;left:76px;width:22px;height:22px;opacity:.45}
        .mag-stripe{position:absolute;top:36px;left:0;right:0;height:46px;background:linear-gradient(90deg,#1a1a1a,#0a0a0a,#1a1a1a)}
        .sig-panel{position:absolute;top:106px;left:22px;right:22px;height:38px;background:repeating-linear-gradient(90deg,#e8e0d8 0px,#e8e0d8 6px,#d8d0c8 6px,#d8d0c8 12px);border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;gap:10px}
        .holo-sticker{position:absolute;top:106px;right:22px;width:46px;height:38px;border-radius:4px;background:conic-gradient(from 0deg,#ff006688,#ff880088,#00ff8888,#0088ff88,#8800ff88,#ff006688);display:flex;align-items:center;justify-content:center;font-size:18px;animation:holoColor 3s linear infinite;border:.5px solid rgba(255,255,255,.28)}
        @keyframes holoColor{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
        .card-frozen{filter:grayscale(.7) brightness(.65)}
        .balance-touch-area{position:absolute;top:16px;right:20px;text-align:right;cursor:pointer;padding:4px 6px;border-radius:6px;transition:background .2s}
        .balance-touch-area:hover{background:rgba(0,242,255,.07)}
      `}</style>

      <div className="card-scene" onClick={() => setFlipped(f => !f)} title="Click to flip card">
        <div className={`card-3d${card.status === "frozen" ? " card-frozen" : ""}${flipped ? " flipped" : ""}`}>
          {/* FRONT */}
          <div className="card-face card-front">
            <div className="card-grid-overlay" />
            <div className="holo-orb" />
            <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:.07 }} viewBox="0 0 380 240">
              <circle cx="320" cy="56" r="130" fill="none" stroke="#00f2ff" strokeWidth=".7"/>
              <circle cx="320" cy="56" r="88"  fill="none" stroke="#00f2ff" strokeWidth=".7"/>
              <circle cx="320" cy="56" r="46"  fill="none" stroke="#00f2ff" strokeWidth=".7"/>
              <line x1="0" y1="240" x2="380" y2="0" stroke="#0055ff" strokeWidth=".6"/>
            </svg>
            <div className="chip-wrap">
              <div className="chip-grid">
                {[0,1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className={`chip-cell${i===4?" chip-center":""}`} />
                ))}
              </div>
            </div>
            <svg className="nfc-svg" viewBox="0 0 22 22" fill="none">
              <path d="M6 11 Q6 6 11 6" stroke="#00f2ff" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M4 11 Q4 4 11 4" stroke="#00f2ff" strokeWidth="1.6" strokeLinecap="round" opacity=".55"/>
              <path d="M8 11 Q8 8 11 8" stroke="#00f2ff" strokeWidth="1.6" strokeLinecap="round" opacity=".85"/>
              <circle cx="11" cy="11" r="1.6" fill="#00f2ff"/>
            </svg>
            <div style={{ position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:3,color:"rgba(0,242,255,.4)",textTransform:"uppercase" }}>
              NextBit
            </div>
            <div className="balance-touch-area" onMouseEnter={handleBalanceReveal} onMouseLeave={() => { if(balanceTimerRef.current) clearTimeout(balanceTimerRef.current); setShowBalance(false); }} onTouchStart={e => { e.stopPropagation(); handleBalanceReveal(); }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:8,letterSpacing:2,textTransform:"uppercase",color:"rgba(0,242,255,.45)" }}>Balance</div>
              {showBalance ? (
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:600,color:"#00f2ff",letterSpacing:1 }}>KES {balance.toLocaleString()}</div>
              ) : (
                <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"rgba(0,242,255,.5)",letterSpacing:2 }}>•••••••</div>
              )}
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:8,color:"rgba(0,242,255,.3)",textAlign:"center",marginTop:1 }}>{showBalance ? "hover to hide" : "hover to reveal"}</div>
            </div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:17,letterSpacing:3,color:"#dceeff",position:"absolute",bottom:66,left:22,right:22 }}>{displayNumber}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:600,letterSpacing:2.5,textTransform:"uppercase",color:"#a8c8e8",position:"absolute",bottom:24,left:22 }}>{cardholderName.toUpperCase()}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:8,letterSpacing:1,textTransform:"uppercase",color:"rgba(140,190,230,.55)",position:"absolute",bottom:40,right:76 }}>Valid Thru</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:13,letterSpacing:2,color:"#a8c8e8",position:"absolute",bottom:24,right:76 }}>{card.expiryMonth}/{card.expiryYear}</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:28,fontStyle:"italic",position:"absolute",bottom:18,right:18,letterSpacing:-1,background:"linear-gradient(135deg,#1a6ef7,#00f2ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>VISA</div>
          </div>
          {/* BACK */}
          <div className="card-face card-back">
            <div className="card-grid-overlay" />
            <div className="mag-stripe" />
            <div style={{ position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",fontFamily:"'Orbitron',monospace",fontSize:8,fontWeight:700,letterSpacing:3,color:"rgba(0,242,255,.35)",textTransform:"uppercase" }}>NextBit</div>
            <div className="sig-panel">
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"#333",marginRight:4 }}>CVV</span>
              <div style={{ background:"white",padding:"2px 10px",borderRadius:2,fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"#111",letterSpacing:2,fontWeight:700,minWidth:44,textAlign:"center",cursor:"pointer" }} onClick={e => { e.stopPropagation(); setShowCvv(v => !v); }} title="Click to reveal CVV">
                {showCvv ? card.cvv : "•••"}
              </div>
            </div>
            <div className="holo-sticker">◈</div>
            <div style={{ position:"absolute",top:152,left:22,right:22,borderTop:".5px solid rgba(0,242,255,.12)" }} />
            <div style={{ position:"absolute",top:160,left:22,right:22,fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:"rgba(160,200,240,.38)",lineHeight:1.6 }}>
              Use of this card is subject to the terms of your card agreement. This card is property of NextBit Financial Services Ltd. If found, please return to nearest branch.
            </div>
            <div style={{ position:"absolute",bottom:22,left:22,fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:600,letterSpacing:2,color:"rgba(0,242,255,.55)" }}>NEXTBIT FINANCIAL</div>
            <div style={{ position:"absolute",bottom:8,left:22,fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:"rgba(160,200,240,.4)",letterSpacing:.5 }}>nextbit.com · +254 800 000 123</div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,fontStyle:"italic",position:"absolute",bottom:14,right:18,letterSpacing:-1,background:"linear-gradient(135deg,#1a6ef7,#00f2ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>VISA</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 tracking-widest uppercase flex items-center gap-2">
        <RefreshCw className="h-3 w-3" />
        {flipped ? "click to flip back" : "click card to flip"}
      </p>

      <div className="flex gap-2 w-full max-w-[380px] flex-wrap">
        <button onClick={() => onCopy(card.cardNumber, "Card number")} className="flex-1 bg-gray-900/60 hover:bg-gray-800 border border-gray-700 text-gray-200 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          <Copy className="h-3.5 w-3.5" /> Copy Number
        </button>
        <button onClick={() => { setShowNumber(v => !v); }} className="flex-1 bg-gray-900/60 hover:bg-gray-800 border border-gray-700 text-gray-200 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
          {showNumber ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showNumber ? "Hide" : "Reveal"}
        </button>
        <button onClick={onToggleFreeze} disabled={toggling} className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-colors ${card.status === "frozen" ? "bg-blue-950/60 hover:bg-blue-900/60 border-blue-700 text-blue-300" : "bg-red-950/60 hover:bg-red-900/60 border-red-800 text-red-300"} ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}>
          {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (card.status === "frozen" ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />)}
          {toggling ? "Processing..." : (card.status === "frozen" ? "Unfreeze" : "Freeze")}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function CardsPage() {
  const { user } = useAuth();
  const [cardProducts, setCardProducts] = useState<CardProduct[]>([]);
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [virtualCard, setVirtualCard] = useState<VirtualCard | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    rewardsEarned: 0,
    securityLevel: "3D Secure",
    totalSpent: 0,
    cardsIssued: 0,
  });
  const [loading, setLoading] = useState(true);
  const [togglingCard, setTogglingCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState("");

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [employment, setEmployment] = useState("employed");

  const cardholderName = user?.full_name || user?.email?.split("@")[0] || "Cardholder";

  // Fetch all data
  const fetchProducts = useCallback(async () => {
    try {
      const products = await apiFetch<any[]>(`${API_BASE}/products`);
      const mappedProducts: CardProduct[] = products.map(p => ({
        id: p.product_type,
        name: p.name,
        type: p.product_type,
        features: p.features || [],
        benefits: p.benefits || [],
        fees: { annual: p.annual_fee, foreignTxn: p.foreign_txn_fee, atm: p.atm_fee },
        requirements: p.requirements || [],
        popular: p.popular,
        colorScheme: {
          bg: p.color_bg || "from-blue-600 to-purple-600",
          gradient: "bg-gradient-to-r",
          cardBg: "bg-gradient-to-br from-blue-600 to-purple-800",
          accent: "bg-blue-600",
        },
      }));
      setCardProducts(mappedProducts);
    } catch (err: any) {
      toast.error(err.message || "Failed to load card products");
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const apps = await apiFetch<any[]>(`${API_BASE}/applications`);
      const mappedApps: CardApplication[] = apps.map(a => ({
        id: String(a.id),
        cardType: a.card_type === "e_nextbit" ? "E-NextBit Card" : a.card_type === "visa_cyber" ? "NextBit Visa Cyber" : "NextBit Visa Black",
        status: a.status,
        appliedAt: a.applied_at,
        approvedAt: a.reviewed_at,
        cardNumber: a.card_number,
        expiryDate: a.expiry_date,
        cvv: a.cvv,
      }));
      setApplications(mappedApps);
    } catch (err: any) {
      console.error("Failed to load applications", err);
    }
  }, []);

  const fetchVirtualCard = useCallback(async () => {
    try {
      const card = await apiFetch<any>(`${API_BASE}/virtual`);
      setVirtualCard({
        id: String(card.id),
        cardNumber: card.card_number,
        expiryMonth: card.expiry_month,
        expiryYear: card.expiry_year,
        cvv: card.cvv,
        balance: card.balance,
        currency: "KES",
        status: card.status,
        lastFour: card.last_four,
        cardType: card.card_type,
      });
    } catch (err: any) {
      if (err.message?.includes("404")) {
        setVirtualCard(null);
      } else {
        toast.error(err.message || "Failed to load virtual card");
      }
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const tx = await apiFetch<any[]>(`${API_BASE}/transactions?limit=5`);
      const mappedTx: Transaction[] = tx.map(t => ({
        id: String(t.id),
        merchant: t.merchant,
        amount: t.amount,
        date: new Date(t.created_at).toLocaleDateString(),
        status: t.status,
      }));
      setTransactions(mappedTx);
      
      // Calculate total spent from transactions
      const totalSpent = tx.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
      setUserStats(prev => ({ ...prev, totalSpent }));
    } catch (err: any) {
      console.error("Failed to load transactions", err);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const stats = await apiFetch<any>(`${API_BASE}/stats`);
      setUserStats({
        rewardsEarned: stats.rewards_earned || 0,
        securityLevel: stats.security_level || "3D Secure",
        totalSpent: stats.total_spent || 0,
        cardsIssued: stats.cards_issued || 0,
      });
    } catch (err: any) {
      console.error("Failed to load user stats", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchApplications(),
      fetchVirtualCard(),
      fetchTransactions(),
      fetchUserStats(),
    ]);
    setLoading(false);
  }, [fetchProducts, fetchApplications, fetchVirtualCard, fetchTransactions, fetchUserStats]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const applyForCard = async () => {
    if (!selectedCard) {
      toast.error("Please select a card type");
      return;
    }
    if (!fullName || !idNumber || !phoneNumber || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const productType = cardProducts.find(c => c.id === selectedCard)?.type;
      await apiFetch(`${API_BASE}/apply`, {
        method: "POST",
        body: JSON.stringify({
          product_type: productType,
          full_name: fullName,
          id_number: idNumber,
          phone: phoneNumber,
          email: email,
          employment: employment || "employed",
        }),
      });
      toast.success("Application submitted successfully!");
      setShowApplicationForm(false);
      setSelectedCard("");
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCardFreeze = async () => {
    if (!virtualCard) return;
    setTogglingCard(true);
    try {
      const newStatus = virtualCard.status === "active" ? "frozen" : "active";
      await apiFetch(`${API_BASE}/virtual/toggle-freeze`, {
        method: "POST",
        body: JSON.stringify({ freeze: newStatus === "frozen" }),
      });
      setVirtualCard(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Card ${newStatus === "active" ? "activated" : "frozen"} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle card status");
    } finally {
      setTogglingCard(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getProductName = (productType: string): string => {
    const product = cardProducts.find(p => p.id === productType);
    return product?.name || productType;
  };

  // Calculate cards issued count
  const cardsIssued = applications.filter(a => a.status === "approved" || a.status === "active").length;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-gray-300 text-sm tracking-widest uppercase">Loading your financial suite…</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="container mx-auto px-4 py-8">

          {/* Hero */}
          <div className="mb-10">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Powered by Visa</span>
                  <span className="bg-cyan-100 text-cyan-800 text-xs font-semibold px-3 py-1 rounded-full">Secure &amp; Global</span>
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">✨ Premium Benefits</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent">
                  NextBit Visa Cards
                </h1>
                <p className="text-gray-700 max-w-2xl mt-3 text-lg">
                  Experience the future of finance with our premium Visa card suite.
                  From everyday spending to global luxury, choose the card that fits your lifestyle.
                </p>
              </div>
            </div>

            {/* Stats - ALL DYNAMIC FROM BACKEND */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { icon: <Wallet className="h-5 w-5 text-blue-600"/>, bg:"bg-blue-100", label:"Virtual Cards Issued", value: String(cardsIssued) },
                { icon: <Activity className="h-5 w-5 text-cyan-600"/>, bg:"bg-cyan-100", label:"Total Spent", value: `KES ${userStats.totalSpent.toLocaleString()}` },
                { icon: <Award className="h-5 w-5 text-purple-600"/>, bg:"bg-purple-100", label:"Rewards Earned", value: `${userStats.rewardsEarned.toLocaleString()} pts` },
                { icon: <Shield className="h-5 w-5 text-green-600"/>, bg:"bg-green-100", label:"Security Level", value: userStats.securityLevel },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>{s.icon}</div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                      <div className="text-xl font-bold text-gray-800">{s.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Virtual Card */}
          {virtualCard && (
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-purple-600" />
                Your Active Virtual Card
              </h2>
              <div className="bg-gradient-to-br from-gray-950 via-blue-950/80 to-purple-950/70 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-purple-900/40">
                <FlipCard
                  card={virtualCard}
                  balance={virtualCard.balance}
                  onToggleFreeze={toggleCardFreeze}
                  onCopy={copyToClipboard}
                  toggling={togglingCard}
                  cardholderName={cardholderName}
                />
              </div>
            </div>
          )}

          {/* Card Products */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              Choose Your Card
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {cardProducts.map(card => (
                <Card key={card.id} className={`hover:shadow-xl transition-all duration-300 overflow-hidden ${card.popular ? "ring-2 ring-purple-500" : ""}`}>
                  <div className={`h-32 bg-gradient-to-r ${card.colorScheme.bg} p-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">NextBit × Visa</div>
                        <div className="text-lg font-bold text-white mt-1">{card.name}</div>
                      </div>
                      <div className="text-2xl font-bold italic text-white/90">VISA</div>
                    </div>
                    {card.popular && (
                      <Badge className="mt-2 bg-yellow-400 text-yellow-900 font-semibold">
                        <Star className="h-3 w-3 mr-1 fill-current" /> Most Popular
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-800">KES {card.fees.annual.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">annual fee</div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" /> Key Features
                        </h4>
                        <ul className="space-y-1">
                          {card.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-center gap-1">• {f}</li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                        onClick={() => { setSelectedCard(card.id); setShowApplicationForm(true); }}
                      >
                        Apply Now <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          {virtualCard && transactions.length > 0 && (
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <Activity className="h-5 w-5 text-purple-600" /> Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border-b last:border-0 transition-colors">
                        <div>
                          <div className="font-medium text-sm text-gray-800">{tx.merchant}</div>
                          <div className="text-xs text-gray-400">{tx.date}</div>
                        </div>
                        <div className={`font-bold text-sm ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} KES
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Applications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800">Your Card Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No card applications yet. Apply for your first NextBit Visa card above.
                </p>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800">{app.cardType}</h3>
                          <p className="text-sm text-gray-500">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                        </div>
                        <Badge className={`font-semibold border-0 ${
                          app.status === "approved" || app.status === "active" ? "bg-green-100 text-green-800" :
                          app.status === "rejected" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {app.status}
                        </Badge>
                      </div>
                      {app.approvedAt && (
                        <p className="text-xs text-green-600 mt-2">✓ Approved on {new Date(app.approvedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Modal */}
          {showApplicationForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
              <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600">
                  <CardTitle className="text-white text-lg">
                    Apply for {getProductName(selectedCard)}
                  </CardTitle>
                  <p className="text-white/90 text-sm mt-1">Complete the form to get your virtual card instantly</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-gray-700 font-semibold">Full Name *</Label>
                    <Input 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)} 
                      placeholder="Enter your full name" 
                      className="mt-1" 
                      disabled={!!user?.full_name}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">ID Number *</Label>
                    <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Phone Number *</Label>
                    <Input 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value)} 
                      placeholder="e.g., +254712345678" 
                      className="mt-1"
                      disabled={!!user?.phone}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Email Address *</Label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="Enter your email" 
                      className="mt-1"
                      disabled={!!user?.email}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Employment Status</Label>
                    <Select value={employment} onValueChange={setEmployment}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select employment status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="self-employed">Self-employed</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> What happens next?
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Instant virtual card issuance upon approval</li>
                      <li>• Physical card delivered within 5–7 business days</li>
                      <li>• 24/7 customer support</li>
                      <li>• Zero liability protection</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={applyForCard} disabled={submitting} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Submit Application
                    </Button>
                    <Button variant="outline" onClick={() => setShowApplicationForm(false)} className="flex-1 text-gray-700 border-gray-300">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}