"use client";

import { useAuth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">ICF Generator</h1>
          <p className="mt-2 text-slate-600">
            AI-powered Informed Consent Form generation
          </p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">
            Sign in to continue
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedLandingPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">ICF Generator</h1>
          <p className="mt-2 text-slate-600">
            Welcome back, {user?.name}
          </p>
        </div>
        <div className="space-y-4">
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-4 font-medium text-white opacity-50 cursor-not-allowed"
            aria-disabled="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New Project
          </button>
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-4 font-medium text-slate-700 opacity-50 cursor-not-allowed"
            aria-disabled="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            Continue Saved Project
          </button>
        </div>
        <p className="text-center text-sm text-slate-500">
          These options will be enabled in later versions.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-violet-600" />
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedLandingPage />;
}
