import "server-only";

import {
  getTargetLanguage,
  type OptionDefinition
} from "quicktype-core";

import {
  DEFAULT_INFERENCE_OPTIONS,
  MODEL_LANGUAGE_FALLBACKS,
  type ModelLanguage,
  type ModelOptionValue,
  type ModelSettingOption,
  type ModelSettingsResponse
} from "@/lib/model-generator-types";

function humanizeValue(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getDefaultOptionValue(definition: OptionDefinition<string, unknown>): ModelOptionValue {
  if (definition.optionType === "boolean") {
    return typeof definition.defaultValue === "boolean" ? definition.defaultValue : false;
  }

  if (typeof definition.defaultValue === "string") {
    return definition.defaultValue;
  }

  if (definition.optionType === "enum") {
    return Object.keys(definition.values ?? {})[0] ?? "";
  }

  return "";
}

function mapOptionDefinition(definition: OptionDefinition<string, unknown>): ModelSettingOption {
  return {
    name: definition.name,
    label: definition.description,
    optionType: definition.optionType,
    defaultValue: getDefaultOptionValue(definition),
    kind: definition.kind ?? "primary",
    typeLabel: definition.typeLabel,
    enumValues:
      definition.optionType === "enum"
        ? Object.keys(definition.values ?? {}).map((value) => ({
            value,
            label: humanizeValue(value)
          }))
        : undefined
  };
}

export function getModelSettingsResponse(): ModelSettingsResponse {
  return {
    languages: MODEL_LANGUAGE_FALLBACKS.map(({ value }) => {
      const targetLanguage = getTargetLanguage(value);
      return {
        value,
        label: targetLanguage.displayName,
        extension: targetLanguage.extension,
        options: targetLanguage.optionDefinitions.map(mapOptionDefinition)
      };
    }),
    inferenceOptions: DEFAULT_INFERENCE_OPTIONS
  };
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

export function sanitizeRendererOptions(
  language: ModelLanguage,
  rawOptions: unknown
): Record<string, ModelOptionValue> {
  const definitions = getTargetLanguage(language).optionDefinitions;
  const input =
    rawOptions && typeof rawOptions === "object"
      ? (rawOptions as Record<string, unknown>)
      : {};

  return definitions.reduce<Record<string, ModelOptionValue>>((acc, definition) => {
    const nextValue = input[definition.name];

    if (definition.optionType === "boolean") {
      acc[definition.name] = parseBoolean(
        nextValue,
        typeof definition.defaultValue === "boolean" ? definition.defaultValue : false
      );
      return acc;
    }

    if (definition.optionType === "string") {
      acc[definition.name] =
        typeof nextValue === "string"
          ? nextValue
          : typeof definition.defaultValue === "string"
            ? definition.defaultValue
            : "";
      return acc;
    }

    const allowedValues = Object.keys(definition.values ?? {});
    acc[definition.name] =
      typeof nextValue === "string" && allowedValues.includes(nextValue)
        ? nextValue
        : typeof definition.defaultValue === "string"
          ? definition.defaultValue
          : allowedValues[0] ?? "";
    return acc;
  }, {});
}
