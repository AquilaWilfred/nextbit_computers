interface AIChatSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
}

export function AIChatSuggestions({ suggestions, onSelect }: AIChatSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-col gap-2 mt-2 flex-shrink-0 animate-in fade-in duration-300">
      <p className="text-[0.75rem] text-muted-foreground font-semibold uppercase tracking-wider px-1">Suggested for you</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="text-xs bg-background hover:bg-[var(--brand)]/10 text-muted-foreground hover:text-[var(--brand)] border border-border/50 hover:border-[var(--brand)]/30 rounded-full px-3 py-1.5 transition-all duration-200 text-left flex-shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}