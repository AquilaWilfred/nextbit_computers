import { Link } from "wouter";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { WishlistItem, Product } from "@/types/dashboard/dashboard.types";
import StoreLoader from "@/components/StoreLoader";

interface WishlistTabProps {
  items: WishlistItem[];
  isLoading: boolean;
}

export function WishlistTab({ items, isLoading }: WishlistTabProps) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
        {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
        <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" aria-hidden="true" />
        <p className="font-medium">Your wishlist is empty</p>
        <Link href="/products">
          <Button size="sm" className="mt-4 bg-[var(--brand)] text-white hover:opacity-90">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">My Wishlist</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item) => (
          <ProductCard key={item.product.id} product={item.product as unknown as Product} />
        ))}
      </div>
    </div>
  );
}