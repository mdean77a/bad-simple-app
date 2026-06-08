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
import { exportDocument } from "@/lib/api";
import type { ExportFormat } from "@/lib/api";
import { streamSectionRegenerate } from "@/lib/sse";
import { downloadProjectFile } from "@/lib/projectFile";
import type { SectionApproval, SectionState, SectionStatus } from "@/types/project";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { project, unconfirmOutline, updateSection } = useProject();

  // Track previous status and approval for cancel restoration
  const prevStatusRef = useRef<Record<string, { status: SectionStatus; approval?: SectionApproval }>>({});

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
      prevStatusRef.current[sectionId] = {
        status: section.status,
        approval: section.approval,
      };
    }
    updateSection(sectionId, { status: "editing", approval: undefined });
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
    const prev = prevStatusRef.current[sectionId];
    updateSection(sectionId, {
      status: prev?.status || "ready",
      approval: prev?.approval,
    });
    delete prevStatusRef.current[sectionId];
  };

  const handleApproveAll = () => {
    if (!user) return;
    const now = new Date().toISOString();
    for (const section of project.sections) {
      if (section.status === "ready" || section.status === "edited") {
        updateSection(section.id, {
          status: "approved",
          approval: {
            userName: user.name,
            userEmail: user.email,
            timestamp: now,
          },
        });
      }
    }
  };

  const handleSaveProject = useCallback(() => {
    downloadProjectFile(project);
  }, [project]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const protocolName = project.protocolName || project.protocolId;
      const sections = project.sections.map((s) => ({
        id: s.id,
        name: s.name,
        content: s.content,
      }));
      const approvals = project.sections
        .filter((s) => s.approval)
        .map((s) => ({
          sectionId: s.id,
          userName: s.approval!.userName,
          userEmail: s.approval!.userEmail,
          timestamp: s.approval!.timestamp,
        }));

      const filename = `${protocolName}_ICF.${format}`;

      try {
        const blob = await exportDocument(
          sections,
          approvals,
          format,
          protocolName,
          project.llmProvider,
          project.llmModel,
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToast({ message: `Downloaded ${filename}`, type: "success" });
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : "Export failed",
          type: "error",
        });
      }
    },
    [project],
  );

  const handleRegenerateSubmit = useCallback(
    (guidance: string) => {
      if (!regenSection || !project.protocolId) return;

      const section = regenSection;
      setRegenSection(null);

      updateSectionRef.current(section.id, {
        status: "regenerating",
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
            project.llmProvider,
            project.llmModel,
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

  useSectionStreaming(project.llmProvider, project.llmModel);
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
      <ActionBar sections={project.sections} onApproveAll={handleApproveAll} onSaveProject={handleSaveProject} onExport={handleExport} />
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
                  onRegenerate={!section.category || section.category === "standard" ? () => setRegenSection(section) : undefined}
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
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
