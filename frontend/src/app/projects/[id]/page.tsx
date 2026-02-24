"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { PageHeader } from "@/components/layout/PageHeader";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { project, unconfirmOutline } = useProject();
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
      <div className="flex flex-1 flex-col items-center px-4 pt-12">
        <div className="w-full max-w-3xl">
          <div className="space-y-3">
            {project.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">
                    {section.name}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {section.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
