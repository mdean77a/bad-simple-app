"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project";
import { fetchProviders } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtocolUpload } from "@/components/projects/ProtocolUpload";
import { ProtocolSelect } from "@/components/projects/ProtocolSelect";
import { LlmSettings } from "@/components/dashboard/LlmSettings";

export default function NewProjectPage() {
  const { user, isLoading } = useAuth();
  const { project, setProtocol, setLlm } = useProject();
  const [providers, setProviders] = useState<string[]>(["anthropic"]);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const [hasFileSelected, setHasFileSelected] = useState(false);
  const [uploadedProtocolId, setUploadedProtocolId] = useState<string | null>(
    null
  );
  const [uploadedProtocolName, setUploadedProtocolName] = useState<string | null>(
    null
  );
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(
    null
  );
  const [selectedProtocolName, setSelectedProtocolName] = useState<string | null>(
    null
  );

  const activeProtocolId = uploadedProtocolId || selectedProtocolId;
  const activeProtocolName = uploadedProtocolName || selectedProtocolName;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    fetchProviders().then((result) => {
      setProviders(result.providers);
      setModels(result.models);
    });
  }, []);

  const handleUploadSuccess = useCallback((protocolId: string, protocolName: string) => {
    setUploadedProtocolId(protocolId);
    setUploadedProtocolName(protocolName);
  }, []);

  const handleSelectionChange = useCallback(
    (protocolId: string | null, protocolName: string | null) => {
      setSelectedProtocolId(protocolId);
      setSelectedProtocolName(protocolName);
    },
    []
  );

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader
        title="Select Protocol"
        showBack
        backLabel="Home"
        onBack={() => router.push("/")}
      />
      <div className="flex flex-1 flex-col items-center px-4 pt-12">
        <div className="w-full max-w-lg space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Upload New Protocol
            </h2>
            <ProtocolUpload
              disabled={selectedProtocolId !== null}
              onFileChange={setHasFileSelected}
              onUploadSuccess={handleUploadSuccess}
            />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Or Select Existing Protocol
            </h2>
            <ProtocolSelect
              disabled={hasFileSelected}
              onSelectionChange={handleSelectionChange}
            />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              AI Provider
            </h2>
            <LlmSettings
              provider={project.llmProvider}
              model={project.llmModel}
              providers={providers}
              models={models}
              onChange={(p, m) => setLlm(p, m)}
            />
          </section>
          <button
            disabled={!activeProtocolId}
            onClick={() => {
              if (activeProtocolId) {
                setProtocol(activeProtocolId, activeProtocolName ?? "");
                router.push(
                  `/projects/${encodeURIComponent(activeProtocolId)}/outline`
                );
              }
            }}
            className={`w-full rounded-lg px-6 py-2.5 font-medium text-white ${
              activeProtocolId
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-violet-300 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
