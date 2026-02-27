"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SubjectTransition from "@/components/test/SubjectTransition";

type Question = {
  id: string;
  question_text: string;
  options: string[];
  subject: string;
  difficulty: string;
};

export default function TestPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [showTransition, setShowTransition] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const [nextSubject, setNextSubject] = useState<string>("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      // Get user first and store ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("questions")
        .select("*")
        .limit(60)
        .order("subject");
      if (data) setQuestions(data);
      
      // Load user preference for skipping transitions
      const skip = localStorage.getItem("skipSubjectTransition") === "true";
      setSkipTransition(skip);
      
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Check if subject changed and show transition
  const currentSubject = questions[current]?.subject;
  const prevSubject = current > 0 ? questions[current - 1]?.subject : null;

  useEffect(() => {
    if (current > 0 && prevSubject && currentSubject && prevSubject !== currentSubject && !skipTransition) {
      setShowTransition(true);
      setNextSubject(currentSubject);
    }
  }, [current, currentSubject, prevSubject, skipTransition]);

  function handleTransitionComplete() {
    setShowTransition(false);
  }

  async function handleSubmit() {
    if (submitting || !userId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tests/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          answers,
          questions: questions.map((q) => ({ id: q.id, subject: q.subject })),
        }),
      });

      if (!res.ok) throw new Error("Server error");
      const { attempt_id } = await res.json();
      window.location.href = `/results/${attempt_id}`;
    } catch (err) {
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading questions…</p>
      </div>
    </div>
  );

  if (showTransition) {
    return <SubjectTransition subject={nextSubject} onComplete={handleTransitionComplete} />;
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="font-bold text-blue-600">ExamPrep PH</span>
          <span className="text-gray-400 mx-2">·</span>
          <span className="text-sm text-gray-500">Question {current + 1} of {questions.length}</span>
        </div>
        <div className={`font-mono font-bold text-lg ${timeLeft < 300 ? "text-red-600" : "text-gray-800"}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
          {q.subject}
        </span>

        <h2 className="text-xl font-semibold text-gray-900 mb-6">{q.question_text}</h2>

        <div className="space-y-3 mb-10">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: i }))}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium ${
                answers[q.id] === i
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="font-bold mr-3 text-gray-400">{["A", "B", "C", "D"][i]}.</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0} className="btn-secondary flex-1">← Previous</button>

          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="btn-primary flex-1">Next →</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
              {submitting ? "Submitting…" : "Submit Test ✓"}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {Object.keys(answers).length} of {questions.length} answered
        </p>
      </div>
    </div>
  );
}