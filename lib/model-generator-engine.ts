import { type ModelLanguage, type ModelOptionValue } from "@/lib/model-generator-types";

interface GenerateModelSourceOptions {
  language: ModelLanguage;
  typeName: string;
  sample: string;
  rendererOptions: Record<string, ModelOptionValue>;
  allPropertiesOptional: boolean;
  alphabetizeProperties: boolean;
  inferDateTimes: boolean;
  inferIntegerStrings: boolean;
  inferBooleanStrings: boolean;
  inferMaps: boolean;
}

type TypeDescriptor =
  | { kind: "any" }
  | { kind: "null" }
  | { kind: "boolean" }
  | { kind: "number"; integer: boolean }
  | { kind: "string"; dateTime: boolean }
  | { kind: "array"; element: TypeDescriptor }
  | { kind: "map"; value: TypeDescriptor }
  | { kind: "object"; nameHint: string; name?: string; properties: PropertyDescriptor[] }
  | { kind: "union"; members: TypeDescriptor[] };

interface PropertyDescriptor {
  name: string;
  type: TypeDescriptor;
  optional: boolean;
}

interface InferenceContext {
  inferDateTimes: boolean;
  inferIntegerStrings: boolean;
  inferBooleanStrings: boolean;
  inferMaps: boolean;
}

interface RenderContext {
  nameCounts: Map<string, number>;
  alphabetizeProperties: boolean;
  allPropertiesOptional: boolean;
}

const ANY_TYPE: TypeDescriptor = { kind: "any" };
const NULL_TYPE: TypeDescriptor = { kind: "null" };
const BOOLEAN_TYPE: TypeDescriptor = { kind: "boolean" };
const STRING_TYPE: TypeDescriptor = { kind: "string", dateTime: false };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toPascalCase(input: string): string {
  const words = toWords(input);
  if (words.length === 0) {
    return "GeneratedType";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function singularize(input: string): string {
  if (input.endsWith("ies") && input.length > 3) {
    return `${input.slice(0, -3)}y`;
  }

  if (input.endsWith("ses") && input.length > 3) {
    return input.slice(0, -2);
  }

  if (input.endsWith("s") && !input.endsWith("ss") && input.length > 1) {
    return input.slice(0, -1);
  }

  return input;
}

function sanitizeIdentifier(input: string, fallback: string): string {
  const candidate = input.replace(/[^A-Za-z0-9_]/g, "_");
  const normalized = /^[A-Za-z_]/.test(candidate) ? candidate : `_${candidate}`;
  return normalized || fallback;
}

function tsPropertyName(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function uniqueName(context: RenderContext, hint: string): string {
  const base = sanitizeIdentifier(toPascalCase(hint), "GeneratedType");
  const count = context.nameCounts.get(base) ?? 0;
  context.nameCounts.set(base, count + 1);
  return count === 0 ? base : `${base}${count + 1}`;
}

function ensureObjectName(type: Extract<TypeDescriptor, { kind: "object" }>, context: RenderContext): string {
  if (!type.name) {
    type.name = uniqueName(context, type.nameHint);
  }

  return type.name;
}

function isDateTimeString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value);
}

function inferStringType(value: string, context: InferenceContext): TypeDescriptor {
  if (context.inferBooleanStrings && /^(true|false)$/i.test(value)) {
    return BOOLEAN_TYPE;
  }

  if (context.inferIntegerStrings && /^-?\d+$/.test(value)) {
    return { kind: "number", integer: true };
  }

  if (context.inferDateTimes && isDateTimeString(value)) {
    return { kind: "string", dateTime: true };
  }

  return STRING_TYPE;
}

function signatureOf(type: TypeDescriptor): string {
  switch (type.kind) {
    case "any":
    case "null":
    case "boolean":
      return type.kind;
    case "number":
      return `number:${type.integer ? "int" : "float"}`;
    case "string":
      return `string:${type.dateTime ? "date-time" : "plain"}`;
    case "array":
      return `array:${signatureOf(type.element)}`;
    case "map":
      return `map:${signatureOf(type.value)}`;
    case "object":
      return `object:{${type.properties
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((property) => `${property.name}${property.optional ? "?" : ""}:${signatureOf(property.type)}`)
        .join(",")}}`;
    case "union":
      return `union:${type.members.map(signatureOf).sort().join("|")}`;
  }
}

function mergeUnionMembers(members: TypeDescriptor[]): TypeDescriptor[] {
  const flattened = members.flatMap((member) =>
    member.kind === "union" ? member.members : [member]
  );
  const unique = new Map<string, TypeDescriptor>();

  for (const member of flattened) {
    const signature = signatureOf(member);
    if (!unique.has(signature)) {
      unique.set(signature, member);
    }
  }

  return Array.from(unique.values());
}

function mergeObjectTypes(
  left: Extract<TypeDescriptor, { kind: "object" }>,
  right: Extract<TypeDescriptor, { kind: "object" }>,
  context: InferenceContext
): Extract<TypeDescriptor, { kind: "object" }> {
  const propertyMap = new Map<string, PropertyDescriptor>();

  for (const property of left.properties) {
    propertyMap.set(property.name, { ...property });
  }

  for (const property of right.properties) {
    const existing = propertyMap.get(property.name);
    if (!existing) {
      propertyMap.set(property.name, { ...property, optional: true });
      continue;
    }

    propertyMap.set(property.name, {
      name: property.name,
      optional: existing.optional || property.optional,
      type: mergeTypes(existing.type, property.type, context, property.name)
    });
  }

  for (const property of left.properties) {
    if (!right.properties.some((candidate) => candidate.name === property.name)) {
      const existing = propertyMap.get(property.name);
      if (existing) {
        existing.optional = true;
      }
    }
  }

  return {
    kind: "object",
    nameHint: left.nameHint,
    properties: Array.from(propertyMap.values())
  };
}

function mergeTypes(
  left: TypeDescriptor,
  right: TypeDescriptor,
  context: InferenceContext,
  hintName: string
): TypeDescriptor {
  if (left.kind === "any") {
    return right;
  }

  if (right.kind === "any") {
    return left;
  }

  if (left.kind === right.kind) {
    switch (left.kind) {
      case "null":
      case "boolean":
        return left;
      case "number": {
        const other = right as Extract<TypeDescriptor, { kind: "number" }>;
        return { kind: "number", integer: left.integer && other.integer };
      }
      case "string": {
        const other = right as Extract<TypeDescriptor, { kind: "string" }>;
        return { kind: "string", dateTime: left.dateTime && other.dateTime };
      }
      case "array": {
        const other = right as Extract<TypeDescriptor, { kind: "array" }>;
        return {
          kind: "array",
          element: mergeTypes(left.element, other.element, context, singularize(hintName))
        };
      }
      case "map": {
        const other = right as Extract<TypeDescriptor, { kind: "map" }>;
        return {
          kind: "map",
          value: mergeTypes(left.value, other.value, context, singularize(hintName))
        };
      }
      case "object":
        return mergeObjectTypes(left, right as Extract<TypeDescriptor, { kind: "object" }>, context);
      case "union": {
        const other = right as Extract<TypeDescriptor, { kind: "union" }>;
        const members = mergeUnionMembers([...left.members, ...other.members]);
        return members.length === 1 ? members[0] : { kind: "union", members };
      }
    }
  }

  const members = mergeUnionMembers([left, right]);
  return members.length === 1 ? members[0] : { kind: "union", members };
}

function maybeInferMap(
  value: Record<string, unknown>,
  context: InferenceContext,
  hintName: string
): TypeDescriptor | null {
  if (!context.inferMaps) {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.length < 3) {
    return null;
  }

  const hasStructuredKeys = entries.every(([key]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key));
  if (hasStructuredKeys) {
    return null;
  }

  let mergedValueType: TypeDescriptor | null = null;
  for (const [key, entryValue] of entries) {
    const nextType = inferType(entryValue, singularize(hintName || key), context);
    mergedValueType = mergedValueType
      ? mergeTypes(mergedValueType, nextType, context, singularize(hintName || key))
      : nextType;
  }

  return { kind: "map", value: mergedValueType ?? ANY_TYPE };
}

function inferType(value: unknown, hintName: string, context: InferenceContext): TypeDescriptor {
  if (value === null) {
    return NULL_TYPE;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { kind: "array", element: ANY_TYPE };
    }

    let elementType: TypeDescriptor | null = null;
    for (const entry of value) {
      const nextType = inferType(entry, singularize(hintName), context);
      elementType = elementType
        ? mergeTypes(elementType, nextType, context, singularize(hintName))
        : nextType;
    }

    return { kind: "array", element: elementType ?? ANY_TYPE };
  }

  if (isPlainObject(value)) {
    const inferredMap = maybeInferMap(value, context, hintName);
    if (inferredMap) {
      return inferredMap;
    }

    return {
      kind: "object",
      nameHint: hintName,
      properties: Object.entries(value).map(([key, entryValue]) => ({
        name: key,
        type: inferType(entryValue, key, context),
        optional: false
      }))
    };
  }

  switch (typeof value) {
    case "boolean":
      return BOOLEAN_TYPE;
    case "number":
      return { kind: "number", integer: Number.isInteger(value) };
    case "string":
      return inferStringType(value, context);
    default:
      return ANY_TYPE;
  }
}

function collectObjects(type: TypeDescriptor, context: RenderContext): Array<Extract<TypeDescriptor, { kind: "object" }>> {
  const objects: Array<Extract<TypeDescriptor, { kind: "object" }>> = [];
  const seen = new Set<Extract<TypeDescriptor, { kind: "object" }>>();

  const visit = (next: TypeDescriptor) => {
    switch (next.kind) {
      case "array":
        visit(next.element);
        break;
      case "map":
        visit(next.value);
        break;
      case "union":
        next.members.forEach(visit);
        break;
      case "object":
        if (seen.has(next)) {
          return;
        }
        seen.add(next);
        ensureObjectName(next, context);
        next.properties.forEach((property) => visit(property.type));
        objects.push(next);
        break;
      default:
        break;
    }
  };

  visit(type);
  return objects;
}

function sortProperties<T extends PropertyDescriptor>(properties: T[], context: RenderContext): T[] {
  if (!context.alphabetizeProperties) {
    return properties;
  }

  return properties.slice().sort((left, right) => left.name.localeCompare(right.name));
}

function unwrapNullable(type: TypeDescriptor): { type: TypeDescriptor; nullable: boolean } {
  if (type.kind !== "union") {
    return { type, nullable: false };
  }

  const nonNullMembers = type.members.filter((member) => member.kind !== "null");
  const hasNull = nonNullMembers.length !== type.members.length;

  if (hasNull && nonNullMembers.length === 1) {
    return { type: nonNullMembers[0] ?? ANY_TYPE, nullable: true };
  }

  return { type, nullable: false };
}

function propertyIsOptional(property: PropertyDescriptor, context: RenderContext): boolean {
  return context.allPropertiesOptional || property.optional;
}

function renderTypeScriptType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "any";
      break;
    case "null":
      result = "null";
      break;
    case "boolean":
      result = "boolean";
      break;
    case "number":
      result = "number";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "Date" : "string";
      break;
    case "array":
      result = `${renderTypeScriptType(unwrapped.type.element, context)}[]`;
      break;
    case "map":
      result = `Record<string, ${renderTypeScriptType(unwrapped.type.value, context)}>`;
      break;
    case "object":
      result = ensureObjectName(unwrapped.type, context);
      break;
    case "union":
      result = unwrapped.type.members.map((member) => renderTypeScriptType(member, context)).join(" | ");
      break;
  }

  return unwrapped.nullable ? `${result} | null` : result;
}

function renderEffectSchemaType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "Schema.Unknown";
      break;
    case "null":
      result = "Schema.Null";
      break;
    case "boolean":
      result = "Schema.Boolean";
      break;
    case "number":
      result = "Schema.Number";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "Schema.DateFromString" : "Schema.String";
      break;
    case "array":
      result = `Schema.Array(${renderEffectSchemaType(unwrapped.type.element, context)})`;
      break;
    case "map":
      result = `Schema.Record({ key: Schema.String, value: ${renderEffectSchemaType(unwrapped.type.value, context)} })`;
      break;
    case "object":
      result = `${ensureObjectName(unwrapped.type, context)}Schema`;
      break;
    case "union":
      result = `Schema.Union(${unwrapped.type.members
        .map((member) => renderEffectSchemaType(member, context))
        .join(", ")})`;
      break;
  }

  return unwrapped.nullable ? `Schema.NullOr(${result})` : result;
}

function renderZodType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "z.unknown()";
      break;
    case "null":
      result = "z.null()";
      break;
    case "boolean":
      result = "z.boolean()";
      break;
    case "number":
      result = unwrapped.type.integer ? "z.number().int()" : "z.number()";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "z.coerce.date()" : "z.string()";
      break;
    case "array":
      result = `z.array(${renderZodType(unwrapped.type.element, context)})`;
      break;
    case "map":
      result = `z.record(z.string(), ${renderZodType(unwrapped.type.value, context)})`;
      break;
    case "object":
      result = `${ensureObjectName(unwrapped.type, context)}Schema`;
      break;
    case "union":
      result = `z.union([${unwrapped.type.members.map((member) => renderZodType(member, context)).join(", ")}])`;
      break;
  }

  return unwrapped.nullable ? `${result}.nullable()` : result;
}

function renderDartType(type: TypeDescriptor, context: RenderContext, nullSafety: boolean): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "dynamic";
      break;
    case "null":
      result = "dynamic";
      break;
    case "boolean":
      result = "bool";
      break;
    case "number":
      result = unwrapped.type.integer ? "int" : "double";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "DateTime" : "String";
      break;
    case "array":
      result = `List<${renderDartType(unwrapped.type.element, context, nullSafety)}>`;
      break;
    case "map":
      result = `Map<String, ${renderDartType(unwrapped.type.value, context, nullSafety)}>`;
      break;
    case "object":
      result = ensureObjectName(unwrapped.type, context);
      break;
    case "union":
      result = "dynamic";
      break;
  }

  return nullSafety && unwrapped.nullable ? `${result}?` : result;
}

function renderSwiftType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "Any";
      break;
    case "null":
      result = "Any";
      break;
    case "boolean":
      result = "Bool";
      break;
    case "number":
      result = unwrapped.type.integer ? "Int" : "Double";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "Date" : "String";
      break;
    case "array":
      result = `[${renderSwiftType(unwrapped.type.element, context)}]`;
      break;
    case "map":
      result = `[String: ${renderSwiftType(unwrapped.type.value, context)}]`;
      break;
    case "object":
      result = ensureObjectName(unwrapped.type, context);
      break;
    case "union":
      result = "Any";
      break;
  }

  return unwrapped.nullable ? `${result}?` : result;
}

function renderKotlinType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);
  let result: string;

  switch (unwrapped.type.kind) {
    case "any":
      result = "Any";
      break;
    case "null":
      result = "Any";
      break;
    case "boolean":
      result = "Boolean";
      break;
    case "number":
      result = unwrapped.type.integer ? "Long" : "Double";
      break;
    case "string":
      result = unwrapped.type.dateTime ? "String" : "String";
      break;
    case "array":
      result = `List<${renderKotlinType(unwrapped.type.element, context)}>`;
      break;
    case "map":
      result = `Map<String, ${renderKotlinType(unwrapped.type.value, context)}>`;
      break;
    case "object":
      result = ensureObjectName(unwrapped.type, context);
      break;
    case "union":
      result = "Any";
      break;
  }

  return unwrapped.nullable ? `${result}?` : result;
}

function renderGoType(type: TypeDescriptor, context: RenderContext): string {
  const unwrapped = unwrapNullable(type);

  switch (unwrapped.type.kind) {
    case "any":
    case "null":
      return "interface{}";
    case "boolean":
      return "bool";
    case "number":
      return unwrapped.type.integer ? "int64" : "float64";
    case "string":
      return "string";
    case "array":
      return `[]${renderGoType(unwrapped.type.element, context)}`;
    case "map":
      return `map[string]${renderGoType(unwrapped.type.value, context)}`;
    case "object":
      return ensureObjectName(unwrapped.type, context);
    case "union":
      return "interface{}";
  }
}

function renderTypeScript(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines: string[] = [];
  const preferTypes = options.rendererOptions["prefer-types"] === true;
  const readonly = options.rendererOptions.readonly === true;

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(preferTypes ? `export type ${name} = {` : `export interface ${name} {`);
    for (const property of sortProperties(objectType.properties, context)) {
      const optional = propertyIsOptional(property, context) ? "?" : "";
      const readonlyPrefix = readonly ? "readonly " : "";
      lines.push(
        `  ${readonlyPrefix}${tsPropertyName(property.name)}${optional}: ${renderTypeScriptType(property.type, context)};`
      );
    }
    lines.push("}");
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`export type ${sanitizeIdentifier(toPascalCase(options.typeName), "Root")} = ${renderTypeScriptType(root, context)};`);
    lines.push("");
  }

  if (options.rendererOptions["just-types"] !== true) {
    const rootName =
      root.kind === "object"
        ? ensureObjectName(root, context)
        : sanitizeIdentifier(toPascalCase(options.typeName), "Root");
    lines.push(`export const parse${rootName} = (json: string): ${rootName} => JSON.parse(json) as ${rootName};`);
    lines.push(`export const serialize${rootName} = (value: ${rootName}): string => JSON.stringify(value, null, 2);`);
  }

  return lines.join("\n").trim();
}

function renderEffectSchema(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines = ['import { Schema } from "effect";', ""];
  const rootName = sanitizeIdentifier(toPascalCase(options.typeName), "Root");
  const justSchema = options.rendererOptions["just-schema"] === true;

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`export const ${name}Schema = Schema.Struct({`);
    for (const property of sortProperties(objectType.properties, context)) {
      const rendered = renderEffectSchemaType(property.type, context);
      lines.push(
        `  ${tsPropertyName(property.name)}: ${propertyIsOptional(property, context) ? `Schema.optional(${rendered})` : rendered},`
      );
    }
    lines.push("});");
    if (!justSchema) {
      lines.push(`export type ${name} = Schema.Schema.Type<typeof ${name}Schema>;`);
    }
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`export const ${rootName}Schema = ${renderEffectSchemaType(root, context)};`);
    if (!justSchema) {
      lines.push(`export type ${rootName} = Schema.Schema.Type<typeof ${rootName}Schema>;`);
    }
  }

  return lines.join("\n").trim();
}

function renderZod(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines = ['import { z } from "zod";', ""];
  const rootName = sanitizeIdentifier(toPascalCase(options.typeName), "Root");
  const justSchema = options.rendererOptions["just-schema"] === true;

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`export const ${name}Schema = z.object({`);
    for (const property of sortProperties(objectType.properties, context)) {
      const rendered = renderZodType(property.type, context);
      lines.push(
        `  ${tsPropertyName(property.name)}: ${propertyIsOptional(property, context) ? `${rendered}.optional()` : rendered},`
      );
    }
    lines.push("});");
    if (!justSchema) {
      lines.push(`export type ${name} = z.infer<typeof ${name}Schema>;`);
    }
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`export const ${rootName}Schema = ${renderZodType(root, context)};`);
    if (!justSchema) {
      lines.push(`export type ${rootName} = z.infer<typeof ${rootName}Schema>;`);
    }
  }

  return lines.join("\n").trim();
}

function renderDart(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines: string[] = [];
  const nullSafety = options.rendererOptions["null-safety"] !== false;
  const useFinal = options.rendererOptions["final-props"] === true;
  const requiredProps = options.rendererOptions["required-props"] === true;
  const partName = typeof options.rendererOptions["part-name"] === "string" ? options.rendererOptions["part-name"] : "";

  if (partName) {
    lines.push(`part '${partName}';`, "");
  }

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`class ${name} {`);
    for (const property of sortProperties(objectType.properties, context)) {
      const identifier = sanitizeIdentifier(toCamelCase(property.name), "value");
      const optional = propertyIsOptional(property, context) || unwrapNullable(property.type).nullable;
      const renderedType = renderDartType(property.type, context, nullSafety);
      const prefix = useFinal ? "final" : "var";
      lines.push(`  ${prefix} ${renderedType}${!useFinal ? "" : ""} ${identifier};`);
      if (!useFinal) {
        lines[lines.length - 1] = `  ${optional && !nullSafety ? '' : ''}${prefix} ${identifier};`;
      }
    }

    const constructorArgs = sortProperties(objectType.properties, context).map((property) => {
      const identifier = sanitizeIdentifier(toCamelCase(property.name), "value");
      const optional = propertyIsOptional(property, context) || unwrapNullable(property.type).nullable;
      if (requiredProps && !optional) {
        return `required this.${identifier}`;
      }

      return `this.${identifier}`;
    });

    lines.push(`  ${name}({${constructorArgs.join(", ")}});`);
    lines.push("}");
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`typedef ${sanitizeIdentifier(toPascalCase(options.typeName), "Root")} = ${renderDartType(root, context, nullSafety)};`);
  }

  return lines.join("\n").trim();
}

function renderSwift(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines: string[] = [];
  const useClass = options.rendererOptions["struct-or-class"] === "class";
  const mutable = options.rendererOptions["mutable-properties"] === true;
  const accessLevel = typeof options.rendererOptions["access-level"] === "string" ? options.rendererOptions["access-level"] : "internal";
  const protocol = typeof options.rendererOptions.protocol === "string" ? options.rendererOptions.protocol : "none";
  const sendable = options.rendererOptions.sendable === true ? ["Sendable"] : [];
  const extraProtocols = protocol === "equatable" ? ["Equatable"] : protocol === "hashable" ? ["Hashable"] : [];
  const conformance = ["Codable", ...extraProtocols, ...sendable].join(", ");

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`${accessLevel} ${useClass ? "final class" : "struct"} ${name}: ${conformance} {`);
    for (const property of sortProperties(objectType.properties, context)) {
      const identifier = sanitizeIdentifier(toCamelCase(property.name), "value");
      const optional = propertyIsOptional(property, context) || unwrapNullable(property.type).nullable;
      const renderedType = renderSwiftType(property.type, context);
      lines.push(`    ${mutable ? "var" : "let"} ${identifier}: ${optional && !renderedType.endsWith("?") ? `${renderedType}?` : renderedType}`);
    }
    lines.push("}");
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`typealias ${sanitizeIdentifier(toPascalCase(options.typeName), "Root")} = ${renderSwiftType(root, context)}`);
  }

  return lines.join("\n").trim();
}

function renderKotlin(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines: string[] = [];
  const packageName = typeof options.rendererOptions.package === "string" ? options.rendererOptions.package : "quicktype";

  if (packageName) {
    lines.push(`package ${packageName}`, "");
  }

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`data class ${name}(`);
    const properties = sortProperties(objectType.properties, context);
    properties.forEach((property, index) => {
      const identifier = sanitizeIdentifier(toCamelCase(property.name), "value");
      const optional = propertyIsOptional(property, context) || unwrapNullable(property.type).nullable;
      const renderedType = renderKotlinType(property.type, context);
      const suffix = index === properties.length - 1 ? "" : ",";
      lines.push(`    val ${identifier}: ${optional && !renderedType.endsWith("?") ? `${renderedType}? = null` : `${renderedType}${optional ? " = null" : ""}`}${suffix}`);
    });
    lines.push(")");
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`typealias ${sanitizeIdentifier(toPascalCase(options.typeName), "Root")} = ${renderKotlinType(root, context)}`);
  }

  return lines.join("\n").trim();
}

function renderGo(root: TypeDescriptor, options: GenerateModelSourceOptions, context: RenderContext): string {
  const objects = collectObjects(root, context);
  const lines: string[] = [];
  const packageName = typeof options.rendererOptions.package === "string" ? options.rendererOptions.package : "main";
  const tags = typeof options.rendererOptions["field-tags"] === "string" ? String(options.rendererOptions["field-tags"]).split(",").map((tag) => tag.trim()).filter(Boolean) : ["json"];
  const omitEmpty = options.rendererOptions["omit-empty"] === true;

  lines.push(`package ${packageName}`, "");

  for (const objectType of objects) {
    const name = ensureObjectName(objectType, context);
    lines.push(`type ${name} struct {`);
    for (const property of sortProperties(objectType.properties, context)) {
      const fieldName = sanitizeIdentifier(toPascalCase(property.name), "Field");
      const fieldType = renderGoType(property.type, context);
      const tagValue = tags
        .map((tag) => `${tag}:"${property.name}${omitEmpty || propertyIsOptional(property, context) ? ",omitempty" : ""}"`)
        .join(" ");
      lines.push(`\t${fieldName} ${fieldType}${tagValue ? ` \`${tagValue}\`` : ""}`);
    }
    lines.push("}");
    lines.push("");
  }

  if (root.kind !== "object") {
    lines.push(`type ${sanitizeIdentifier(toPascalCase(options.typeName), "Root")} = ${renderGoType(root, context)}`);
  }

  return lines.join("\n").trim();
}

export function generateModelSource(options: GenerateModelSourceOptions): string {
  const parsed = JSON.parse(options.sample) as unknown;
  const inferenceContext: InferenceContext = {
    inferDateTimes: options.inferDateTimes,
    inferIntegerStrings: options.inferIntegerStrings,
    inferBooleanStrings: options.inferBooleanStrings,
    inferMaps: options.inferMaps
  };
  const renderContext: RenderContext = {
    nameCounts: new Map<string, number>(),
    alphabetizeProperties: options.alphabetizeProperties,
    allPropertiesOptional: options.allPropertiesOptional
  };
  const root = inferType(parsed, options.typeName, inferenceContext);

  if (root.kind === "object") {
    root.nameHint = options.typeName;
  }

  switch (options.language) {
    case "typescript":
      return renderTypeScript(root, options, renderContext);
    case "typescript-effect-schema":
      return renderEffectSchema(root, options, renderContext);
    case "typescript-zod":
      return renderZod(root, options, renderContext);
    case "dart":
      return renderDart(root, options, renderContext);
    case "swift":
      return renderSwift(root, options, renderContext);
    case "kotlin":
      return renderKotlin(root, options, renderContext);
    case "go":
      return renderGo(root, options, renderContext);
  }
}
