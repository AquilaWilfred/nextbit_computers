// components/about/AboutError.tsx
"use client";

import { FC } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AboutErrorProps {
  error: Error;
  onRetry: () => void;
}

export const AboutError: FC<AboutErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container flex-1 py-12 lg:py-20 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Failed to Load Page</h2>
          <p className="text-muted-foreground mb-6">{error.message}</p>
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};