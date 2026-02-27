"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "personalize" | "account" | "privacy" | "report";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("personalize");
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      setFullName(user.user_metadata?.full_name || "");

      // Load preferences from localStorage
      const skipTrans = localStorage.getItem("skipSubjectTransition") === "true";
      setSkipTransition(skipTrans);
      
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveName() {
    if (!fullName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      alert("Name updated successfully!");
    } catch (err) {
      alert("Failed to update name: " + err);
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteEmail !== user?.email) {
      alert("Email does not match.");
      return;
    }

    if (!window.confirm("This action cannot be undone. Are you absolutely sure?")) {
      return;
    }

    setDeleting(true);
    try {
      // Delete user via the backend endpoint (would need to be created)
      // For now, just sign out and show message
      await supabase.auth.signOut();
      alert("Account deletion initiated. Please contact support to complete.");
      router.push("/auth/login");
    } catch (err) {
      alert("Error: " + err);
      setDeleting(false);
    }
  }

  function handleSkipTransitionChange() {
    const newValue = !skipTransition;
    setSkipTransition(newValue);
    localStorage.setItem("skipSubjectTransition", newValue ? "true" : "false");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="font-bold text-blue-600">← Dashboard</Link>
        <span className="font-bold text-blue-600 text-lg">Settings</span>
        <span className="text-sm text-gray-500">{user?.email}</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {(["personalize", "account", "privacy", "report"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Personalize Tab */}
        {activeTab === "personalize" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Preferences</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipTransition}
                  onChange={handleSkipTransitionChange}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-gray-700 font-medium">Skip Subject Transition</span>
              </label>
              <p className="text-sm text-gray-500 mt-2 ml-8">
                When enabled, questions will transition directly without showing subject screen.
              </p>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {/* Change Full Name */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingName ? "Saving…" : "Save Name"}
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
              </div>
            </div>

            {/* Delete Account */}
            <div className="card border-l-4 border-red-500">
              <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
              <p className="text-sm text-gray-600 mb-4">
                Deleting your account will permanently remove all your test attempts and data. This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type your email to confirm deletion:
                </label>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder={user?.email}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteEmail !== user?.email}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                {deleting ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Privacy Settings</h2>
            <p className="text-gray-600">Privacy controls coming soon…</p>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === "report" && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Report an Issue</h2>
            <p className="text-gray-600">Report functionality coming soon…</p>
          </div>
        )}
      </div>
    </div>
  );
}
