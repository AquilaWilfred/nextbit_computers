"use client";
import { useProxyFetch } from "@/lib/api-hooks";
import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7" fill="currentColor"/>
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M22.54 6.42c-.27-.72-1.04-1.28-1.8-1.42C18.88 4.5 12 4.5 12 4.5s-6.88 0-8.74.5c-.78.14-1.53.7-1.8 1.42C1 8.28 1 12 1 12s0 3.72.46 5.58c.27.72 1.04 1.28 1.8 1.42 1.86.5 8.74.5 8.74.5s6.88 0 8.74-.5c.78-.14 1.53-.7 1.8-1.42.46-1.86.46-5.58.46-5.58s0-3.72-.46-5.58z" fill="currentColor"/>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" fill="currentColor"/>
      <circle cx="4" cy="4" r="2" fill="currentColor"/>
    </svg>
  );
}

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  tiktok: TiktokIcon,
};

export default function Footer() {
  const { data: settings, error: settingsError } = useProxyFetch<any>('/api/settings/public?keys=general,appearance,social');
  const { data: announcementsData, error: announcementsError } = useProxyFetch<any[]>('/api/content/announcements');

  const general = settings?.general || {};
  const appearance = settings?.appearance || {};
  const social = settings?.social || {};

  const storeName = general.storeName || "Store";
  const storeDesc = general.storeDescription || "Your premier destination for cutting-edge computers, laptops, and accessories.";
  const address = general.address || "123 Innovation Drive, Nairobi, Kenya";
  const phone = general.phone || "+254 724 704 865";
  const email = general.contactEmail || "support@company.com";
  const secondaryPhone = general.secondaryPhone || "";
  const countryFlag = "🇰🇪";
  const logoUrl = appearance.logoUrl || null;
  const footerAdText = appearance.footerAdText || "AI-powered product recommendations and special offers tailored to your next order.";

  const announcements = announcementsData || [];
  const activeAnnouncement = announcements.find((item: any) => item.active);

  const socialLinks = [
    { id: "facebook", url: social.facebook },
    { id: "instagram", url: social.instagram },
    { id: "twitter", url: social.twitter },
    { id: "youtube", url: social.youtube },
    { id: "linkedin", url: social.linkedin },
    { id: "tiktok", url: social.tiktok },
  ].filter((s) => s.url);

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pt-2">
              {logoUrl && <img src={logoUrl} alt={storeName} className="h-8 object-contain" />}
              <span className="font-display font-bold text-lg tracking-tight">{storeName}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{storeDesc}</p>
            <p className="text-sm text-[var(--brand)] leading-relaxed mt-2 line-clamp-2">{footerAdText}</p>
            {activeAnnouncement && (
              <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-3 mt-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand)] font-semibold mb-1">Announcement</p>
                <p className="text-sm text-foreground leading-snug line-clamp-2">{activeAnnouncement.title || activeAnnouncement.content}</p>
              </div>
            )}
            <div className="flex gap-3">
              {socialLinks.map((s) => {
                const Icon = SOCIAL_ICONS[s.id];
                return (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-md bg-muted hover:bg-[var(--brand)] hover:text-white flex items-center justify-center text-muted-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="sr-only">{s.id}</span>
                    {Icon ? <Icon className="w-4 h-4" /> : <div className="w-4 h-4 rounded-sm bg-current opacity-60" />}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Shop</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About Us", href: "/about" },
                { label: "All Products", href: "/products" },
                { label: "Laptops", href: "/products?category=laptops" },
                { label: "Desktops", href: "/products?category=desktops" },
                { label: "Accessories", href: "/products?category=accessories" },
                { label: "Deals & Offers", href: "/products?featured=true" },
                { label: "Our Branches", href: "/branches" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-[var(--brand)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Account</h4>
            <ul className="space-y-2.5">
              {[
                { label: "My Dashboard", href: "/dashboard" },
                { label: "My Orders", href: "/dashboard/orders" },
                { label: "Track Order", href: "/track-order" },
                { label: "Saved Addresses", href: "/dashboard/addresses" },
                { label: "Account Settings", href: "/dashboard" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-[var(--brand)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Services</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Repairs & Parts", href: "/repairs" },
                { label: "E-Waste Trade-In", href: "/e-waste" },
                { label: "Insurance", href: "/insurance" },
                { label: "Financial Suite", href: "/cards" },
                { label: "VIP Program", href: "/vip" },
                { label: "Resolution Hub", href: "/conflicts" },
                { label: "Diagnostics", href: "/dashboard/diagnostics" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-[var(--brand)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Contact</h4>
            <ul className="space-y-3">
              <li className="text-sm text-muted-foreground">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:text-[var(--brand)] transition-colors">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[var(--brand)]" />
                  <span>{address}</span>
                </a>
              </li>
              <li className="text-sm text-muted-foreground">
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2.5 hover:text-[var(--brand)] transition-colors">
                  <Phone className="w-4 h-4 shrink-0 text-[var(--brand)]" />
                  <span>{countryFlag} {phone}</span>
                </a>
              </li>
              {secondaryPhone && (
                <li className="text-sm text-muted-foreground">
                  <a href={`tel:${secondaryPhone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2.5 hover:text-[var(--brand)] transition-colors">
                    <Phone className="w-4 h-4 shrink-0 text-[var(--brand)]" />
                    <span>{countryFlag} {secondaryPhone}</span>
                  </a>
                </li>
              )}
              <li className="text-sm text-muted-foreground">
                <a href={`mailto:${email}`} className="flex items-center gap-2.5 hover:text-[var(--brand)] transition-colors">
                  <Mail className="w-4 h-4 shrink-0 text-[var(--brand)]" />
                  <span>{email}</span>
                </a>
              </li>
            </ul>
            <div className="pt-2 space-y-1">
              {(general.openingHours || [
                { label: "Mon - Fri", value: "9:00 AM - 8:00 PM" },
                { label: "Saturday", value: "10:00 AM - 6:00 PM" },
              ]).map((hour: any, idx: number) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  <span className="font-medium">{hour.label}:</span> {hour.value}
                </p>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">Support & services</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Same-day branch pickup in Nairobi.</li>
                <li>Phone support: {countryFlag} {phone}</li>
                <li>Find your nearest store on the branches map.</li>
                <li>Secure checkout with local payment options.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <Link key={item} href={`/legal/${item.toLowerCase().replace(/ /g, '-')}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
