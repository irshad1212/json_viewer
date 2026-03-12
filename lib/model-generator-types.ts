export type ModelLanguage =
  | "typescript"
  | "typescript-effect-schema"
  | "typescript-zod"
  | "dart"
  | "go"
  | "swift"
  | "kotlin";

export type ModelOptionType = "boolean" | "string" | "enum";
export type ModelOptionKind = "primary" | "secondary" | "cli";
export type ModelOptionValue = boolean | string;

export type RendererOptionsState = Record<string, ModelOptionValue>;
export type RendererOptionsByLanguage = Record<ModelLanguage, RendererOptionsState>;

export type InferenceOptionName =
  | "allPropertiesOptional"
  | "alphabetizeProperties"
  | "inferEnums"
  | "inferDateTimes"
  | "inferIntegerStrings"
  | "inferBooleanStrings"
  | "inferMaps";

export type InferenceOptionsState = Record<InferenceOptionName, boolean>;

export type ModelSettingOption = {
  name: string;
  label: string;
  optionType: ModelOptionType;
  defaultValue: ModelOptionValue;
  kind: ModelOptionKind;
  enumValues?: Array<{
    value: string;
    label: string;
  }>;
  typeLabel?: string;
};

export type ModelLanguageSettings = {
  value: ModelLanguage;
  label: string;
  extension: string;
  options: ModelSettingOption[];
};

export type InferenceOption = {
  name: InferenceOptionName;
  label: string;
  description: string;
  defaultValue: boolean;
};

export type ModelSettingsResponse = {
  languages: ModelLanguageSettings[];
  inferenceOptions: InferenceOption[];
};

export const MODEL_LANGUAGE_FALLBACKS: Array<{
  value: ModelLanguage;
  label: string;
}> = [
  { value: "typescript", label: "TypeScript" },
  { value: "typescript-effect-schema", label: "TypeScript Effect Schema" },
  { value: "typescript-zod", label: "TypeScript Zod" },
  { value: "dart", label: "Dart" },
  { value: "go", label: "Go" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" }
];

export const DEFAULT_INFERENCE_OPTIONS: InferenceOption[] = [
  {
    name: "allPropertiesOptional",
    label: "All properties optional",
    description: "Treat every generated property as optional.",
    defaultValue: false
  },
  {
    name: "alphabetizeProperties",
    label: "Alphabetize properties",
    description: "Sort generated properties alphabetically.",
    defaultValue: false
  },
  {
    name: "inferEnums",
    label: "Infer enums",
    description: "Turn repeated string literals into enums when possible.",
    defaultValue: true
  },
  {
    name: "inferDateTimes",
    label: "Infer date/time strings",
    description: "Detect ISO-style date and datetime strings.",
    defaultValue: true
  },
  {
    name: "inferIntegerStrings",
    label: "Infer integer strings",
    description: "Treat numeric-looking strings as integers when possible.",
    defaultValue: true
  },
  {
    name: "inferBooleanStrings",
    label: "Infer boolean strings",
    description: "Treat true/false-like strings as booleans when possible.",
    defaultValue: true
  },
  {
    name: "inferMaps",
    label: "Infer maps",
    description: "Detect dictionary-like objects and model them as maps.",
    defaultValue: true
  }
];

export function createEmptyRendererOptionsByLanguage(): RendererOptionsByLanguage {
  return MODEL_LANGUAGE_FALLBACKS.reduce((acc, language) => {
    acc[language.value] = {};
    return acc;
  }, {} as RendererOptionsByLanguage);
}

export function createDefaultRendererOptionsByLanguage(
  languages: readonly Pick<ModelLanguageSettings, "value" | "options">[]
): RendererOptionsByLanguage {
  const next = createEmptyRendererOptionsByLanguage();

  for (const language of languages) {
    next[language.value] = language.options.reduce<RendererOptionsState>((acc, option) => {
      acc[option.name] = option.defaultValue;
      return acc;
    }, {});
  }

  return next;
}

export function mergeRendererOptionsByLanguage(
  defaults: RendererOptionsByLanguage,
  current: Partial<RendererOptionsByLanguage>
): RendererOptionsByLanguage {
  const next = createEmptyRendererOptionsByLanguage();

  for (const language of MODEL_LANGUAGE_FALLBACKS) {
    next[language.value] = {
      ...(defaults[language.value] ?? {}),
      ...(current[language.value] ?? {})
    };
  }

  return next;
}

export function cloneRendererOptionsByLanguage(
  current: Partial<RendererOptionsByLanguage>
): RendererOptionsByLanguage {
  return mergeRendererOptionsByLanguage(createEmptyRendererOptionsByLanguage(), current);
}

export function createDefaultInferenceOptions(
  options: readonly InferenceOption[] = DEFAULT_INFERENCE_OPTIONS
): InferenceOptionsState {
  return options.reduce((acc, option) => {
    acc[option.name] = option.defaultValue;
    return acc;
  }, {} as InferenceOptionsState);
}

export function cloneInferenceOptions(
  current: Partial<InferenceOptionsState>
): InferenceOptionsState {
  return {
    ...createDefaultInferenceOptions(),
    ...current
  };
}
