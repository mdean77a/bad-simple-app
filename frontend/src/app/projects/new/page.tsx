"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtocolUpload } from "@/components/projects/ProtocolUpload";
import { ProtocolSelect } from "@/components/projects/ProtocolSelect";

export default function NewProjectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [hasFileSelected, setHasFileSelected] = useState(false);
  const [uploadedProtocolId, setUploadedProtocolId] = useState<string | null>(
    null
  );
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(
    null
  );

  const activeProtocolId = uploadedProtocolId || selectedProtocolId;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const handleUploadSuccess = useCallback((protocolId: string) => {
    setUploadedProtocolId(protocolId);
  }, []);

  const handleSelectionChange = useCallback(
    (protocolId: string | null) => {
      setSelectedProtocolId(protocolId);
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
          <button
            disabled={!activeProtocolId}
            onClick={() => {
              if (activeProtocolId) {
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
