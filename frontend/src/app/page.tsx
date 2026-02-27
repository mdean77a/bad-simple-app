"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { readProjectFile } from "@/lib/projectFile";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { checkHealth } from "@/lib/api";

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

function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "unavailable">("checking");

  useEffect(() => {
    checkHealth()
      .then(() => setStatus("connected"))
      .catch(() => setStatus("unavailable"));
  }, []);

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Checking backend...
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Backend connected
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Backend unavailable
    </div>
  );
}

function AuthenticatedLandingPage() {
  const { user } = useAuth();
  const { loadProject } = useProject();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadError(null);

    try {
      const { project, warnings } = await readProjectFile(file);

      if (warnings?.length) {
        window.alert(warnings.join("\n"));
      }

      loadProject(project);

      if (project.outline) {
        router.push(`/projects/${encodeURIComponent(project.protocolId)}`);
      } else {
        router.push(`/projects/${encodeURIComponent(project.protocolId)}/outline`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Invalid project file");
    } finally {
      // Reset so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader title="ICF Generator" />
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.name}
            </h2>
            <p className="mt-2 text-slate-600">
              What would you like to do?
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/projects/new"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-4 font-medium text-white hover:bg-violet-700"
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
            </Link>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-4 font-medium text-slate-700 hover:bg-slate-50"
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="file-input"
            />
          </div>
          {loadError && (
            <p className="text-center text-sm text-red-600" role="alert">
              {loadError}
            </p>
          )}
          <div className="flex justify-center">
            <BackendStatus />
          </div>
        </div>
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
