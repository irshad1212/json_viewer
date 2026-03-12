"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Check, ChevronDown, Loader2, Settings2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  DEFAULT_INFERENCE_OPTIONS,
  MODEL_LANGUAGE_FALLBACKS,
  cloneInferenceOptions,
  cloneRendererOptionsByLanguage,
  createDefaultInferenceOptions,
  createDefaultRendererOptionsByLanguage,
  createEmptyRendererOptionsByLanguage,
  mergeRendererOptionsByLanguage,
  type InferenceOptionsState,
  type ModelLanguage,
  type ModelSettingOption,
  type ModelSettingsResponse,
  type RendererOptionsByLanguage
} from "@/lib/model-generator-types";
import { cn } from "@/lib/utils";

const SAMPLE_JSON = {
  user: {
    id: "USR-9921",
    name: "Alex Rivers",
    email: "alex.rivers@example.com",
    active: true,
    created_at: "2024-03-21T08:15:22Z",
    tags: ["beta", "admin"],
    address: {
      street: "123 Silicon Valley Way",
      city: "Neural City",
      state: "CA",
      zip: "94000"
    }
  }
};

const FALLBACK_LANGUAGE_SETTINGS = MODEL_LANGUAGE_FALLBACKS.map((language) => ({
  ...language,
  extension: "",
  options: [] as ModelSettingOption[]
}));

type ModelFormState = {
  typeName: string;
  language: ModelLanguage;
  inferenceOptions: InferenceOptionsState;
  rendererOptionsByLanguage: RendererOptionsByLanguage;
};

function createInitialFormState(): ModelFormState {
  return {
    typeName: "Root",
    language: "typescript",
    inferenceOptions: createDefaultInferenceOptions(),
    rendererOptionsByLanguage: createEmptyRendererOptionsByLanguage()
  };
}

function cloneFormState(state: ModelFormState): ModelFormState {
  return {
    typeName: state.typeName,
    language: state.language,
    inferenceOptions: cloneInferenceOptions(state.inferenceOptions),
    rendererOptionsByLanguage: cloneRendererOptionsByLanguage(state.rendererOptionsByLanguage)
  };
}

function getOutputEditorLanguage(language: ModelLanguage): string {
  if (language === "typescript-effect-schema" || language === "typescript-zod") {
    return "typescript";
  }

  return language;
}

export default function ModelPage() {
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_JSON, null, 2));
  const [code, setCode] = useState("");
  const [settingsMeta, setSettingsMeta] = useState<ModelSettingsResponse | null>(null);
  const [settingsLoadError, setSettingsLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ModelFormState>(() => createInitialFormState());
  const [temp, setTemp] = useState<ModelFormState>(() => createInitialFormState());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event: MediaQueryListEvent) => setIsDark(event.matches);

    setIsDark(media.matches);
    media.addEventListener("change", handleThemeChange);

    return () => media.removeEventListener("change", handleThemeChange);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadQuicktypeSettings = async () => {
      try {
        const response = await fetch("/api/generate-model", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load quicktype settings.");
        }

        const payload = (await response.json()) as ModelSettingsResponse;
        if (ignore) {
          return;
        }

        setSettingsMeta(payload);
        setSettingsLoadError(null);

        const rendererDefaults = createDefaultRendererOptionsByLanguage(payload.languages);
        const inferenceDefaults = createDefaultInferenceOptions(payload.inferenceOptions);

        setSettings((prev) => ({
          ...prev,
          inferenceOptions: {
            ...inferenceDefaults,
            ...prev.inferenceOptions
          },
          rendererOptionsByLanguage: mergeRendererOptionsByLanguage(
            rendererDefaults,
            prev.rendererOptionsByLanguage
          )
        }));

        setTemp((prev) => ({
          ...prev,
          inferenceOptions: {
            ...inferenceDefaults,
            ...prev.inferenceOptions
          },
          rendererOptionsByLanguage: mergeRendererOptionsByLanguage(
            rendererDefaults,
            prev.rendererOptionsByLanguage
          )
        }));
      } catch (loadError: unknown) {
        if (ignore) {
          return;
        }

        console.error("Failed to load quicktype settings", loadError);
        setSettingsLoadError("Failed to load quicktype settings.");
      }
    };

    void loadQuicktypeSettings();

    return () => {
      ignore = true;
    };
  }, []);

  const editorTheme = useMemo(() => (isDark ? "app-dark" : "app-light"), [isDark]);

  const languageOptions = settingsMeta?.languages ?? FALLBACK_LANGUAGE_SETTINGS;
  const inferenceOptions = settingsMeta?.inferenceOptions ?? DEFAULT_INFERENCE_OPTIONS;
  const defaultFormState = useMemo<ModelFormState>(
    () => ({
      typeName: "Root",
      language: "typescript",
      inferenceOptions: createDefaultInferenceOptions(inferenceOptions),
      rendererOptionsByLanguage: createDefaultRendererOptionsByLanguage(languageOptions)
    }),
    [inferenceOptions, languageOptions]
  );
  const currentLanguage =
    languageOptions.find((option) => option.value === settings.language) ?? languageOptions[0];
  const tempLanguage =
    languageOptions.find((option) => option.value === temp.language) ?? languageOptions[0];
  const hasCustomSettings = useMemo(() => {
    const inferenceOverrides = inferenceOptions.some(
      (option) => settings.inferenceOptions[option.name] !== option.defaultValue
    );

    if (inferenceOverrides) {
      return true;
    }

    return languageOptions.some((language) =>
      language.options.some((option) => {
        const value = settings.rendererOptionsByLanguage[language.value]?.[option.name];
        return value !== undefined && value !== option.defaultValue;
      })
    );
  }, [inferenceOptions, languageOptions, settings.inferenceOptions, settings.rendererOptionsByLanguage]);
  const visibleTempRendererOptions = (tempLanguage?.options ?? []).filter(
    (option) => option.kind !== "cli"
  );
  const primaryTempRendererOptions = visibleTempRendererOptions.filter(
    (option) => option.kind === "primary"
  );
  const secondaryTempRendererOptions = visibleTempRendererOptions.filter(
    (option) => option.kind === "secondary"
  );
  const outputEditorLanguage = getOutputEditorLanguage(settings.language);

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (open) {
      setTemp(cloneFormState(settings));
    }
  };

  const updateTempRendererOption = (optionName: string, value: boolean | string) => {
    setTemp((prev) => ({
      ...prev,
      rendererOptionsByLanguage: {
        ...prev.rendererOptionsByLanguage,
        [prev.language]: {
          ...(prev.rendererOptionsByLanguage[prev.language] ?? {}),
          [optionName]: value
        }
      }
    }));
  };

  const applySettings = () => {
    const nextSettings = cloneFormState(temp);
    nextSettings.typeName = nextSettings.typeName.trim() || "Root";
    setSettings(nextSettings);
    setSheetOpen(false);
  };

  const resetSettings = () => {
    setTemp(cloneFormState(defaultFormState));
  };

  const handleGenerate = async () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON to generate models.");
      return;
    }

    try {
      JSON.parse(jsonText);
    } catch {
      setError("Invalid JSON. Fix it and try again.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: jsonText,
          language: settings.language,
          typeName: settings.typeName.trim() || "Root",
          options: {
            rendererOptions: settings.rendererOptionsByLanguage[settings.language] ?? {},
            ...settings.inferenceOptions
          }
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate model.");
      }

      const nextCode: string = payload?.code || payload?.lines?.join?.("\n") || "";
      setCode(nextCode);
    } catch (generationError: unknown) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate model.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderRendererOptionField = (option: ModelSettingOption) => {
    const value =
      temp.rendererOptionsByLanguage[temp.language]?.[option.name] ?? option.defaultValue;

    if (option.optionType === "boolean") {
      return (
        <label
          key={option.name}
          className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3"
        >
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => updateTempRendererOption(option.name, Boolean(checked))}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium leading-snug">{option.label}</span>
            <span className="block text-[11px] text-muted-foreground">{option.name}</span>
          </span>
        </label>
      );
    }

    if (option.optionType === "string") {
      return (
        <div key={option.name} className="grid gap-2 rounded-md border border-border/60 bg-muted/10 p-3">
          <Label className="text-sm font-medium">{option.label}</Label>
          <Input
            value={String(value)}
            onChange={(event) => updateTempRendererOption(option.name, event.target.value)}
            placeholder={option.typeLabel || option.name}
          />
          <p className="text-[11px] text-muted-foreground">{option.name}</p>
        </div>
      );
    }

    const selectedValue = String(value);
    return (
      <div key={option.name} className="grid gap-2 rounded-md border border-border/60 bg-muted/10 p-3">
        <Label className="text-sm font-medium">{option.label}</Label>
        <div className="relative">
          <select
            value={selectedValue}
            onChange={(event) => updateTempRendererOption(option.name, event.target.value)}
            className="h-10 w-full appearance-none rounded-md border border-input bg-transparent px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {option.enumValues?.map((entry) => (
              <option key={entry.value} value={entry.value} className="bg-popover text-popover-foreground">
                {entry.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <p className="text-[11px] text-muted-foreground">{option.name}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#040507] text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-[#0b0d11]/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-6">
          <div className="flex items-center gap-3 text-sm font-semibold">Generate Data Models</div>
          <span className="rounded-full border border-zinc-700/80 px-2 py-1 text-[11px] text-muted-foreground">
            Quicktype (local)
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full flex-1 min-h-0 flex-col gap-3 px-6 py-4 md:py-6">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800/80 bg-[#0d1016] px-3 py-3">
          <div className="flex w-[240px] flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Root type name</Label>
            <Input
              value={settings.typeName}
              onChange={(event) => setSettings((prev) => ({ ...prev, typeName: event.target.value }))}
              className="h-9 border-zinc-800 bg-[#0f131a] text-sm"
            />
          </div>

          <div className="flex w-[200px] flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Target language</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 w-full items-center justify-between rounded-md border border-zinc-800 bg-[#0f131a] px-3 text-sm">
                {currentLanguage?.label ?? settings.language}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[220px]">
                {languageOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={cn(
                      "flex items-center justify-between gap-3",
                      option.value === settings.language && "bg-muted"
                    )}
                    onClick={() => setSettings((prev) => ({ ...prev, language: option.value }))}
                  >
                    <span>{option.label}</span>
                    {option.value === settings.language ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" size="lg" className="relative h-9 text-sm">
                <Settings2 className="h-4 w-4" />
                Settings
                {hasCustomSettings ? (
                  <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 translate-x-1/3 -translate-y-1/3 rounded-full border-2 border-[#0b0d11] bg-emerald-400 shadow-sm" />
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Model Settings</SheetTitle>
                <SheetDescription>
                  Uses the bundled quicktype language definitions and inference flags.
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid auto-rows-min gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="sheet-type-name">Root type name</Label>
                    <Input
                      id="sheet-type-name"
                      value={temp.typeName}
                      onChange={(event) =>
                        setTemp((prev) => ({ ...prev, typeName: event.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label>Language</Label>
                    <div className="relative">
                      <select
                        value={temp.language}
                        onChange={(event) =>
                          setTemp((prev) => ({
                            ...prev,
                            language: event.target.value as ModelLanguage
                          }))
                        }
                        className="h-10 w-full appearance-none rounded-md border border-input bg-transparent px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {languageOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            className="bg-popover text-popover-foreground"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Language settings</h3>
                      <p className="text-xs text-muted-foreground">
                        Renderer options exposed by quicktype for {tempLanguage?.label ?? temp.language}.
                      </p>
                    </div>

                    {settingsLoadError ? (
                      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {settingsLoadError}
                      </div>
                    ) : null}

                    {!settingsMeta && !settingsLoadError ? (
                      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Loading quicktype settings...
                      </div>
                    ) : null}

                    {primaryTempRendererOptions.length > 0 ? (
                      <div className="grid gap-3">{primaryTempRendererOptions.map(renderRendererOptionField)}</div>
                    ) : null}

                    {secondaryTempRendererOptions.length > 0 ? (
                      <div className="grid gap-3">
                        <div>
                          <h4 className="text-sm font-semibold">Other</h4>
                          <span className="block text-[11px] text-muted-foreground">
                            Secondary quicktype options for this language.
                          </span>
                        </div>
                        <div className="grid gap-3">{secondaryTempRendererOptions.map(renderRendererOptionField)}</div>
                      </div>
                    ) : null}

                    {settingsMeta && visibleTempRendererOptions.length === 0 ? (
                      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        This language does not expose extra renderer options.
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Inference</h3>
                      <p className="text-xs text-muted-foreground">
                        Global quicktype inference flags applied before rendering.
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {inferenceOptions.map((option) => (
                        <label
                          key={option.name}
                          className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3"
                        >
                          <Checkbox
                            checked={temp.inferenceOptions[option.name]}
                            onCheckedChange={(checked) =>
                              setTemp((prev) => ({
                                ...prev,
                                inferenceOptions: {
                                  ...prev.inferenceOptions,
                                  [option.name]: Boolean(checked)
                                }
                              }))
                            }
                            className="mt-0.5"
                          />
                          <span className="space-y-1">
                            <span className="block text-sm font-medium leading-snug">{option.label}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="sticky bottom-0">
                <Button
                  variant="ghost"
                  className="sm:mr-auto hover:bg-red-500/10 hover:text-red-300"
                  onClick={resetSettings}
                >
                  Reset settings
                </Button>
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
                <Button onClick={applySettings}>Apply</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="h-9 px-4 text-sm">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid flex-1 min-h-[calc(100vh-140px)] grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0f131a] shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
              <span>JSON Input</span>
            </div>
            <Editor
              height="100%"
              language="json"
              theme={editorTheme}
              value={jsonText}
              onChange={(value) => setJsonText(value || "")}
              beforeMount={(monaco) => {
                monaco.editor.defineTheme("app-dark", {
                  base: "vs-dark",
                  inherit: true,
                  rules: [],
                  colors: {
                    "editor.background": "#0b0f16",
                    "editorGutter.background": "#0b0f16"
                  }
                });
                monaco.editor.defineTheme("app-light", {
                  base: "vs",
                  inherit: true,
                  rules: [],
                  colors: {
                    "editor.background": "#ffffff",
                    "editorGutter.background": "#ffffff"
                  }
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                lineNumbersMinChars: 3,
                automaticLayout: true,
                padding: { top: 12 }
              }}
              className="flex-1 min-h-0"
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0f131a] shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
              <span>Generated {currentLanguage?.label ?? settings.language} code</span>
              {code ? <CopyButton value={code} className="h-8 w-8" /> : null}
            </div>
            <Editor
              height="100%"
              language={outputEditorLanguage}
              theme={editorTheme}
              value={code || "// Generated code will appear here."}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                lineNumbersMinChars: 3,
                automaticLayout: true,
                padding: { top: 12 }
              }}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
