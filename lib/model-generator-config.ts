import { type ModelLanguage, type ModelLanguageSettings } from "@/lib/model-generator-types";

export type OptionType = "string" | "boolean" | "enum";
export type OptionKind = "primary" | "secondary" | "cli";

export interface OptionDefinition<Name extends string = string, T = unknown> {
  name: Name;
  description: string;
  optionType: OptionType;
  defaultValue?: T;
  values?: Record<string, unknown>;
  kind?: OptionKind;
  typeLabel?: string;
}

export interface TargetLanguageDefinition {
  displayName: string;
  extension: string;
  names: readonly string[];
  optionDefinitions: Array<OptionDefinition<string, unknown>>;
}

function boolOption(
  name: string,
  description: string,
  defaultValue: boolean,
  kind: OptionKind = "primary"
): OptionDefinition<string, boolean> {
  return { name, description, optionType: "boolean", defaultValue, kind };
}

function stringOption(
  name: string,
  description: string,
  typeLabel: string,
  defaultValue: string,
  kind: OptionKind = "primary"
): OptionDefinition<string, string> {
  return { name, description, optionType: "string", typeLabel, defaultValue, kind };
}

function enumOption(
  name: string,
  description: string,
  values: readonly string[],
  defaultValue: string,
  kind: OptionKind = "primary"
): OptionDefinition<string, string> {
  return {
    name,
    description,
    optionType: "enum",
    defaultValue,
    kind,
    values: values.reduce<Record<string, string>>((acc, value) => {
      acc[value] = value;
      return acc;
    }, {})
  };
}

export const TARGET_LANGUAGE_DEFINITIONS: Record<ModelLanguage, TargetLanguageDefinition> = {
  typescript: {
    displayName: "TypeScript",
    extension: "ts",
    names: ["typescript", "ts", "tsx"],
    optionDefinitions: [
      enumOption("acronym-style", "Acronym naming style", ["original", "pascal", "camel", "lowerCase"], "pascal", "secondary"),
      boolOption("runtime-typecheck", "Verify JSON.parse results at runtime", true),
      boolOption(
        "runtime-typecheck-ignore-unknown-properties",
        "Ignore unknown properties when verifying at runtime",
        false,
        "secondary"
      ),
      enumOption("converters", "Which converters to generate (top-level by default)", ["top-level", "all-objects"], "top-level", "secondary"),
      enumOption("raw-type", "Type of raw input (json by default)", ["json", "any"], "json", "secondary"),
      boolOption("just-types", "Interfaces only", false),
      boolOption("nice-property-names", "Transform property names to be JavaScripty", false),
      boolOption("explicit-unions", "Explicitly name unions", false),
      boolOption("prefer-unions", "Use union type instead of enum", false),
      boolOption("prefer-types", "Use types instead of interfaces", false),
      boolOption("prefer-const-values", "Use string instead of enum for string enums with single value", false),
      boolOption("readonly", "Use readonly type members", false)
    ]
  },
  "typescript-effect-schema": {
    displayName: "TypeScript Effect Schema",
    extension: "ts",
    names: ["typescript-effect-schema"],
    optionDefinitions: [boolOption("just-schema", "Schema only", false)]
  },
  "typescript-zod": {
    displayName: "TypeScript Zod",
    extension: "ts",
    names: ["typescript-zod"],
    optionDefinitions: [boolOption("just-schema", "Schema only", false)]
  },
  dart: {
    displayName: "Dart",
    extension: "dart",
    names: ["dart"],
    optionDefinitions: [
      boolOption("null-safety", "Null Safety", true),
      boolOption("just-types", "Types only", false),
      boolOption("coders-in-class", "Put encoder & decoder in Class", false),
      boolOption("from-map", "Use method names fromMap() & toMap()", false, "secondary"),
      boolOption("required-props", "Make all properties required", false),
      boolOption("final-props", "Make all properties final", false),
      boolOption("copy-with", "Generate CopyWith method", false),
      boolOption("use-freezed", "Generate class definitions with @freezed compatibility", false, "secondary"),
      boolOption("use-hive", "Generate annotations for Hive type adapters", false, "secondary"),
      boolOption("use-json-annotation", "Generate annotations for json_serializable", false, "secondary"),
      stringOption("part-name", "Use this name in `part` directive", "NAME", "", "secondary")
    ]
  },
  go: {
    displayName: "Go",
    extension: "go",
    names: ["go", "golang"],
    optionDefinitions: [
      boolOption("just-types", "Plain types only", false),
      boolOption("just-types-and-package", "Plain types with package only", false),
      stringOption("package", "Generated package name", "NAME", "main"),
      boolOption("multi-file-output", "Renders each top-level object in its own Go file", false),
      stringOption("field-tags", "List of tags which should be generated for fields", "TAGS", "json"),
      boolOption("omit-empty", 'If set, all non-required objects will be tagged with ",omitempty"', false)
    ]
  },
  swift: {
    displayName: "Swift",
    extension: "swift",
    names: ["swift", "swift4"],
    optionDefinitions: [
      boolOption("just-types", "Plain types only", false),
      boolOption("initializers", "Generate initializers and mutators", true),
      boolOption("coding-keys", "Explicit CodingKey values in Codable types", true),
      stringOption("coding-keys-protocol", "CodingKeys implements protocols", "protocol1, protocol2...", "", "secondary"),
      boolOption("alamofire", "Alamofire extensions", false),
      stringOption("type-prefix", "Prefix for type names", "PREFIX", "", "secondary"),
      enumOption("struct-or-class", "Structs or classes", ["struct", "class"], "struct"),
      boolOption("mutable-properties", "Use var instead of let for object properties", false),
      enumOption("acronym-style", "Acronym naming style", ["original", "pascal", "camel", "lowerCase"], "pascal", "secondary"),
      enumOption("density", "Code density", ["dense", "normal"], "dense", "secondary"),
      boolOption("support-linux", "Support Linux", false, "secondary"),
      boolOption("objective-c-support", "Objects inherit from NSObject and @objcMembers is added to classes", false),
      boolOption("optional-enums", "If no matching case is found enum value is set to null", false),
      boolOption("swift-5-support", "Renders output in a Swift 5 compatible mode", false),
      boolOption("sendable", "Mark generated models as Sendable", false),
      boolOption("multi-file-output", "Renders each top-level object in its own Swift file", false),
      enumOption("access-level", "Access level", ["internal", "public"], "internal", "secondary"),
      enumOption("protocol", "Make types implement protocol", ["none", "equatable", "hashable"], "none", "secondary")
    ]
  },
  kotlin: {
    displayName: "Kotlin",
    extension: "kt",
    names: ["kotlin"],
    optionDefinitions: [
      enumOption("framework", "Serialization framework", ["just-types", "jackson", "klaxon", "kotlinx"], "klaxon"),
      enumOption("acronym-style", "Acronym naming style", ["original", "pascal", "camel", "lowerCase"], "pascal", "secondary"),
      stringOption("package", "Package", "PACKAGE", "quicktype")
    ]
  }
};

export function getTargetLanguageDefinition(language: ModelLanguage | string): TargetLanguageDefinition {
  const match = Object.entries(TARGET_LANGUAGE_DEFINITIONS).find(([, definition]) =>
    definition.names.includes(language)
  );

  if (!match) {
    throw new Error(`Unknown language: ${language}`);
  }

  return match[1];
}

export function getModelLanguageSettings(): ModelLanguageSettings[] {
  return (Object.keys(TARGET_LANGUAGE_DEFINITIONS) as ModelLanguage[]).map((language) => ({
    value: language,
    label: TARGET_LANGUAGE_DEFINITIONS[language].displayName,
    extension: TARGET_LANGUAGE_DEFINITIONS[language].extension,
    options: TARGET_LANGUAGE_DEFINITIONS[language].optionDefinitions.map((option) => ({
      name: option.name,
      label: option.description,
      optionType: option.optionType,
      defaultValue: (option.defaultValue ?? (option.optionType === "boolean" ? false : "")) as boolean | string,
      kind: option.kind ?? "primary",
      typeLabel: option.typeLabel,
      enumValues:
        option.optionType === "enum"
          ? Object.keys(option.values ?? {}).map((value) => ({
              value,
              label: value
                .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (match) => match.toUpperCase())
            }))
          : undefined
    }))
  }));
}
