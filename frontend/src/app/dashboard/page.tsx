"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PerformanceTracker from "@/components/dashboard/PerformanceTracker";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  // facebook video embed id
  const facebookVideoId = "862606680159831";
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("test_attempts")
        .select("*, ai_predictions(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setAttempts(data ?? []);
      setLoading(false);

      // load facebook embed after ensuring login
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/facebook/embed?video_id=${facebookVideoId}`
        );
        if (res.ok) {
          const { embed_html } = await res.json();
          const container = document.getElementById("fb-dashboard-container");
          if (container) container.innerHTML = embed_html;
        }
      } catch (e) {
        console.error("Failed to load FB embed", e);
      }
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  async function handleDeleteAttempt(attemptId: string) {
    if (!window.confirm("Are you sure you want to delete this test?\n\nYes, I am sure!\n\nI'll think about it.")) {
      return;
    }
    
    setDeleting(attemptId);
    try {
      await supabase
        .from("test_attempts")
        .delete()
        .eq("id", attemptId);
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch (err) {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const name = user?.user_metadata?.full_name?.split(" ")[0] || "Student";

  // Calculate total possible score from section_scores keys
  function getTotalPossible(attempt: any) {
    const scores = attempt.section_scores as Record<string, number> ?? {};
    const numSubjects = Object.keys(scores).length;
    // Each subject has equal questions, total is sum of all section scores max
    return attempt.answers ? Object.keys(attempt.answers).length : numSubjects * 12;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-blue-600 text-lg">ExamPrep PH</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <Link href="/settings" className="text-gray-600 hover:text-gray-900 text-xl" title="Settings">
            ⚙️
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Welcome back, {name} 👋
        </h1>
        <p className="text-gray-500 mb-4">Ready to practice for your PSHS entrance exam?</p>

        {/* Facebook Live Stream (visible after login) */}
        <div className="relative w-full mb-8" style={{ paddingTop: '56.25%' }}>
          <div id="fb-dashboard-container" className="absolute top-0 left-0 w-full h-full" />
        </div>

        {/* Performance Tracker */}
        {attempts.length > 0 && <PerformanceTracker attempts={attempts} />}

        <div className="bg-blue-600 rounded-2xl p-8 text-white mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold mb-1">Take a Practice Test</h2>
            <p className="text-blue-100 text-sm">Our AI will analyze your results and match you to PSHS campuses.</p>
          </div>
          <Link href="/test" className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap">
            Start Test →
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Tests</h2>
        {attempts.length > 0 ? (
          <div className="space-y-3">
            {attempts.map((attempt: any) => {
              const totalPossible = getTotalPossible(attempt);
              const hasAI = attempt.ai_predictions && attempt.ai_predictions.length > 0;
              return (
                <div key={attempt.id} className="card flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {new Date(attempt.created_at).toLocaleDateString("en-PH", { dateStyle: "long" })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Score: {attempt.total_score ?? "—"} / {totalPossible}
                      {hasAI && <span className="ml-2 text-green-600 font-medium">· AI Ready</span>}
                      {!hasAI && <span className="ml-2 text-yellow-600 font-medium">· AI Processing…</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/results/${attempt.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                      View →
                    </Link>
                    <button
                      onClick={() => handleDeleteAttempt(attempt.id)}
                      disabled={deleting === attempt.id}
                      className="text-red-600 hover:text-red-700 text-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-4xl mb-3">📝</p>
            <p className="text-gray-500">No tests taken yet. Take your first practice test!</p>
          </div>
        )}
      </div>
    </div>
  );
}