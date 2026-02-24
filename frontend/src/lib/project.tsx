"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { OutlineSection } from "@/lib/api";
import type {
  ProjectState,
  ConfirmedOutline,
  SectionState,
} from "@/types/project";

type ProjectAction =
  | {
      type: "CONFIRM_OUTLINE";
      payload: {
        protocolId: string;
        outline: ConfirmedOutline;
        sections: SectionState[];
      };
    }
  | {
      type: "CACHE_GENERATED_OUTLINE";
      payload: {
        protocolId: string;
        sections: OutlineSection[];
        checkedState: Record<string, boolean>;
      };
    }
  | {
      type: "UPDATE_CHECKED_STATE";
      payload: Record<string, boolean>;
    }
  | {
      type: "UPDATE_SECTION";
      payload: { id: string; updates: Partial<SectionState> };
    }
  | { type: "UNCONFIRM_OUTLINE" }
  | { type: "RESET" };

const initialState: ProjectState = {
  protocolId: "",
  protocolName: "",
  outline: null,
  sections: [],
  generatedOutline: null,
};

function projectReducer(
  state: ProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    case "CONFIRM_OUTLINE":
      return {
        ...state,
        protocolId: action.payload.protocolId,
        outline: action.payload.outline,
        sections: action.payload.sections,
      };
    case "CACHE_GENERATED_OUTLINE":
      return {
        ...state,
        protocolId: action.payload.protocolId,
        generatedOutline: {
          protocolId: action.payload.protocolId,
          sections: action.payload.sections,
          checkedState: action.payload.checkedState,
        },
      };
    case "UPDATE_CHECKED_STATE":
      return {
        ...state,
        generatedOutline: state.generatedOutline
          ? { ...state.generatedOutline, checkedState: action.payload }
          : null,
      };
    case "UPDATE_SECTION":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.id
            ? { ...s, ...action.payload.updates }
            : s
        ),
      };
    case "UNCONFIRM_OUTLINE":
      return {
        ...state,
        outline: null,
        sections: [],
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface ProjectContextType {
  project: ProjectState;
  confirmOutline: (
    protocolId: string,
    outline: ConfirmedOutline,
    sections: SectionState[]
  ) => void;
  cacheGeneratedOutline: (
    protocolId: string,
    sections: OutlineSection[],
    checkedState: Record<string, boolean>
  ) => void;
  updateSection: (id: string, updates: Partial<SectionState>) => void;
  updateCheckedState: (checkedState: Record<string, boolean>) => void;
  unconfirmOutline: () => void;
  resetProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, dispatch] = useReducer(projectReducer, initialState);

  const confirmOutline = (
    protocolId: string,
    outline: ConfirmedOutline,
    sections: SectionState[]
  ) => {
    dispatch({
      type: "CONFIRM_OUTLINE",
      payload: { protocolId, outline, sections },
    });
  };

  const updateSection = (id: string, updates: Partial<SectionState>) => {
    dispatch({ type: "UPDATE_SECTION", payload: { id, updates } });
  };

  const cacheGeneratedOutline = (
    protocolId: string,
    sections: OutlineSection[],
    checkedState: Record<string, boolean>
  ) => {
    dispatch({
      type: "CACHE_GENERATED_OUTLINE",
      payload: { protocolId, sections, checkedState },
    });
  };

  const updateCheckedState = (checkedState: Record<string, boolean>) => {
    dispatch({ type: "UPDATE_CHECKED_STATE", payload: checkedState });
  };

  const unconfirmOutline = () => {
    dispatch({ type: "UNCONFIRM_OUTLINE" });
  };

  const resetProject = () => {
    dispatch({ type: "RESET" });
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        confirmOutline,
        updateSection,
        cacheGeneratedOutline,
        updateCheckedState,
        unconfirmOutline,
        resetProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
