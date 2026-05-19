// components/ui/TypewriterText.tsx
"use client";

import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  renderContent: (content: string) => React.ReactNode;
  speed?: number; // milliseconds per character
  chunkSize?: number; // characters to add per interval
}

export function TypewriterText({
  text,
  onComplete,
  renderContent,
  speed = 15,
  chunkSize = 3,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += chunkSize;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, onComplete, speed, chunkSize]);

  return (
    <>
      {renderContent(displayed)}
      <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[var(--brand)] animate-pulse" />
    </>
  );
}