import { Score } from "@/types/probe";

interface ScoreCardProps {
  score: Score;
}

export default function ScoreCard({ score }: ScoreCardProps) {
  const getColor = (rating: string) => {
    switch (rating) {
      case "EXCELLENT": return "text-green-600";
      case "GOOD": return "text-blue-600";
      case "POOR": return "text-yellow-600";
      case "VERY POOR": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900">{score.pct}%</div>
        <div className={`text-xl font-semibold ${getColor(score.overall)}`}>{score.overall}</div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span>Passed: {score.checks.filter(c => c.passed).length}</span>
          <span>Failed: {score.checks.filter(c => !c.passed).length}</span>
        </div>
      </div>
    </div>
  );
}