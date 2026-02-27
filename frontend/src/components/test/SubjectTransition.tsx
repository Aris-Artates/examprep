import { useEffect, useState } from "react";

type SubjectTransitionProps = {
  subject: string;
  onComplete: () => void;
  duration?: number;
};

const subjectEmojis: Record<string, string> = {
  mathematics: "📐",
  science: "🔬",
  english: "📚",
  abstract_reasoning: "🧩",
  verbal: "💬",
};

const subjectColors: Record<string, string> = {
  mathematics: "bg-purple-500",
  science: "bg-green-500",
  english: "bg-blue-500",
  abstract_reasoning: "bg-orange-500",
  verbal: "bg-red-500",
};

export default function SubjectTransition({
  subject,
  onComplete,
  duration = 2000,
}: SubjectTransitionProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / duration) * 100, 100);
      setProgress(percent);

      if (percent >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 100);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <div className={`${subjectColors[subject] || "bg-blue-500"} w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center text-6xl shadow-2xl transform transition-transform animate-pulse`}>
          {subjectEmojis[subject] || "📝"}
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 capitalize">{subject}</h1>
        <p className="text-gray-300 text-lg mb-12">Get ready for the next section</p>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div
            className={`h-full ${subjectColors[subject] || "bg-blue-500"} transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
