// components/ai/AIChatSuggestedQuestions.tsx
import { Button } from "@/components/ui/button";

const SUGGESTED_QUESTIONS = [
  "What's the best laptop for gaming?",
  "How do I track my order?",
  "Do you offer warranty on products?",
  "What's your return policy?",
];

interface AIChatSuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function AIChatSuggestedQuestions({ onSelect }: AIChatSuggestedQuestionsProps) {
  return (
    <div className="px-4 pb-2">
      <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
      <div className="flex flex-wrap gap-1">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs h-6"
            onClick={() => onSelect(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}