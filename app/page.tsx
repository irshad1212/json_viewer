"use client";

import { useEffect, useState } from "react";
import JsonViewer from "@/components/ui/json-viewer";
import { AlertCircle, ChevronDown, Hash, Monitor, Moon, MousePointerClick, Palette, Scissors, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable";

const initialData = {
  id: "0001",
  type: "donut",
  name: "Cake",
  ppu: 0.55,
  website: "https://example.com/donuts/cake",
  primaryColor: "#FF5733",
  secondaryColor: "rgb(255, 255, 255)",
  createdAt: 1709251200000,
  updatedAt: "2026-03-06T12:00:00.000Z",
  isActive: true,
  isGlutenFree: false,
  discontinued: null,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In lobortis tellus eu justo hendrerit, a viverra turpis aliquam. Morbi sollicitudin accumsan lectus, eget sollicitudin magna tempus et. Cras fringilla risus sed libero consequat faucibus. Nulla facilisi. Quisque pretium, lorem id dignissim iaculis, est sem aliquet risus, sed suscipit elit sem sit amet dui. Vivamus tempor orci nec imperdiet molestie. Integer elit ex, elementum sed libero vitae, varius porta nisi. Pellentesque eget nibh justo. Morbi nec cursus metus, et faucibus nunc. Quisque vehicula sollicitudin ipsum, laoreet aliquam libero lobortis nec. Nulla facilisi.",
  batters: {
    batter: [
      { id: "1001", type: "Regular" },
      { id: "1002", type: "Chocolate" },
      { id: "1003", type: "Blueberry" },
      { id: "1004", type: "Devil's Food" }
    ]
  },
  topping: [
    { id: "5001", type: "None" },
    { id: "5002", type: "Glazed" },
    { id: "5005", type: "Sugar" },
    { id: "5007", type: "Powdered Sugar" },
    { id: "5006", type: "Chocolate with Sprinkles" },
    { id: "5003", type: "Chocolate" },
    { id: "5004", type: "Maple" }
  ]
};

export default function Home() {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initialData, null, 2));
  const [parsedJson, setParsedJson] = useState<Record<string, any>>(initialData);
  const [error, setError] = useState<string | null>(null);

  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showColorIndent, setShowColorIndent] = useState(false);
  const [collapseOnDoubleClick, setCollapseOnDoubleClick] = useState(false);
  const [enableTruncation, setEnableTruncation] = useState(true);
  const [truncationLimit, setTruncationLimit] = useState(3);
  const [defaultExpanded, setDefaultExpanded] = useState<boolean | number>(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return "dark";
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);

    if (!text.trim()) {
      setParsedJson({});
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      setParsedJson(parsed);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Invalid JSON");
    }
  };

  const handleTruncationChange = (value: number) => {
    if (Number.isNaN(value) || value < 1) return;
    setTruncationLimit(value);
  };

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-black">
      <header className="flex h-14 items-center justify-between gap-3 border-b px-6 bg-white dark:bg-zinc-950 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-foreground dark:text-zinc-100">Split-View JSON Viewer</h1>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 text-xs font-normal justify-between w-[140px]">
            Theme: {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[140px]">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
            >
              <DropdownMenuRadioItem value="dark" className="text-xs inline-flex items-center gap-2">
                <Moon className="w-3.5 h-3.5" /> Dark (default)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light" className="text-xs inline-flex items-center gap-2">
                <Sun className="w-3.5 h-3.5" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="text-xs inline-flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup className="flex-1 min-h-0" orientation="horizontal">
          {/* Left Pane - Input */}
          <ResizablePanel defaultSize="50%" minSize={16.7} className="border-r dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex h-12 items-center justify-between border-b px-4 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">JSON Input</h2>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <textarea
            value={jsonText}
            onChange={handleTextChange}
            className={cn(
              "flex-1 min-h-0 resize-none p-4 font-mono text-sm focus:outline-none bg-transparent text-foreground",
              "dark:bg-zinc-950 dark:text-zinc-100",
              error && "focus:ring-1 focus:ring-inset focus:ring-red-500 rounded-none ring-1 ring-inset ring-red-500"
            )}
            placeholder="Paste your JSON here..."
            spellCheck={false}
          />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Pane - Viewer */}
          <ResizablePanel defaultSize="50%" minSize={50} className="bg-zinc-50 dark:bg-black">
          <div className="flex h-12 items-center justify-between border-b px-4 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Viewer Output</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                    <DropdownMenuRadioGroup
                      value={
                        defaultExpanded === true
                          ? "true"
                          : defaultExpanded === false
                            ? "false"
                            : String(defaultExpanded)
                      }
                      onValueChange={(value) => {
                        if (value === "true") setDefaultExpanded(true);
                        else if (value === "false") setDefaultExpanded(false);
                        else setDefaultExpanded(Number(value));
                      }}
                    >
                      <DropdownMenuRadioItem value="false" className="text-xs">
                        Collapsed
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="true" className="text-xs">
                        Expand All
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="1" className="text-xs">
                        Depth 1
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="2" className="text-xs">
                        Depth 2
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="3" className="text-xs">
                        Depth 3
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
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
            ) : (
              <JsonViewer
                key={String(defaultExpanded)}
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
