"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { useSectionStreaming } from "@/hooks/useSectionStreaming";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { project, unconfirmOutline, updateSection } = useProject();

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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
