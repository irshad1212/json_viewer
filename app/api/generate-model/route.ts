import { NextResponse } from "next/server";

import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype
} from "quicktype-core";
import {
  getModelSettingsResponse,
  sanitizeRendererOptions
} from "@/lib/model-generator-settings.server";
import { type ModelLanguage } from "@/lib/model-generator-types";

type GenerateOptions = {
  rendererOptions?: Record<string, unknown>;
  justTypes?: boolean;
  allPropertiesOptional?: boolean;
  alphabetizeProperties?: boolean;
  inferEnums?: boolean;
  inferDateTimes?: boolean;
  inferIntegerStrings?: boolean;
  inferBooleanStrings?: boolean;
  inferMaps?: boolean;
};

type GenerateRequest = {
  json: string;
  language: ModelLanguage;
  typeName?: string;
  options?: GenerateOptions;
};

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getModelSettingsResponse());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;

    const json = body?.json;
    const language = body?.language;
    const typeName = (body?.typeName || "Root").trim();

    if (!json || typeof json !== "string") {
      return NextResponse.json({ error: "JSON input is required." }, { status: 400 });
    }

    const allowed: ModelLanguage[] = [
      "typescript",
      "typescript-effect-schema",
      "typescript-zod",
      "dart",
      "go",
      "swift",
      "kotlin"
    ];

    if (!allowed.includes(language)) {
      return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
    }

    try {
      JSON.parse(json);
    } catch {
      return NextResponse.json({ error: "Invalid JSON input." }, { status: 400 });
    }

    const inputData = new InputData();
    const jsonInput = jsonInputForTargetLanguage(language);
    await jsonInput.addSource({
      name: typeName || "Root",
      samples: [json]
    });
    inputData.addInput(jsonInput);

    const opts = body?.options ?? {};
    const rendererOptions = sanitizeRendererOptions(language, opts.rendererOptions);

    if (opts.justTypes !== undefined) {
      if (language === "typescript-effect-schema" || language === "typescript-zod") {
        rendererOptions["just-schema"] = Boolean(opts.justTypes);
      } else {
        rendererOptions["just-types"] = Boolean(opts.justTypes);
      }
    }

    const result = await quicktype({
      inputData,
      lang: language,
      rendererOptions,
      allPropertiesOptional: opts.allPropertiesOptional ?? false,
      alphabetizeProperties: opts.alphabetizeProperties ?? false,
      inferEnums: opts.inferEnums ?? true,
      inferDateTimes: opts.inferDateTimes ?? true,
      inferIntegerStrings: opts.inferIntegerStrings ?? true,
      inferBooleanStrings: opts.inferBooleanStrings ?? true,
      inferMaps: opts.inferMaps ?? true
    });

    return NextResponse.json({
      code: result.lines.join("\n"),
      lines: result.lines,
      annotations: result.annotations
    });
  } catch (error: unknown) {
    console.error("generate-model error", error);
    return NextResponse.json({ error: "Failed to generate model." }, { status: 500 });
  }
}
