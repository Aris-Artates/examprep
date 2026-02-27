"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ResultsChart from "@/components/results/ResultsChart";

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("test_attempts")
        .select("*, ai_predictions(*)")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (!data) { router.push("/dashboard"); return; }
      setAttempt(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleRetryAI() {
    setRetrying(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tests/${params.id}/retry-ai`, {
        method: "POST",
      });
      if (res.ok) {
        // Refetch after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      alert("Retry failed. Please try again.");
      setRetrying(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const prediction = attempt.ai_predictions?.[0];
  const scores = attempt.section_scores as Record<string, number> ?? {};

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-blue-600">← Dashboard</Link>
        <span className="text-sm text-gray-500">
          {new Date(attempt.created_at).toLocaleDateString("en-PH", { dateStyle: "long" })}
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Results</h1>
        <p className="text-gray-500 mb-8">AI-powered analysis of your exam performance</p>

        {/* Score summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(scores).map(([subject, score]) => (
            <div key={subject} className="card text-center">
              <p className="text-3xl font-bold text-blue-600">{score as number}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{subject}</p>
            </div>
          ))}
        </div>

        {/* Score chart */}
        {Object.keys(scores).length > 0 && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">Score Breakdown</h2>
            <ResultsChart scores={scores} />
          </div>
        )}

        {/* AI Prediction */}
        {prediction ? (
          <>
            <div className="card mb-6 border-l-4 border-blue-600">
              <h2 className="text-lg font-semibold mb-3">🤖 AI Analysis</h2>
              <p className="text-gray-700 leading-relaxed">{prediction.narrative}</p>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Campus Compatibility</h2>
            <div className="space-y-3">
              {(prediction.school_compatibility as any[])?.map((school: any) => (
                <div key={school.name} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{school.name}</p>
                    <p className="text-sm text-gray-500">{school.region}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 rounded-full h-2" style={{ width: `${school.compatibility}%` }} />
                    </div>
                    <span className="font-bold text-blue-600 w-12 text-right">{school.compatibility}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">AI is analyzing your results… please wait.</p>
            <button 
              onClick={handleRetryAI} 
              disabled={retrying}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {retrying ? "Retrying…" : "Or click here to retry"}
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/test" className="btn-primary px-8">Take Another Test</Link>
        </div>
      </div>
    </div>
  );
}