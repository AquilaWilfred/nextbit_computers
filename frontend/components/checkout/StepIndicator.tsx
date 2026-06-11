import { Check } from "lucide-react";
import { STEPS } from "@/constants/checkout/checkout.constants";
import { Step } from "@/types/checkout/checkout.types";

interface StepIndicatorProps {
  currentStep: Step;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex items-center gap-2 ${
              i <= stepIndex ? "text-[var(--brand)]" : "text-muted-foreground"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                i < stepIndex
                  ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                  : i === stepIndex
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className="hidden sm:block text-sm font-medium">
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 sm:w-20 h-0.5 mx-2 transition-colors ${
                i < stepIndex ? "bg-[var(--brand)]" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}