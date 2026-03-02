"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { OutlineChecklist } from "@/components/outline/OutlineChecklist";
import { ConfirmButton } from "@/components/outline/ConfirmButton";
import { generateOutline, ApiError, OutlineSection } from "@/lib/api";
import type { SectionState } from "@/types/project";

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; sections: OutlineSection[] };

export default function OutlinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { project, confirmOutline, cacheGeneratedOutline, updateCheckedState } =
    useProject();
  const router = useRouter();
  const params = useParams();
  const protocolId = params.id as string;

  const cached =
    project.generatedOutline?.protocolId === protocolId
      ? project.generatedOutline
      : null;

  const [state, setState] = useState<PageState>(() =>
    cached
      ? { status: "loaded", sections: cached.sections }
      : { status: "loading" }
  );
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    () => cached?.checkedState ?? {}
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
      cacheGeneratedOutline(protocolId, result.sections, initial);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail
          : "Failed to generate outline. Please try again.";
      setState({ status: "error", message });
    }
  }, [protocolId, cacheGeneratedOutline]);

  useEffect(() => {
    if (user && protocolId && !cached) {
      loadOutline();
    }
  }, [user, protocolId, loadOutline, cached]);

  const handleToggle = useCallback(
    (sectionName: string) => {
      setCheckedState((prev) => {
        const next = { ...prev, [sectionName]: !prev[sectionName] };
        // Schedule context update outside of React's render cycle
        queueMicrotask(() => updateCheckedState(next));
        return next;
      });
    },
    [updateCheckedState]
  );

  const hasAnyChecked = useMemo(
    () => Object.values(checkedState).some(Boolean),
    [checkedState]
  );

  const handleConfirm = useCallback(() => {
    if (!user || state.status !== "loaded") return;

    const selectedSections = state.sections
      .filter((s) => checkedState[s.sectionName])
      .map((s) => s.sectionName);

    const outline = {
      sections: selectedSections,
      confirmedAt: new Date().toISOString(),
      confirmedBy: { name: user.name, email: user.email },
    };

    const sections: SectionState[] = selectedSections.map((name) => {
      const outlineSection = state.sections.find((s) => s.sectionName === name);
      return {
        id: crypto.randomUUID(),
        name,
        content: "",
        status: "generating" as const,
        originalPrompt: "",
        category: outlineSection?.category ?? "standard",
      };
    });

    confirmOutline(protocolId, outline, sections);
    router.push(`/projects/${protocolId}`);
  }, [user, state, checkedState, protocolId, confirmOutline, router]);

  if (authLoading || !user) {
    return null;
  }

  const isLoading = state.status === "loading";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader
        title="Review Outline"
        showBack
        backLabel="Select Protocol"
        onBack={() => router.push("/projects/new")}
      />
      <div className="flex flex-1 flex-col items-center px-4 pt-12">
        <div className="w-full max-w-4xl">
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
            <>
              <OutlineChecklist
                sections={state.sections}
                checkedState={checkedState}
                onToggle={handleToggle}
              />
              <ConfirmButton
                disabled={isLoading || !hasAnyChecked}
                hasNoSelections={!hasAnyChecked}
                onClick={handleConfirm}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
