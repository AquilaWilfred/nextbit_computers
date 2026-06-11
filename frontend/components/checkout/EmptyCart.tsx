import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export function EmptyCart() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-center py-20">
        <div>
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h2 className="font-display text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-4">
            Add some products before checking out.
          </p>
          <Button
            onClick={() => router.push("/products")}
            className="bg-[var(--brand)] text-white hover:opacity-90"
          >
            Browse Products
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}