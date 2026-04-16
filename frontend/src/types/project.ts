import type { OutlineSection } from "@/lib/api";

export type SectionStatus =
  | "generating"
  | "regenerating"
  | "ready"
  | "editing"
  | "edited"
  | "approved"
  | "error";

export interface SectionApproval {
  userName: string;
  userEmail: string;
  timestamp: string;
}

export interface SectionState {
  id: string;
  name: string;
  content: string;
  status: SectionStatus;
  originalPrompt: string;
  approval?: SectionApproval;
  category?: "standard" | "conditional" | "signature";
}

export interface ConfirmedOutline {
  sections: string[];
  confirmedAt: string;
  confirmedBy: {
    name: string;
    email: string;
  };
}

export interface GeneratedOutlineCache {
  protocolId: string;
  sections: OutlineSection[];
  checkedState: Record<string, boolean>;
}

export interface ProjectState {
  protocolId: string;
  protocolName: string;
  outline: ConfirmedOutline | null;
  sections: SectionState[];
  generatedOutline: GeneratedOutlineCache | null;
  llmProvider: string;
  llmModel: string;
}

// ---------------------------------------------------------------------------
// Project File (persistence format)
// ---------------------------------------------------------------------------

export type PersistableStatus = "ready" | "edited" | "approved";

export interface ProjectFileSection {
  id: string;
  name: string;
  content: string;
  status: PersistableStatus;
  originalPrompt: string;
  approval?: SectionApproval;
  category?: "standard" | "conditional" | "signature";
}

export interface ProjectFileOutline {
  sections: string[];
  confirmedAt: string;
  confirmedBy: { name: string; email: string };
}

export interface ProjectFile {
  protocolId: string;
  protocolName: string;
  createdAt: string;
  lastModifiedAt: string;
  outline?: ProjectFileOutline;
  sections: ProjectFileSection[];
  llmProvider?: string;
  llmModel?: string;
  [key: string]: unknown; // forward compatibility — preserve unknown fields
}
