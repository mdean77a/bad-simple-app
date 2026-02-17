"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { OutlineChecklist } from "@/components/outline/OutlineChecklist";
import { generateOutline, ApiError, OutlineSection } from "@/lib/api";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; sections: OutlineSection[] };

export default function OutlinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const protocolId = params.id as string;
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const loadOutline = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const result = await generateOutline(protocolId);
      const initial: Record<string, boolean> = {};
      result.sections.forEach((s) => {
        initial[s.sectionName] = s.defaultChecked;
      });
      setCheckedState(initial);
      setState({ status: "loaded", sections: result.sections });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail
          : "Failed to generate outline. Please try again.";
      setState({ status: "error", message });
    }
  }, [protocolId]);

  useEffect(() => {
    if (user && protocolId) {
      loadOutline();
    }
  }, [user, protocolId, loadOutline]);

  const handleToggle = useCallback((sectionName: string) => {
    setCheckedState((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader
        title="Review Outline"
        showBack
        onBack={() => router.push("/projects/new")}
      />
      <div className="flex flex-1 flex-col items-center px-4 pt-12">
        <div className="w-full max-w-lg">
          {state.status === "loading" && (
            <div className="flex flex-col items-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
              <p className="mt-4 text-sm font-medium text-violet-700">
                Generating outline...
              </p>
            </div>
          )}
          {state.status === "error" && (
            <div className="flex flex-col items-center rounded-xl border-2 border-red-300 bg-red-50 p-8">
              <p className="text-sm text-red-700" aria-live="assertive">
                {state.message}
              </p>
              <button
                onClick={loadOutline}
                className="mt-4 rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          {state.status === "loaded" && (
            <OutlineChecklist
              sections={state.sections}
              checkedState={checkedState}
              onToggle={handleToggle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
