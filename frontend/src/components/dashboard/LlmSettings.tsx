"use client";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  local: "Local (LM Studio)",
};

interface LlmSettingsProps {
  provider: string;
  model: string;
  providers: string[];
  models: Record<string, string[]>;
  onChange: (provider: string, model: string) => void;
}

export function LlmSettings({
  provider,
  model,
  providers,
  models,
  onChange,
}: LlmSettingsProps) {
  const isLocal = provider === "local";
  const providerModels = models[provider] ?? [];
  const showStale = !isLocal && model && !providerModels.includes(model);
  const displayedModels = showStale
    ? [model, ...providerModels]
    : providerModels;

  const handleProviderChange = (newProvider: string) => {
    if (newProvider === "local") {
      onChange(newProvider, "");
      return;
    }
    const newModels = models[newProvider] ?? [];
    const newModel = newModels.length > 0 ? newModels[0] : "";
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
      ) : displayedModels.length > 0 ? (
        <label className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">Model</span>
          <select
            value={model}
            onChange={(e) => onChange(provider, e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800"
            data-testid="model-select"
          >
            {displayedModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="text-slate-500 italic">
          No models available for this provider
        </span>
      )}
    </div>
  );
}
