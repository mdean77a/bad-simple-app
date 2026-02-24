import type { OutlineSection } from "@/lib/api";

export type SectionStatus =
  | "generating"
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
}
