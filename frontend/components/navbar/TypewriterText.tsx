import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  onComplete: () => void;
  renderContent: (content: string) => React.ReactNode;
}

export function TypewriterText({ text, onComplete, renderContent }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        onComplete();
      }
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