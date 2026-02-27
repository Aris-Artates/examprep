import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

type PerformanceTrackerProps = {
  attempts: any[];
};

export default function PerformanceTracker({ attempts }: PerformanceTrackerProps) {
  if (!attempts || attempts.length === 0) {
    return null;
  }

  // Prepare data for performance over time
  const performanceByAttempt = attempts
    .slice()
    .reverse() // show chronologically
    .map((attempt, index) => ({
      attempt: index + 1,
      date: new Date(attempt.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      total: attempt.total_score ?? 0,
    }));

  // Prepare data for subject breakdown (average across all attempts)
  const subjectScores: Record<string, { total: number; count: number }> = {};
  attempts.forEach((attempt) => {
    const scores = attempt.section_scores as Record<string, number> ?? {};
    Object.entries(scores).forEach(([subject, score]) => {
      if (!subjectScores[subject]) {
        subjectScores[subject] = { total: 0, count: 0 };
      }
      subjectScores[subject].total += score;
      subjectScores[subject].count += 1;
    });
  });

  const subjectData = Object.entries(subjectScores)
    .map(([subject, data]) => ({
      subject: subject.charAt(0).toUpperCase() + subject.slice(1),
      average: Math.round(data.total / data.count),
    }))
    .sort((a, b) => b.average - a.average);

  const latestTotal = attempts[0]?.total_score ?? 0;
  const prevTotal = attempts[1]?.total_score ?? 0;
  const improvement = latestTotal - prevTotal;

  return (
    <div className="space-y-8 mb-8">
      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{latestTotal}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Latest Score</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${improvement >= 0 ? "text-green-600" : "text-red-600"}`}>
            {improvement >= 0 ? "+" : ""}{improvement}
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Change</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">{attempts.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Tests Taken</p>
        </div>
      </div>

      {/* Score Trend */}
      {performanceByAttempt.length > 1 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Score Progression</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceByAttempt}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Subject Performance */}
      {subjectData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Subject</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjectData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
