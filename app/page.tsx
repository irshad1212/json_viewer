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
  Wrench
} from "lucide-react";
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

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const tableFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const tableData = useMemo(() => {
    if (!Array.isArray(parsedJson)) return null;

    const sampleRows = parsedJson.length > 500 ? parsedJson.slice(0, 500) : parsedJson;

    const cols = Array.from(
      sampleRows.reduce<Set<string>>((set, row) => {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          Object.keys(row).forEach((k) => set.add(k));
        }
        return set;
      }, new Set<string>())
    );
    return { cols, rows: parsedJson };
  }, [parsedJson]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
    loadHistory();
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

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
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Input</h2>
              <div className="flex items-center gap-3">
                {notice && !error && (
                  <div className="text-[11px] text-muted-foreground">{notice}</div>
                )}
                {error && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
            {!error && (
              <div className="absolute top-2 right-4 z-10 flex items-center gap-2">
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
                  <DropdownMenuContent className="w-[160px]">
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
                    <DropdownMenuItem
                      className="text-xs cursor-pointer"
                      onClick={() => toast.info("Compare JSON - Coming soon")}
                    >
                      Compare JSON
                    </DropdownMenuItem>
                    <Link href="/diff" target="_blank" rel="noopener noreferrer" passHref>
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
            )}
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              className={cn(
                "flex-1 min-h-0 resize-none p-4 font-mono text-sm focus:outline-none bg-transparent text-foreground",
                "font-sans",
                "dark:bg-zinc-950 dark:text-zinc-100",
                error && "focus:ring-1 focus:ring-inset focus:ring-red-500 rounded-none ring-1 ring-inset ring-red-500"
              )}
              placeholder="Paste your JSON here..."
              spellCheck={false}
            />
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
                  data={parsedJson}
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
          </div>
        </div>
      </main>

      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border/60 bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Save Snapshot</h3>
              <button onClick={() => setShowSaveDialog(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <Label className="text-xs">Name</Label>
            <Input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="My data"
              className="mt-1"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveCurrent}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {showHistoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-lg border border-border/60 bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">History</h3>
              <button onClick={() => setShowHistoryDialog(false)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
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
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border/60 bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Delete entry?</h3>
              <button onClick={() => setConfirmDeleteId(null)} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
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
        </div>
      )}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-white/30 bg-white/10 px-6 py-4 text-center text-sm font-medium text-white shadow-2xl backdrop-blur">
            Drop a JSON / CSV / Excel file to import
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-2xl border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Processing data...</p>
          </div>
        </div>
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}
