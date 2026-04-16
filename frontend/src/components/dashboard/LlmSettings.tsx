"use client";

export const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6"],
  openai: ["gpt-5.1", "gpt-5.1-mini-2025-04-14"],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  local: "Local (LM Studio)",
};

interface LlmSettingsProps {
  provider: string;
  model: string;
  providers: string[];
  onChange: (provider: string, model: string) => void;
}

export function LlmSettings({
  provider,
  model,
  providers,
  onChange,
}: LlmSettingsProps) {
  const models = PROVIDER_MODELS[provider];
  const isLocal = provider === "local";

  const handleProviderChange = (newProvider: string) => {
    const newModels = PROVIDER_MODELS[newProvider];
    const newModel = newModels && newModels.length > 0 ? newModels[0] : "";
    onChange(newProvider, newModel);
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
      <label className="flex items-center gap-2 text-slate-600">
        <span className="font-medium">Provider</span>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800"
          data-testid="provider-select"
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p] ?? p}
            </option>
          ))}
        </select>
      </label>

      {isLocal ? (
        <span className="text-slate-500 italic">
          Uses whatever model LM Studio is serving
        </span>
      ) : models ? (
        <label className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">Model</span>
          <select
            value={model}
            onChange={(e) => onChange(provider, e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800"
            data-testid="model-select"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
