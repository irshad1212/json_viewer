import { getTargetLanguageDefinition, type OptionDefinition } from "@/lib/model-generator-config";
import { generateModelSource } from "@/lib/model-generator-engine";
import { type ModelLanguage, type ModelOptionValue } from "@/lib/model-generator-types";

export type { OptionDefinition };

export interface JSONSourceData {
  name: string;
  samples: string[];
}

export class JSONInput {
  private readonly sources: JSONSourceData[] = [];

  public async addSource(source: JSONSourceData): Promise<void> {
    this.sources.push(source);
  }

  public getSources(): JSONSourceData[] {
    return this.sources;
  }
}

export class InputData {
  private readonly sources: JSONSourceData[] = [];

  public addInput(input: JSONInput): void {
    this.sources.push(...input.getSources());
  }

  public getSources(): JSONSourceData[] {
    return this.sources;
  }
}

export function jsonInputForTargetLanguage(_language: ModelLanguage): JSONInput {
  return new JSONInput();
}

class LocalTargetLanguage {
  public readonly displayName: string;
  public readonly extension: string;
  public readonly names: readonly string[];
  public readonly optionDefinitions: Array<OptionDefinition<string, unknown>>;

  public constructor(language: string) {
    const definition = getTargetLanguageDefinition(language);
    this.displayName = definition.displayName;
    this.extension = definition.extension;
    this.names = definition.names;
    this.optionDefinitions = definition.optionDefinitions;
  }
}

export function getTargetLanguage(language: string): LocalTargetLanguage {
  return new LocalTargetLanguage(language);
}

interface QuicktypeOptions {
  inputData: InputData;
  lang: ModelLanguage;
  rendererOptions: Record<string, ModelOptionValue>;
  allPropertiesOptional: boolean;
  alphabetizeProperties: boolean;
  inferEnums: boolean;
  inferDateTimes: boolean;
  inferIntegerStrings: boolean;
  inferBooleanStrings: boolean;
  inferMaps: boolean;
}

export async function quicktype(options: QuicktypeOptions): Promise<{
  lines: string[];
  annotations: [];
}> {
  const source = options.inputData.getSources()[0];
  const sample = source?.samples[0];

  if (!sample) {
    throw new Error("JSON input is required.");
  }

  const code = generateModelSource({
    language: options.lang,
    typeName: source.name || "Root",
    sample,
    rendererOptions: options.rendererOptions,
    allPropertiesOptional: options.allPropertiesOptional,
    alphabetizeProperties: options.alphabetizeProperties,
    inferDateTimes: options.inferDateTimes,
    inferIntegerStrings: options.inferIntegerStrings,
    inferBooleanStrings: options.inferBooleanStrings,
    inferMaps: options.inferMaps
  });

  return {
    lines: code.split("\n"),
    annotations: []
  };
}
