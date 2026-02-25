"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { RegenerateModal } from "@/components/dashboard/RegenerateModal";
import { useSectionStreaming } from "@/hooks/useSectionStreaming";
import { streamSectionRegenerate } from "@/lib/sse";
import type { SectionState, SectionStatus } from "@/types/project";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { project, unconfirmOutline, updateSection } = useProject();

  // Track previous status for cancel restoration
  const prevStatusRef = useRef<Record<string, SectionStatus>>({});

  // Regenerate modal state
  const [regenSection, setRegenSection] = useState<SectionState | null>(null);
  const regenAbortRef = useRef<AbortController | null>(null);
  const updateSectionRef = useRef(updateSection);
  updateSectionRef.current = updateSection;

  const handleApprove = (sectionId: string) => {
    if (!user) return;
    updateSection(sectionId, {
      status: "approved",
      approval: {
        userName: user.name,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleEdit = (sectionId: string) => {
    const section = project.sections.find((s) => s.id === sectionId);
    if (section) {
      prevStatusRef.current[sectionId] = section.status;
    }
    updateSection(sectionId, { status: "editing" });
  };

  const handleSave = (sectionId: string, newContent: string) => {
    updateSection(sectionId, {
      status: "edited",
      content: newContent,
      approval: undefined,
    });
    delete prevStatusRef.current[sectionId];
  };

  const handleCancel = (sectionId: string) => {
    const previousStatus = prevStatusRef.current[sectionId] || "ready";
    updateSection(sectionId, { status: previousStatus });
    delete prevStatusRef.current[sectionId];
  };

  const handleRegenerateSubmit = useCallback(
    (guidance: string) => {
      if (!regenSection || !project.protocolId) return;

      const section = regenSection;
      setRegenSection(null);

      updateSectionRef.current(section.id, {
        status: "generating",
        content: "",
        approval: undefined,
      });

      const controller = new AbortController();
      regenAbortRef.current = controller;
      let contentAccum = "";

      (async () => {
        try {
          for await (const event of streamSectionRegenerate(
            project.protocolId,
            section.id,
            section.name,
            section.content,
            guidance || null,
            controller.signal,
          )) {
            switch (event.event) {
              case "section_chunk":
                contentAccum += event.content;
                updateSectionRef.current(event.sectionId, {
                  content: contentAccum,
                });
                break;
              case "section_complete":
                updateSectionRef.current(event.sectionId, { status: "ready" });
                break;
              case "section_error":
                updateSectionRef.current(event.sectionId, {
                  status: "error",
                  content: event.message,
                });
                break;
            }
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          updateSectionRef.current(section.id, {
            status: "error",
            content: String(err),
          });
        }
      })();
    },
    [regenSection, project.protocolId],
  );

  useSectionStreaming();
  const router = useRouter();
  const params = useParams();
  const protocolId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || !project.outline) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader
        title="Section Dashboard"
        showBack
        backLabel="Change Outline"
        onBack={() => {
          unconfirmOutline();
          router.push(`/projects/${protocolId}/outline`);
        }}
      />
      <ActionBar />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {project.sections.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500">
                No sections in this outline.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {project.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onApprove={() => handleApprove(section.id)}
                  onEdit={() => handleEdit(section.id)}
                  onSave={(content) => handleSave(section.id, content)}
                  onCancel={() => handleCancel(section.id)}
                  onRegenerate={() => setRegenSection(section)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <RegenerateModal
        sectionName={regenSection?.name ?? ""}
        isOpen={regenSection !== null}
        onClose={() => setRegenSection(null)}
        onSubmit={handleRegenerateSubmit}
      />
    </div>
  );
}
