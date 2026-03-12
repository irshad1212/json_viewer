"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsonViewer from "@/components/ui/json-viewer";
import Link from "next/link";
import {
  AlertCircle,
  ChevronDown,
  Hash,
  History,
  Monitor,
  Moon,
  MousePointerClick,
  Palette,
  Save,
  Scissors,
  Sun,
  Trash2,
  X,
  Loader2,
  Wrench,
  BookText
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast, Toaster } from "@/components/ui/sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

let xlsxLoader: Promise<any> | null = null;
let papaLoader: Promise<any> | null = null;

const loadXlsx = () => {
  if (xlsxLoader) return xlsxLoader;
  if (typeof document === "undefined") {
    return Promise.reject(new Error("XLSX unavailable during SSR"));
  }
  xlsxLoader = new Promise((resolve, reject) => {
    const existing = (window as any).XLSX;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Failed to load XLSX parser"));
    document.body.appendChild(script);
  });
  return xlsxLoader;
};

const loadPapa = () => {
  if (papaLoader) return papaLoader;
  if (typeof document === "undefined") {
    return Promise.reject(new Error("PapaParse unavailable during SSR"));
  }
  papaLoader = new Promise((resolve, reject) => {
    const existing = (window as any).Papa;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).Papa);
    script.onerror = () => reject(new Error("Failed to load PapaParse"));
    document.body.appendChild(script);
  });
  return papaLoader;
};
const initialData: Record<string, unknown> = {};

type SavedEntry = {
  id: string;
  name: string;
  data: string;
  settings: {
    showLineNumbers: boolean;
    showColorIndent: boolean;
    collapseOnDoubleClick: boolean;
    enableTruncation: boolean;
    truncationLimit: number;
    defaultExpanded: boolean | number;
    viewMode: "tree" | "table";
  };
  createdAt: number;
  updatedAt: number;
};

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export default function Home() {
  const [jsonText, setJsonText] = useState("");
  const [parsedJson, setParsedJson] = useState<Record<string, any>>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedEntry[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showColorIndent, setShowColorIndent] = useState(false);
  const [collapseOnDoubleClick, setCollapseOnDoubleClick] = useState(false);
  const [enableTruncation, setEnableTruncation] = useState(false);
  const [truncationLimit, setTruncationLimit] = useState(3);
  const [defaultExpanded, setDefaultExpanded] = useState<boolean | number>(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [queryLang, setQueryLang] = useState<"jsonpath">("jsonpath");

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const tableFileInputRef = useRef<HTMLInputElement | null>(null);
  const monacoRef = useRef<any>(null);
  const [showApiDialog, setShowApiDialog] = useState<null | "rest" | "graphql">(null);
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS">("GET");
  const [restParams, setRestParams] = useState<KeyValueRow[]>([
    { id: "param-1", key: "", value: "", enabled: true }
  ]);
  const [restHeaders, setRestHeaders] = useState<KeyValueRow[]>([
    { id: "header-1", key: "Accept", value: "application/json", enabled: true }
  ]);
  const [restAuthBearer, setRestAuthBearer] = useState("");
  const [restBodyMode, setRestBodyMode] = useState<"none" | "json" | "raw" | "form">("json");
  const [restContentType, setRestContentType] = useState<"application/json" | "text/plain" | "application/x-www-form-urlencoded">(
    "application/json"
  );
  const [restBody, setRestBody] = useState("");
  const [gqlQuery, setGqlQuery] = useState("");
  const [gqlVariables, setGqlVariables] = useState("");
  const [gqlHeaders, setGqlHeaders] = useState<KeyValueRow[]>([
    { id: "gql-header-1", key: "Content-Type", value: "application/json", enabled: true }
  ]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    setNotice(null);

    if (!text.trim()) {
      setParsedJson({});
      setError(null);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      try {
        const parsed = JSON.parse(text);
        setParsedJson(parsed);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Invalid JSON");
      } finally {
        setIsProcessing(false);
      }
    }, 10);
  };

  const handleTruncationChange = (value: number) => {
    if (Number.isNaN(value) || value < 1) return;
    setTruncationLimit(value);
  };
  const CHUNK_SIZE_XLSX = 500;

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem("jsonViewerHistory");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const persistHistory = (next: SavedEntry[]) => {
    setHistory(next);
    localStorage.setItem("jsonViewerHistory", JSON.stringify(next));
  };

  const makeId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as any).randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const likelyDateKey = (key?: string) =>
    key ? /(date|time|timestamp|created|updated|expires|at)$/i.test(key) : false;

  const formatTimestamp = (key: string | undefined, value: unknown): string | null => {
    const withinRange = (d: Date) => {
      const y = d.getFullYear();
      return y >= 1970 && y <= 2100;
    };

    if (typeof value === "number" && Number.isFinite(value) && likelyDateKey(key)) {
      const digits = String(Math.abs(value)).length;
      const millis = digits === 13 ? value : digits === 10 ? value * 1000 : null;
      if (millis) {
        const d = new Date(millis);
        if (!Number.isNaN(d.getTime()) && withinRange(d)) {
          return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short"
          });
        }
      }
    }

    if (typeof value === "string" && (likelyDateKey(key) || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        const d = new Date(parsed);
        if (withinRange(d)) {
          return d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short"
          });
        }
      }
    }
    return null;
  };

  const handleJsonFile = (file: File) => {
    setIsProcessing(true);
    file.text().then((text) => {
      setTimeout(() => {
        try {
          const parsed = JSON.parse(text);
          const pretty = JSON.stringify(parsed, null, 2);
          setJsonText(pretty);
          setParsedJson(parsed);
          setError(null);
          setNotice(null);
          toast.success(`Imported ${file.name}`);
        } catch (err: any) {
          setError(err.message || "Invalid JSON file");
          setNotice(null);
          toast.error("Invalid JSON file");
        } finally {
          setIsProcessing(false);
        }
      }, 10);
    });
  };

  const handleTableFile = async (file: File) => {
    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 10));
    const ext = file.name.toLowerCase().split(".").pop();
    try {
      let rows: any[] = [];
      if (ext === "csv") {
        const Papa = await loadPapa();
        const text = await file.text();
        rows = await new Promise<any[]>((resolve, reject) => {
          const acc: any[] = [];
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            worker: true,
            chunk: (result: { data: unknown[] }) => {
              acc.push(...result.data);
            },
            complete: () => {
              resolve(acc);
            },
            error: (err: Error) => reject(err)
          });
        });
      } else if (ext === "xlsx") {
        const buf = await file.arrayBuffer();
        const XLSX = await loadXlsx();
        const wb = XLSX.read(buf, { type: "array" });
        const first = wb.SheetNames[0];
        const sheet = wb.Sheets[first];
        const ref = sheet["!ref"];
        if (!ref) throw new Error("Empty sheet");
        const range = XLSX.utils.decode_range(ref);
        let header: any[] | null = null;
        rows = [];
        for (let r = range.s.r; r <= range.e.r; r += CHUNK_SIZE_XLSX) {
          const end = Math.min(r + CHUNK_SIZE_XLSX - 1, range.e.r);
          const chunkRange = { s: { r, c: range.s.c }, e: { r: end, c: range.e.c } };
          const chunk = XLSX.utils.sheet_to_json(sheet, {
            range: chunkRange,
            header: 1,
            raw: true,
            defval: null
          }) as any[][];
          if (!chunk.length) continue;
          if (!header) {
            header = chunk.shift() || [];
          }
          const mapped = chunk.map((rowArr) => {
            const obj: Record<string, any> = {};
            header!.forEach((key, idx) => {
              const colKey = key == null || key === "" ? `col_${idx + 1}` : String(key);
              obj[colKey] = rowArr[idx];
            });
            return obj;
          });
          rows.push(...mapped);
          await new Promise((res) => setTimeout(res, 0));
        }
      } else {
        throw new Error("Unsupported file type");
      }
      const pretty = JSON.stringify(rows, null, 2);
      setJsonText(pretty);
      setParsedJson(rows as any);
      setError(null);
      if (!rows.length) {
        setNotice(null);
        toast.error("No rows found in file.");
      } else {
        setNotice(null);
        toast.success(`Imported ${file.name} (${rows.length} rows)`);
      }
    } catch (err: any) {
      setError(err.message || "Invalid file");
      setNotice(null);
      toast.error(err.message || "Invalid file");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSettings = () => ({
    showLineNumbers,
    showColorIndent,
    collapseOnDoubleClick,
    enableTruncation,
    truncationLimit,
    defaultExpanded,
    viewMode
  });

  const saveCurrent = () => {
    const name = saveName.trim() || "Untitled";
    try {
      const parsed = JSON.parse(jsonText || "{}");
      const now = Date.now();
      setParsedJson(parsed);
      setError(null);
      setNotice(null);
      setHistory((prev) => {
        const existingIndex = prev.findIndex((h) => h.name.toLowerCase() === name.toLowerCase());
        const next = [...prev];
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            data: jsonText,
            settings: currentSettings(),
            updatedAt: now
          };
        } else {
          next.unshift({
            id: makeId(),
            name,
            data: jsonText,
            settings: currentSettings(),
            createdAt: now,
            updatedAt: now
          });
        }
        localStorage.setItem("jsonViewerHistory", JSON.stringify(next));
        return next;
      });
      setShowSaveDialog(false);
    } catch (err: any) {
      setError(err.message || "Invalid JSON");
    }
  };

  const loadEntry = (entry: SavedEntry) => {
    setJsonText(entry.data);
    setShowLineNumbers(entry.settings.showLineNumbers);
    setShowColorIndent(entry.settings.showColorIndent);
    setCollapseOnDoubleClick(entry.settings.collapseOnDoubleClick);
    setEnableTruncation(entry.settings.enableTruncation);
    setTruncationLimit(entry.settings.truncationLimit);
    setDefaultExpanded(entry.settings.defaultExpanded);
    setViewMode(entry.settings.viewMode);
    try {
      const parsed = JSON.parse(entry.data || "{}");
      setParsedJson(parsed);
      setError(null);
      toast.success(`Loaded "${entry.name}"`);
    } catch (err: any) {
      setError("Saved JSON is invalid");
    }
  };

  const applyQuery = (data: any, query: string, lang: "jsonpath") => {
    if (!query.trim()) return data;
    // Simple filter: $[?(@.field == 'value')] or [?field==123]
    const filterRegex = /\[\?\(?@?\.?([\w$]+)\s*==\s*(['"]?)([^'"\])]+)\2\)?\]/;

    const tokenize = (path: string) => {
      const clean = path.replace(/^\$?\.?/, "");
      const tokens: string[] = [];
      const re = /(\['[^']+'\])|(\["[^"]+"\])|(\[\*\])|(\[\d+\])|(\*)|([^.\[\]]+)/g;
      let m;
      while ((m = re.exec(clean)) !== null) {
        const [full] = m;
        if (full === "[*]" || full === "*") tokens.push("*");
        else if (full.startsWith("['") || full.startsWith('["')) tokens.push(full.slice(2, -2));
        else if (full.startsWith("[")) tokens.push(full.slice(1, -1));
        else tokens.push(full);
      }
      return tokens;
    };

    const walk = (target: any, tokens: string[]): any =>
      tokens.reduce((acc, t) => {
        if (acc === undefined || acc === null) return undefined;
        if (t === "*") {
          if (Array.isArray(acc)) return acc.flat();
          if (acc && typeof acc === "object") return Object.values(acc);
          return undefined;
        }
        if (Array.isArray(acc)) {
          const idx = Number(t);
          if (Number.isInteger(idx)) return acc[idx];
          return acc.map((item: any) => item?.[t]).filter((item: any) => item !== undefined);
        }
        return (acc as any)?.[t];
      }, target);

    // Filters
    if (filterRegex.test(query)) {
      const match = query.match(filterRegex)!;
      const [, key, , rawVal] = match;
      const val = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
      const matchIndex = match.index || 0;
      // path before filter to reach target array
      const prefix = query.slice(0, matchIndex).replace(/^\$?\.?/, "");
      let target: any = prefix ? walk(data, tokenize(prefix)) : data;
      if (Array.isArray(target)) {
        // flatten one level if wildcard produced nested arrays
        target = target.flat ? target.flat() : target;
        data = target.filter((item: any) => item?.[key] == val);
      } else {
        data = [];
      }
      query = query.slice(matchIndex + match[0].length);
      return walk(data, tokenize(query));
      return walk(data, tokenize(query));
    }



    // JSONPath fallback: treat as dot/bracket path (covers default JSONPath)
    return walk(data, tokenize(query));
  };

  const displayJson = useMemo(() => {
    const res = applyQuery(parsedJson, filterQuery, queryLang);
    return res === undefined ? parsedJson : res;
  }, [parsedJson, filterQuery, queryLang]);

  const tableData = useMemo(() => {
    if (!Array.isArray(displayJson)) return null;

    const sampleRows = displayJson.length > 500 ? displayJson.slice(0, 500) : displayJson;

    const cols = Array.from(
      sampleRows.reduce<Set<string>>((set, row) => {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          Object.keys(row).forEach((k) => set.add(k));
        }
        return set;
      }, new Set<string>())
    );
    return { cols, rows: displayJson };
  }, [displayJson]);
  const handleDrop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (ext === "json") {
      handleJsonFile(file);
    } else if (ext === "csv" || ext === "xlsx") {
      await handleTableFile(file);
    } else {
      toast.error("Unsupported file type. Please drop JSON, CSV, or Excel (.xlsx).");
    }
  };

  const ensureRow = (rows: KeyValueRow[], setRows: (next: KeyValueRow[]) => void) => {
    if (rows.length === 0) {
      setRows([{ id: makeId(), key: "", value: "", enabled: true }]);
    }
  };

  const upsertRow = (
    rows: KeyValueRow[],
    setRows: (next: KeyValueRow[]) => void,
    id: string,
    field: "key" | "value" | "enabled",
    value: string | boolean
  ) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = (rows: KeyValueRow[], setRows: (next: KeyValueRow[]) => void) => {
    setRows([...rows, { id: makeId(), key: "", value: "", enabled: true }]);
  };

  const removeRow = (rows: KeyValueRow[], setRows: (next: KeyValueRow[]) => void, id: string) => {
    if (rows.length === 1) {
      setRows([{ id: makeId(), key: "", value: "", enabled: true }]);
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const kvToObject = (rows: KeyValueRow[]) =>
    rows.reduce<Record<string, string>>((acc, { key, value, enabled }) => {
      if (!enabled) return acc;
      const trimmedKey = key.trim();
      if (trimmedKey) acc[trimmedKey] = value;
      return acc;
    }, {});

  const buildUrlWithParams = (url: string, params: KeyValueRow[]) => {
    if (!params.some((p) => p.enabled && p.key.trim())) return url;
    try {
      const u = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
      params.forEach(({ key, value, enabled }) => {
        if (enabled && key.trim()) u.searchParams.append(key.trim(), value);
      });
      return u.toString();
    } catch {
      const search = params
        .filter((p) => p.enabled && p.key.trim())
        .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
        .join("&");
      if (!search) return url;
      return url.includes("?") ? `${url}&${search}` : `${url}?${search}`;
    }
  };

  const resetApiForm = () => {
    setApiUrl("");
    setApiMethod("GET");
    setRestParams([{ id: makeId(), key: "", value: "", enabled: true }]);
    setRestHeaders([{ id: makeId(), key: "Accept", value: "application/json", enabled: true }]);
    setRestAuthBearer("");
    setRestBodyMode("json");
    setRestContentType("application/json");
    setRestBody("");
    setGqlQuery("");
    setGqlVariables("");
    setGqlHeaders([{ id: makeId(), key: "Content-Type", value: "application/json", enabled: true }]);
  };

  const OptionSelect = ({
    value,
    options,
    onChange,
    className,
    placeholder,
    widthClass = "w-full"
  }: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    className?: string;
    placeholder?: string;
    widthClass?: string;
  }) => {
    const active = options.find((o) => o.value === value);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "h-10 px-3 inline-flex items-center justify-between rounded-md border border-border bg-transparent text-sm font-normal",
            widthClass,
            className
          )}
        >
          <span className="truncate">{active?.label || placeholder || "Select"}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[220px]">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              className={cn("text-sm", value === opt.value && "bg-muted")}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const loadFromRest = async () => {
    if (!apiUrl.trim()) {
      toast.error("Enter an endpoint URL.");
      return;
    }
    setIsProcessing(true);
    try {
      const preparedUrl = buildUrlWithParams(apiUrl, restParams);
      const headers = kvToObject(restHeaders);
      if (restAuthBearer.trim()) {
        headers.Authorization = `Bearer ${restAuthBearer.trim()}`;
      }
      const bodyAllowed = apiMethod !== "GET" && apiMethod !== "HEAD";
      if (bodyAllowed && restBodyMode !== "none") {
        headers["Content-Type"] = restContentType;
      }

      let body: BodyInit | undefined;
      if (bodyAllowed) {
        if (restBodyMode === "json" && restBody.trim()) {
          body = JSON.stringify(JSON.parse(restBody));
        } else if (restBodyMode === "form" && restBody.trim()) {
          const form = new URLSearchParams();
          restBody
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((line) => {
              const idx = line.indexOf("=");
              if (idx > -1) {
                form.append(line.slice(0, idx), line.slice(idx + 1));
              }
            });
          body = form;
        } else if (restBodyMode === "raw") {
          body = restBody;
        }
      }

      const started = performance.now();
      const res = await fetch(preparedUrl, {
        method: apiMethod,
        headers,
        body
      });
      const elapsed = Math.round(performance.now() - started);

      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      const pretty = JSON.stringify(parsed, null, 2);
      setJsonText(pretty);
      setParsedJson(parsed);
      setError(null);
      setNotice(`REST ${res.status} • ${elapsed} ms • ${preparedUrl}`);
      if (res.ok) {
        toast.success(`Loaded REST (${res.status})`);
      } else {
        toast.error(`Loaded REST (${res.status})`);
      }
      setShowApiDialog(null);
      resetApiForm();
    } catch (err: any) {
      const message = err?.message || "Failed to load REST data";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadFromGraphQL = async () => {
    if (!apiUrl.trim() || !gqlQuery.trim()) {
      toast.error("Endpoint and query are required.");
      return;
    }
    setIsProcessing(true);
    try {
      const headers = kvToObject(gqlHeaders);
      if (restAuthBearer.trim()) {
        headers.Authorization = `Bearer ${restAuthBearer.trim()}`;
      }
      const variables = gqlVariables.trim() ? JSON.parse(gqlVariables) : undefined;
      const started = performance.now();
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify({ query: gqlQuery, variables })
      });
      const elapsed = Math.round(performance.now() - started);
      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0].message || "GraphQL error");
      }
      if (json.data == null) {
        throw new Error("No data returned");
      }
      const pretty = JSON.stringify(json.data, null, 2);
      setJsonText(pretty);
      setParsedJson(json.data);
      setError(null);
      setNotice(`GraphQL ${res.status} • ${elapsed} ms • ${apiUrl}`);
      if (res.ok) {
        toast.success(`Loaded GraphQL (${res.status})`);
      } else {
        toast.error(`Loaded GraphQL (${res.status})`);
      }
      setShowApiDialog(null);
      resetApiForm();
    } catch (err: any) {
      const message = err?.message || "Failed to load GraphQL data";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
    const savedJson = localStorage.getItem("jsonViewerText");
    if (savedJson) {
      setJsonText(savedJson);
      try {
        const parsed = JSON.parse(savedJson);
        setParsedJson(parsed);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Invalid JSON");
      }
    }
    loadHistory();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      localStorage.setItem("jsonViewerText", jsonText);
    }, 300);
    return () => clearTimeout(timer);
  }, [jsonText, mounted]);

  const isDark = useMemo(() => {
    if (!mounted) return true;
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return theme === "dark";
  }, [theme, mounted]);

  const editorTheme = isDark ? "app-dark" : "app-light";

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(editorTheme);
    }
  }, [editorTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    if (mounted) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, isDark, mounted]);

  return (
    <div
      className="relative flex h-screen w-full flex-col bg-zinc-50 dark:bg-black"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleDrop(e.dataTransfer.files);
      }}
    >
      <header className="flex h-14 items-center justify-between gap-3 border-b px-6 bg-white dark:bg-zinc-950 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded" />
          <h1
            className="text-lg font-semibold text-foreground dark:text-zinc-100"
            style={{ fontFamily: "'Leckerli One', cursive" }}
          >
            JSON Viewer
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 text-xs font-normal justify-between w-[140px]">
              <span className="inline-flex items-center gap-1.5">
                {(mounted ? theme : "system") === "dark" ? <Moon className="w-3.5 h-3.5" /> : (mounted ? theme : "system") === "light" ? <Sun className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                {(mounted ? theme : "system") === "system" ? "System" : (mounted ? theme : "system") === "dark" ? "Dark" : "Light"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[140px]">
              {[
                { value: "dark" as const, label: "Dark (default)", icon: <Moon className="w-3.5 h-3.5" /> },
                { value: "light" as const, label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
                { value: "system" as const, label: "System", icon: <Monitor className="w-3.5 h-3.5" /> }
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "text-xs inline-flex items-center gap-2",
                    theme === opt.value && "bg-muted text-foreground"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <a
            href="https://github.com/irshad1212/json_viewer"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-white text-foreground transition hover:bg-muted dark:bg-zinc-900 dark:border-zinc-700"
            aria-label="GitHub repository"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.35-1.76-1.35-1.76-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.25 1.86 1.25 1.08 1.85 2.83 1.32 3.52 1.01.11-.78.42-1.32.76-1.62-2.67-.3-5.47-1.34-5.47-5.97 0-1.32.47-2.4 1.24-3.25-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.24a11.5 11.5 0 0 1 6 0c2.28-1.56 3.29-1.24 3.29-1.24.66 1.64.24 2.86.12 3.16.77.85 1.23 1.93 1.23 3.25 0 4.64-2.8 5.66-5.48 5.96.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex flex-1 min-h-0">
          {/* Left Pane - Input */}
          <div className="flex w-1/2 min-w-[25%] flex-col border-r dark:border-zinc-800 bg-white dark:bg-zinc-950 relative">
            <div className="flex h-12 items-center justify-between border-b px-4 dark:border-zinc-800">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 shrink-0">Input</h2>
              <div className="flex items-center gap-2">
                {notice && !error && (
                  <div className="text-[11px] text-muted-foreground">{notice}</div>
                )}
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleJsonFile(file);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={tableFileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleTableFile(file);
                    e.target.value = "";
                  }}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger className="h-7 px-3 text-xs font-normal border rounded-md">
                    Import
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[190px]">
                    <DropdownMenuItem
                      className="text-xs w-full"
                      onClick={() => jsonFileInputRef.current?.click()}
                    >
                      From JSON file
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs w-full"
                      onClick={() => tableFileInputRef.current?.click()}
                    >
                      From CSV/Excel (.csv, .xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs w-full"
                      onClick={() => {
                        resetApiForm();
                        setShowApiDialog("rest");
                        setApiMethod("GET");
                      }}
                    >
                      Load from REST
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs w-full"
                      onClick={() => {
                        resetApiForm();
                        setShowApiDialog("graphql");
                        setApiMethod("POST");
                      }}
                    >
                      Load from GraphQL
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonText || "{}");
                      const pretty = JSON.stringify(parsed, null, 2);
                      setJsonText(pretty);
                      setParsedJson(parsed);
                      setError(null);
                    } catch (err: any) {
                      setError(err.message || "Invalid JSON");
                    }
                  }}
                >
                  Beautify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={!jsonText.trim()}
                  onClick={() => {
                    setSaveName("");
                    setShowSaveDialog(true);
                  }}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowHistoryDialog(true)}
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  History
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md">
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    Tools
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[180px]">
                    <DropdownMenuItem
                      className="text-xs cursor-pointer"
                      onClick={() => toast.info("Generate Data Model - Coming soon")}
                    >
                      Generate Data Model
                    </DropdownMenuItem>
                    <Link href="/compare" passHref>
                      <DropdownMenuItem className="text-xs cursor-pointer">
                        Compare JSON
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/diff" passHref>
                      <DropdownMenuItem className="text-xs cursor-pointer">
                        JSON Diff
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="text-xs cursor-pointer"
                      onClick={() => toast.info("Convert to JSON - Coming soon")}
                    >
                      Convert to JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language="json"
                  theme={editorTheme}
                  value={jsonText}
                  beforeMount={(monaco) => {
                    monacoRef.current = monaco;
                    monaco.editor.defineTheme("app-dark", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [],
                      colors: {
                        "editor.background": "#09090b",
                        "editorGutter.background": "#09090b",
                      }
                    });
                    monaco.editor.defineTheme("app-light", {
                      base: "vs",
                      inherit: true,
                      rules: [],
                      colors: {
                        "editor.background": "#ffffff",
                        "editorGutter.background": "#ffffff",
                      }
                    });
                  }}
                  onChange={(val) => {
                    const newText = val || "";
                    setJsonText(newText);
                    try {
                      const parsed = JSON.parse(newText);
                      setParsedJson(parsed);
                      setError(null);
                    } catch (err: any) {
                      setError(err.message || "Invalid JSON");
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    lineNumbersMinChars: 3,
                    padding: { top: 16 }
                  }}
                />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-500 dark:bg-red-500/5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
          </div>

          {/* Right Pane - Viewer */}
          <div className="flex w-1/2 min-w-[50%] flex-col bg-zinc-50 dark:bg-black">
            <div className="flex h-12 items-center justify-between border-b px-4 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Viewer</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Collapse on</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCollapseOnDoubleClick(!collapseOnDoubleClick)}
                  >
                    {collapseOnDoubleClick ? "Double click" : "Single click"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-b px-4 py-3 dark:border-zinc-800 bg-zinc-50/70 dark:bg-black">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className={cn(
                    "h-8 text-xs font-normal border transition-colors",
                    showLineNumbers
                      ? "bg-secondary border-primary/50 text-primary font-medium shadow-[0_0_8px_-2px_rgba(var(--primary),0.5)] hover:bg-secondary/80"
                      : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  <Hash className="w-3.5 h-3.5" />
                  Line Numbers
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowColorIndent(!showColorIndent)}
                  className={cn(
                    "h-8 text-xs font-normal border transition-colors",
                    showColorIndent
                      ? "bg-secondary border-primary/50 text-primary font-medium shadow-[0_0_8px_-2px_rgba(var(--primary),0.5)] hover:bg-secondary/80"
                      : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  <Palette className="w-3.5 h-3.5" />
                  Color Indent
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCollapseOnDoubleClick(!collapseOnDoubleClick)}
                  className={cn(
                    "h-8 text-xs font-normal border transition-colors",
                    collapseOnDoubleClick
                      ? "bg-secondary border-primary/50 text-primary font-medium shadow-[0_0_8px_-2px_rgba(var(--primary),0.5)] hover:bg-secondary/80"
                      : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Double Click
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEnableTruncation(!enableTruncation)}
                  className={cn(
                    "h-8 text-xs font-normal border transition-colors",
                    enableTruncation
                      ? "bg-secondary border-primary/50 text-primary font-medium shadow-[0_0_8px_-2px_rgba(var(--primary),0.5)] hover:bg-secondary/80"
                      : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Smart Truncation
                </Button>

                {enableTruncation && (
                  <div className="flex items-center gap-2 ml-1 animate-in fade-in slide-in-from-left-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Limit</Label>
                    <Input
                      type="number"
                      min="1"
                      value={truncationLimit}
                      onChange={(e) => handleTruncationChange(Number(e.target.value))}
                      className="w-16 h-8 text-xs px-2"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant={viewMode === "table" ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      if (viewMode === "tree") {
                        setIsProcessing(true);
                        setTimeout(() => {
                          setViewMode("table");
                          setIsProcessing(false);
                        }, 50);
                      } else {
                        setViewMode("tree");
                      }
                    }}
                  >
                    {viewMode === "table" ? "Tree View" : "Table View"}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Initial Expansion</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 text-xs font-normal justify-between w-[140px]">
                      {defaultExpanded === true
                        ? "Expand All"
                        : defaultExpanded === false
                          ? "Collapsed"
                          : `Depth ${defaultExpanded}`}
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[140px]">
                      {[
                        { value: "false", label: "Collapsed" },
                        { value: "true", label: "Expand All" },
                        { value: "1", label: "Depth 1" },
                        { value: "2", label: "Depth 2" },
                        { value: "3", label: "Depth 3" }
                      ].map((opt) => (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => {
                            if (opt.value === "true") setDefaultExpanded(true);
                            else if (opt.value === "false") setDefaultExpanded(false);
                            else setDefaultExpanded(Number(opt.value));
                          }}
                          className={cn(
                            "text-xs inline-flex items-center gap-2 w-full",
                            String(
                              defaultExpanded === true
                                ? "true"
                                : defaultExpanded === false
                                  ? "false"
                                  : defaultExpanded
                            ) === opt.value && "bg-muted text-foreground"
                          )}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4">
              {error ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-500">
                  Fix JSON errors to view the output
                </div>
              ) : viewMode === "table" ? (
                tableData && tableData.cols.length > 0 ? (
                  <div className="h-full overflow-auto rounded-xl border border-border/60 bg-white dark:bg-zinc-950">
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-muted/60 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                          {tableData.cols.map((col) => (
                            <TableHead key={col} className="text-left">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.rows
                          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                          .map((row: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-muted/40">
                              {tableData.cols.map((col) => {
                                const val = row?.[col];
                                let content: React.ReactNode = "";
                                if (typeof val === "boolean") {
                                  content = (
                                    <span
                                      className={cn(
                                        "text-sm font-medium",
                                        val ? "text-emerald-400" : "text-rose-400"
                                      )}
                                    >
                                      {val ? "true" : "false"}
                                    </span>
                                  );
                                } else if (val === null || val === undefined) {
                                  content = <span className="text-muted-foreground/70">—</span>;
                                } else if (typeof val === "object") {
                                  content = <span className="font-mono text-xs text-muted-foreground">{JSON.stringify(val)}</span>;
                                } else if (formatTimestamp(col, val)) {
                                  const formatted = formatTimestamp(col, val)!;
                                  content = (
                                    <div className="space-y-0.5">
                                      <span className="text-sm text-foreground">{formatted}</span>
                                      <div className="text-[11px] font-mono text-muted-foreground/70">{String(val)}</div>
                                    </div>
                                  );
                                } else {
                                  content = String(val);
                                }
                                return (
                                  <TableCell key={col} className="whitespace-pre-wrap align-top">
                                    {content}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t border-border/60">
                      <span>
                        Showing {tableData.rows.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, tableData.rows.length)} of {tableData.rows.length} row(s).
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        >
                          Previous
                        </Button>
                        <span className="min-w-[4rem] text-center">
                          Page {currentPage} of {Math.max(1, Math.ceil(tableData.rows.length / ITEMS_PER_PAGE))}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={currentPage >= Math.ceil(tableData.rows.length / ITEMS_PER_PAGE)}
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(tableData.rows.length / ITEMS_PER_PAGE), prev + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Table view available only for an array of objects.
                  </div>
                )
              ) : (
                <JsonViewer
                  key={`${String(defaultExpanded)}-${viewMode}`}
                  data={displayJson}
                  showLineNumbers={showLineNumbers}
                  showColorIndent={showColorIndent}
                  collapseOn={collapseOnDoubleClick ? "doubleClick" : "click"}
                  truncation={{
                    enabled: enableTruncation,
                    itemsPerArray: truncationLimit
                  }}
                  defaultExpanded={defaultExpanded}
                  className="h-full"
                  title="Feature Showcase"
                />
              )}
            </div>
            <div className="border-t px-4 py-3 dark:border-zinc-800 bg-white/80 dark:bg-black/60 backdrop-blur-sm space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex flex-1 gap-2">
                  <Input
                    id="json-query"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="JSON Query"
                    className="h-9 text-sm"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-9 px-3 text-xs font-medium">
                      {queryLang === "jsonpath" ? "JSONPath" : "Unsupported"}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuItem onClick={() => setQueryLang("jsonpath")}>JSONPath</DropdownMenuItem>
                      <DropdownMenuItem
                        className="opacity-50"
                        onClick={() => toast.error("JMESPath is unavailable.")}
                      >
                        JMESPath
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="opacity-50"
                        onClick={() => toast.error("jq is unavailable.")}
                      >
                        jq (basic)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => setFilterQuery("")}
                    disabled={!filterQuery}
                  >
                    Clear
                  </Button>
                  <Link href="/docs?type=json-query" title="JSON Query Guide" className="flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800 transition-colors">
                    <BookText className="h-4 w-4" />
                    <span className="sr-only">Query Guide</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={showSaveDialog}
        onOpenChange={(open) => {
          if (!open) setShowSaveDialog(false);
        }}
      >
        <DialogContent className="w-[min(96vw,420px)] max-w-sm border border-border/60 bg-white p-5 sm:p-6 shadow-xl dark:bg-zinc-950">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-base font-semibold">Save Snapshot</DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5">
            <Label className="text-sm font-medium text-foreground pb-1 block">Name</Label>
            <Input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="My data"
            />
          </div>

          <div className="mt-6 flex justify-end items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveCurrent}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(showApiDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setShowApiDialog(null);
            resetApiForm();
          }
        }}
      >
        <DialogContent className="w-[94vw] sm:max-w-[980px] md:max-w-[1040px] lg:max-w-[1080px] border border-border/60 bg-white p-5 shadow-2xl dark:bg-zinc-950">
          <DialogHeader className="mb-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Request Builder</p>
            <DialogTitle className="text-sm font-semibold">
              {showApiDialog === "rest" ? "Load from REST" : "Load from GraphQL"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Compose a request; responses are parsed into the JSON viewer.
            </DialogDescription>
          </DialogHeader>
          <DialogClose
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[160px_1fr] items-start">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Method</Label>
                  <OptionSelect
                    value={apiMethod}
                    onChange={(v) =>
                      setApiMethod(v as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS")
                    }
                    options={["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => ({
                      value: m,
                      label: m
                    }))}
                    widthClass="w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Endpoint URL</Label>
                  <Input
                    autoFocus
                    placeholder="https://api.example.com/v1/resource"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full h-10"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Query params and headers are added automatically.</p>
                </div>
              </div>

              {showApiDialog === "rest" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold">Query Params</p>
                        <p className="text-[11px] text-muted-foreground">Appends to the URL</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => addRow(restParams, setRestParams)}>
                        + Param
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {restParams.map((row) => (
                        <div key={row.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                          <Checkbox
                            checked={row.enabled}
                            onCheckedChange={(checked) =>
                              upsertRow(restParams, setRestParams, row.id, "enabled", Boolean(checked))
                            }
                            className="h-4 w-4"
                          />
                          <Input
                            placeholder="key"
                            value={row.key}
                            onChange={(e) => upsertRow(restParams, setRestParams, row.id, "key", e.target.value)}
                            onBlur={() => ensureRow(restParams, setRestParams)}
                            className="h-10"
                          />
                          <Input
                            placeholder="value"
                            value={row.value}
                            onChange={(e) => upsertRow(restParams, setRestParams, row.id, "value", e.target.value)}
                            onBlur={() => ensureRow(restParams, setRestParams)}
                            className="h-10"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeRow(restParams, setRestParams, row.id)}
                            aria-label="Remove param"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Authentication</p>
                        <span className="text-[11px] text-muted-foreground">Bearer</span>
                      </div>
                      <Input
                        placeholder="Bearer token (optional)"
                        value={restAuthBearer}
                        onChange={(e) => setRestAuthBearer(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold">Headers</p>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => addRow(restHeaders, setRestHeaders)}>
                          + Header
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {restHeaders.map((row) => (
                          <div key={row.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                            <Checkbox
                              checked={row.enabled}
                              onCheckedChange={(checked) =>
                                upsertRow(restHeaders, setRestHeaders, row.id, "enabled", Boolean(checked))
                              }
                              className="h-4 w-4"
                            />
                            <Input
                              placeholder="Header"
                              value={row.key}
                              onChange={(e) => upsertRow(restHeaders, setRestHeaders, row.id, "key", e.target.value)}
                              onBlur={() => ensureRow(restHeaders, setRestHeaders)}
                              className="h-10"
                            />
                            <Input
                              placeholder="Value"
                              value={row.value}
                              onChange={(e) => upsertRow(restHeaders, setRestHeaders, row.id, "value", e.target.value)}
                              onBlur={() => ensureRow(restHeaders, setRestHeaders)}
                              className="h-10"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeRow(restHeaders, setRestHeaders, row.id)}
                              aria-label="Remove header"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Body</Label>
                        <OptionSelect
                          value={restBodyMode}
                          onChange={(next) => {
                            const typed = next as "none" | "json" | "raw" | "form";
                            setRestBodyMode(typed);
                            if (typed === "json") setRestContentType("application/json");
                            if (typed === "raw") setRestContentType("text/plain");
                            if (typed === "form") setRestContentType("application/x-www-form-urlencoded");
                          }}
                          className="h-9"
                          widthClass="w-36"
                          options={[
                            { value: "none", label: "None" },
                            { value: "json", label: "JSON" },
                            { value: "raw", label: "Raw text" },
                            { value: "form", label: "Form (key=value lines)" }
                          ]}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Content-Type</Label>
                        <OptionSelect
                          value={restContentType}
                          onChange={(v) =>
                            setRestContentType(
                              v as "application/json" | "text/plain" | "application/x-www-form-urlencoded"
                            )
                          }
                          options={[
                            { value: "application/json", label: "application/json" },
                            { value: "text/plain", label: "text/plain" },
                            { value: "application/x-www-form-urlencoded", label: "application/x-www-form-urlencoded" }
                          ]}
                          className={cn("h-9", restBodyMode === "none" && "pointer-events-none opacity-60")}
                          widthClass="w-56"
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {apiMethod === "GET" || apiMethod === "HEAD"
                          ? "Body on GET/HEAD is unusual; it will be sent if provided."
                          : "Paste payload below"}
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={restBody}
                      onChange={(e) => setRestBody(e.target.value)}
                      className={cn(
                        "w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-950 font-mono",
                        restBodyMode === "none" ? "opacity-70" : "opacity-100"
                      )}
                      placeholder={
                        restBodyMode === "json"
                          ? '{\n  "status": "active"\n}'
                          : restBodyMode === "form"
                          ? "key=value\nanother=123"
                          : "Raw text body"
                      }
                    />
                  </div>
                </div>
              )}

              {showApiDialog === "graphql" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Authentication</p>
                      <span className="text-[11px] text-muted-foreground">Bearer</span>
                    </div>
                    <Input
                      placeholder="Bearer token (optional)"
                      value={restAuthBearer}
                      onChange={(e) => setRestAuthBearer(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold">Headers</p>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => addRow(gqlHeaders, setGqlHeaders)}>
                        + Header
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {gqlHeaders.map((row) => (
                        <div key={row.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                          <Checkbox
                            checked={row.enabled}
                            onCheckedChange={(checked) =>
                              upsertRow(gqlHeaders, setGqlHeaders, row.id, "enabled", Boolean(checked))
                            }
                            className="h-4 w-4"
                          />
                          <Input
                            placeholder="Header"
                            value={row.key}
                            onChange={(e) => upsertRow(gqlHeaders, setGqlHeaders, row.id, "key", e.target.value)}
                            onBlur={() => ensureRow(gqlHeaders, setGqlHeaders)}
                            className="h-10"
                          />
                          <Input
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => upsertRow(gqlHeaders, setGqlHeaders, row.id, "value", e.target.value)}
                            onBlur={() => ensureRow(gqlHeaders, setGqlHeaders)}
                            className="h-10"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeRow(gqlHeaders, setGqlHeaders, row.id)}
                            aria-label="Remove header"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Query</Label>
                    <textarea
                      rows={7}
                      value={gqlQuery}
                      onChange={(e) => setGqlQuery(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-950 font-mono"
                      placeholder={"query Example {\\n  viewer {\\n    login\\n  }\\n}"}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Variables (JSON, optional)</Label>
                    <textarea
                      rows={4}
                      value={gqlVariables}
                      onChange={(e) => setGqlVariables(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-950 font-mono"
                      placeholder='{"id": "123"}'
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
                <span className="truncate">
                  Preview:{" "}
                  <span className="font-mono text-foreground">
                    {showApiDialog === "rest" ? buildUrlWithParams(apiUrl || "<url>", restParams) : apiUrl || "<url>"}
                  </span>
                </span>
                <span className="font-mono">
                  {showApiDialog === "rest"
                    ? restBodyMode === "none"
                      ? "No body"
                      : `${apiMethod} • ${restContentType}`
                    : "POST • application/json"}
                </span>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowApiDialog(null);
                    resetApiForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={showApiDialog === "rest" ? loadFromRest : loadFromGraphQL}
                  disabled={!apiUrl.trim() || (showApiDialog === "graphql" && !gqlQuery.trim())}
                >
                  Send & Load
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showHistoryDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowHistoryDialog(false);
            setConfirmDeleteId(null);
          }
        }}
      >
        <DialogContent className="w-[94vw] sm:max-w-[860px] md:max-w-[940px] lg:max-w-[980px] min-w-[660px] border border-border/60 bg-white p-4 shadow-2xl dark:bg-zinc-950">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-sm font-semibold">History</DialogTitle>
            <DialogDescription className="text-xs">
              Load a saved snapshot or delete entries stored locally in your browser.
            </DialogDescription>
          </DialogHeader>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No saved items yet.</div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table className="min-w-full table-fixed">
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead className="w-1/4">Name</TableHead>
                    <TableHead className="w-1/4">Saved</TableHead>
                    <TableHead className="w-1/4">Updated</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/40 cursor-pointer"
                      onClick={() => {
                        loadEntry(item);
                        setShowHistoryDialog(false);
                      }}
                    >
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{item.id.slice(0, 6)}</TableCell>
                      <TableCell className="font-medium break-words">{item.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(item.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {confirmDeleteId && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Delete entry?</h3>
                <button onClick={() => setConfirmDeleteId(null)} aria-label="Close">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const next = history.filter((h) => h.id !== confirmDeleteId);
                    persistHistory(next);
                    setConfirmDeleteId(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {
        isDragOver && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="rounded-xl border border-white/30 bg-white/10 px-6 py-4 text-center text-sm font-medium text-white shadow-2xl backdrop-blur">
              Drop a JSON / CSV / Excel file to import
            </div>
          </div>
        )
      }
      {
        isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-2xl border border-border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Processing data...</p>
            </div>
          </div>
        )
      }
      <Toaster position="bottom-center" />
    </div >
  );
}
