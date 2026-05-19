"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WishlistRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/overview?tab=wishlist");
  }, [router]);
  return null;
}
