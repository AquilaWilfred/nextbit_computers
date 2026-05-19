"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DealsPage() {
  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold">Deals</h1>
          <p className="text-muted-foreground">
            Special offers and promotions will appear here once available.
          </p>
        </div>

        <Card className="p-8 text-center">
          <p className="text-lg">No active deals are published yet.</p>
          <div className="mt-6">
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
