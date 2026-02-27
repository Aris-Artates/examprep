"use client"
import Link from "next/link";

export default function HomePage() {

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wider uppercase">
          AI-Powered
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          ExamPrep <span className="text-blue-600">PH</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Prepare for the Philippine Science High School entrance exam. Take
          practice tests and let our AI tell you which PSHS campuses you're
          compatible with.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
            Get Started
          </Link>
          <Link href="/auth/login" className="btn-secondary text-lg px-8 py-3">
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
