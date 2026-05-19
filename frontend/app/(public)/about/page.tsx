"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle } from "lucide-react";
import { dynamicIconMap } from "@/lib/iconMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreFeature {
  icon: string;
  title: string;
  desc: string;
  content?: string;
}

interface GeneralSettings {
  storeName?: string;
  storeDescription?: string;
  features?: StoreFeature[];
}

interface PublicSettings {
  general?: GeneralSettings;
}

// ---------------------------------------------------------------------------
// Defaults (static — zero network cost, ships in JS bundle)
// ---------------------------------------------------------------------------

const DEFAULT_FEATURES: StoreFeature[] = [
  {
    icon: "Truck",
    title: "Free Shipping",
    desc: "On orders over $500",
    content:
      "We offer fast, free standard shipping on all orders over $500. Your items will be securely packaged and delivered right to your doorstep within 3-5 business days.",
  },
  {
    icon: "Shield",
    title: "2-Year Warranty",
    desc: "On all products",
    content:
      "Every product we sell is backed by a comprehensive 2-year warranty that covers manufacturer defects and hardware failures.",
  },
  {
    icon: "RefreshCw",
    title: "30-Day Returns",
    desc: "Hassle-free returns",
    content:
      "We offer a hassle-free 30-day return policy. Simply return the item in its original condition and packaging for a full refund or exchange.",
  },
  {
    icon: "Award",
    title: "Certified Products",
    desc: "100% authentic hardware",
    content:
      "We guarantee that all our products are 100% authentic, brand new, and sourced directly from official manufacturers.",
  },
];

// ---------------------------------------------------------------------------
// Hook — replaces trpc.settings.public.useQuery
// ---------------------------------------------------------------------------

const CACHE_KEY = "settings_cache_general";

function useGeneralSettings() {
  // Hydrate immediately from session cache to avoid CLS
  const [settings, setSettings] = useState<GeneralSettings>(() => {
    if (typeof sessionStorage === "undefined") return {};
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: PublicSettings = JSON.parse(cached);
        return parsed.general ?? {};
      }
    } catch {
      /* ignore */
    }
    return {};
  });

  useEffect(() => {
    // Skip network call if already populated from cache
    if (Object.keys(settings).length > 0) return;

    fetch("/api/settings/public?keys=general")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json() as Promise<PublicSettings>;
      })
      .then((data) => {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          /* quota exceeded */
        }
        setSettings(data.general ?? {});
      })
      .catch(() => {
        // Non-fatal: defaults are already in place
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return settings;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function About() {
  const general = useGeneralSettings();

  const storeName = general.storeName || "Store";
  const features: StoreFeature[] = general.features?.length
    ? general.features
    : DEFAULT_FEATURES;

  // Smooth-scroll to anchor when navigating directly to #feature-N
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="container flex-1 py-12 lg:py-20 max-w-4xl mx-auto">
        {/* Hero */}
        <header className="text-center mb-16">
          <h1 className="font-display text-4xl lg:text-5xl font-bold mb-4">
            About {storeName}
          </h1>
          <p className="text-lg text-muted-foreground">
            {general.storeDescription ||
              "Your premier destination for cutting-edge technology."}
          </p>
        </header>

        {/* Features */}
        <section aria-label="Store features">
          <ol className="space-y-8 list-none p-0 m-0">
            {features.map((f, idx) => {
              const Icon = dynamicIconMap[f.icon] || CheckCircle;
              return (
                <li
                  key={idx}
                  id={`feature-${idx}`}
                  className="bg-card border border-border rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-start gap-6 lg:gap-8 shadow-sm hover:shadow-xl transition-shadow duration-300"
                >
                  <div
                    className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <Icon className="w-8 h-8 text-[var(--brand)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-display mb-2">
                      {f.title}
                    </h2>
                    <h3 className="text-sm font-medium text-[var(--brand)] mb-4">
                      {f.desc}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {f.content ||
                        "Learn more about our incredible store features and how we prioritize your shopping experience."}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>

      <Footer />
    </div>
  );
}