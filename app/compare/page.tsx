"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GitCompare, Wand2, Settings2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Editor from "@monaco-editor/react";

interface CompareResult {
    added: { path: string; valB: string }[];
    removed: { path: string; valA: string }[];
    changed: { path: string; valA: string; valB: string }[];
}

interface CompareConfig {
    ignoreArrayOrder: boolean;
    ignoreNullValues: boolean;
    ignoreKeys: string[];
}

function isOrdinaryObject(obj: any) {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function traverse(
    nodeA: any,
    nodeB: any,
    path: string,
    result: CompareResult,
    config: CompareConfig
) {
    if (nodeA === nodeB) return;

    // Filter Nulls
    if (config.ignoreNullValues) {
        if (nodeA === null) nodeA = undefined;
        if (nodeB === null) nodeB = undefined;
        if (nodeA === undefined && nodeB === undefined) return;
    }

    if (nodeA === undefined && nodeB !== undefined) {
        result.added.push({ path, valB: JSON.stringify(nodeB) });
        return;
    }

    if (nodeA !== undefined && nodeB === undefined) {
        result.removed.push({ path, valA: JSON.stringify(nodeA) });
        return;
    }

    // Both Defined, check types
    if (typeof nodeA !== typeof nodeB) {
        result.changed.push({ path, valA: JSON.stringify(nodeA), valB: JSON.stringify(nodeB) });
        return;
    }

    // Both are Arrays
    if (Array.isArray(nodeA) && Array.isArray(nodeB)) {
        if (config.ignoreArrayOrder) {
            // Very naive order-agnostic check: stringify and sort
            const sortedA = [...nodeA].map(v => JSON.stringify(v)).sort();
            const sortedB = [...nodeB].map(v => JSON.stringify(v)).sort();

            // Re-parse elements to run through the diff map structurally so we display changes
            const parsedA = sortedA.map(v => v ? JSON.parse(v) : v);
            const parsedB = sortedB.map(v => v ? JSON.parse(v) : v);

            const maxLen = Math.max(parsedA.length, parsedB.length);
            for (let i = 0; i < maxLen; i++) {
                const childPath = path ? `${path}[${i}]` : `[${i}]`;
                traverse(parsedA[i], parsedB[i], childPath, result, config);
            }
        } else {
            const maxLen = Math.max(nodeA.length, nodeB.length);
            for (let i = 0; i < maxLen; i++) {
                const childPath = path ? `${path}[${i}]` : `[${i}]`;
                traverse(nodeA[i], nodeB[i], childPath, result, config);
            }
        }
        return;
    }

    // Array vs Object mismatch
    if (Array.isArray(nodeA) !== Array.isArray(nodeB)) {
        result.changed.push({ path, valA: JSON.stringify(nodeA), valB: JSON.stringify(nodeB) });
        return;
    }

    // Both are Objects
    if (isOrdinaryObject(nodeA) && isOrdinaryObject(nodeB)) {
        const keysA = Object.keys(nodeA);
        const keysB = Object.keys(nodeB);
        const allKeys = Array.from(new Set([...keysA, ...keysB]));

        for (const k of allKeys) {
            // Ignore configured keys
            if (config.ignoreKeys.includes(k)) continue;

            const childPath = path ? `${path}.${k}` : k;
            traverse(nodeA[k], nodeB[k], childPath, result, config);
        }
        return;
    }

    // Primitives
    if (nodeA !== nodeB) {
        result.changed.push({ path, valA: JSON.stringify(nodeA), valB: JSON.stringify(nodeB) });
    }
}

const COMPARE_SAMPLE_A = {
    "product_id": "PRD-2024-X1",
    "name": "Neural-Link Headphones",
    "brand": "AudioTech",
    "specs": {
        "connectivity": "Bluetooth 5.3",
        "battery_life": "40h",
        "noise_canceling": true
    },
    "price": {
        "amount": 299.99,
        "currency": "USD"
    },
    "tags": ["audio", "wireless", "tech"]
};

const COMPARE_SAMPLE_B = {
    "product_id": "PRD-2024-X1-PRO",
    "name": "Neural-Link Headphones Pro",
    "brand": "AudioTech",
    "specs": {
        "connectivity": "Bluetooth 5.4",
        "battery_life": "60h",
        "noise_canceling": true,
        "spatial_audio": true
    },
    "price": {
        "amount": 349.99,
        "currency": "USD"
    },
    "stock_status": "in_stock",
    "tags": ["audio", "wireless", "tech", "pro"]
};

export default function ComparePage() {
    const [textA, setTextA] = useState(JSON.stringify(COMPARE_SAMPLE_A, null, 2));
    const [textB, setTextB] = useState(JSON.stringify(COMPARE_SAMPLE_B, null, 2));
    const [compareData, setCompareData] = useState<CompareResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<CompareConfig>({
        ignoreArrayOrder: false,
        ignoreNullValues: false,
        ignoreKeys: [],
    });
    const [ignoreKeysInput, setIgnoreKeysInput] = useState("");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<CompareConfig>(config);
    const [tempIgnoreKeysInput, setTempIgnoreKeysInput] = useState(ignoreKeysInput);
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const monacoRef = useRef<any>(null);

    useEffect(() => {
        const stored = window.localStorage.getItem("theme");
        if (stored === "light" || stored === "dark" || stored === "system") {
            setTheme(stored);
        }
        setMounted(true);
    }, []);

    const isDark = useMemo(() => {
        if (!mounted) return true;
        if (theme === "system") {
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        return theme === "dark";
    }, [theme, mounted]);

    const editorTheme = isDark ? "app-dark" : "app-light";

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", isDark);
    }, [isDark]);

    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(editorTheme);
        }
    }, [editorTheme]);

    const activeConfigCount = (config.ignoreArrayOrder ? 1 : 0) +
        (config.ignoreNullValues ? 1 : 0) +
        (config.ignoreKeys.length > 0 ? 1 : 0);

    React.useEffect(() => {
        try {
            setError(null);
            const strA = textA.trim();
            const strB = textB.trim();

            if (!strA && !strB) {
                setCompareData(null);
                return;
            }

            const objA = strA ? JSON.parse(strA) : undefined;
            const objB = strB ? JSON.parse(strB) : undefined;

            const res: CompareResult = { added: [], removed: [], changed: [] };
            traverse(objA, objB, "", res, config);
            setCompareData(res);
        } catch (e: any) {
            setError("Invalid JSON format");
        }
    }, [textA, textB, config]);

    const handleBeautify = (
        text: string,
        setText: React.Dispatch<React.SetStateAction<string>>,
        paneName: string
    ) => {
        if (!text.trim()) return;
        try {
            const parsed = JSON.parse(text);
            setText(JSON.stringify(parsed, null, 2));
            toast.success(`Beautified ${paneName}`);
        } catch (e) {
            toast.error(`Invalid JSON in ${paneName}. Cannot beautify.`);
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="flex h-14 items-center justify-between gap-3 border-b px-6 bg-white dark:bg-zinc-950 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-4">
                    <GitCompare className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-sm font-semibold text-foreground dark:text-zinc-100 uppercase tracking-wider">
                        JSON Compare Tool
                    </h1>
                </div>
                <div className="flex items-center gap-4 pr-4">
                    {error && <span className="text-red-500 text-sm font-medium">{error}</span>}

                    {activeConfigCount > 0 && (
                        <div className="relative group/filter cursor-default">
                            {/* Trigger Pill */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-bold border border-indigo-200 dark:border-indigo-500/30 transition-colors shadow-sm">
                                <span>{activeConfigCount} Filter{activeConfigCount > 1 ? 's' : ''} Active</span>
                            </div>

                            {/* Hover Popover */}
                            <div className="absolute right-0 top-full mt-2 w-64 opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-all duration-200 z-50 origin-top-right translate-y-2 group-hover/filter:translate-y-0 text-left">
                                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden p-4 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-transparent dark:before:to-zinc-900/50 before:pointer-events-none">
                                    <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                                        Active Overrides
                                    </h4>

                                    <div className="flex flex-col gap-2.5">
                                        {config.ignoreArrayOrder && (
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                <span className="text-[13px] font-medium leading-tight text-zinc-700 dark:text-zinc-200">Ignore Array Order</span>
                                            </div>
                                        )}
                                        {config.ignoreNullValues && (
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                <span className="text-[13px] font-medium leading-tight text-zinc-700 dark:text-zinc-200">Ignore NULL Values</span>
                                            </div>
                                        )}
                                        {config.ignoreKeys.length > 0 && (
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-medium leading-tight text-zinc-700 dark:text-zinc-200 mb-1">Ignore Specific Keys</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {config.ignoreKeys.map(k => (
                                                            <span key={k} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                                                                {k}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Dialog
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (open) {
                                setTempConfig(config);
                                setTempIgnoreKeysInput(ignoreKeysInput);
                            }
                        }}
                    >
                        <DialogTrigger
                            render={
                                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-semibold text-muted-foreground hover:text-indigo-500" type="button">
                                    <Settings2 className="h-4 w-4" />
                                    Options
                                </Button>
                            }
                        />
                        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 p-6">
                            <DialogHeader>
                                <DialogTitle className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Comparison Filters</DialogTitle>
                            </DialogHeader>
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2"></div>

                            <div className="flex flex-col gap-4 py-2">
                                <label className="flex items-center justify-between cursor-pointer space-x-2 group">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Ignore Array Order</span>
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={tempConfig.ignoreArrayOrder}
                                        onChange={(e) => setTempConfig((p) => ({ ...p, ignoreArrayOrder: e.target.checked }))}
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer space-x-2 group">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Ignore NULL values</span>
                                    <input
                                        type="checkbox"
                                        className="rounded border-zinc-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        checked={tempConfig.ignoreNullValues}
                                        onChange={(e) => setTempConfig((p) => ({ ...p, ignoreNullValues: e.target.checked }))}
                                    />
                                </label>

                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2"></div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ignore Specific Keys</span>
                                    <Input
                                        placeholder="timestamp, requestId..."
                                        className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
                                        value={tempIgnoreKeysInput}
                                        onChange={(e) => {
                                            setTempIgnoreKeysInput(e.target.value);
                                            const parsedKeys = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
                                            setTempConfig(p => ({ ...p, ignoreKeys: parsedKeys }));
                                        }}
                                    />
                                    <span className="text-[11px] text-muted-foreground">Enter a comma separated list of exact key names to completely skip them during structural traversal.</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setTempConfig({ ignoreArrayOrder: false, ignoreNullValues: false, ignoreKeys: [] });
                                        setTempIgnoreKeysInput("");
                                    }}
                                >
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => {
                                        setConfig(tempConfig);
                                        setIgnoreKeysInput(tempIgnoreKeysInput);
                                        setIsDialogOpen(false);
                                    }}
                                >
                                    Update
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* 3 Split Panes */}
            <div className="flex flex-1 min-h-0 overflow-hidden divide-x dark:divide-zinc-800">

                {/* JSON A Input */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 relative bg-white dark:bg-zinc-950">
                    <div className="text-xs font-semibold px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider flex justify-between items-center h-10">
                        <span>Original View (A)</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-indigo-500"
                            onClick={() => handleBeautify(textA, setTextA, "JSON A")}
                            title="Beautify JSON A"
                        >
                            <Wand2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Editor
                            height="100%"
                            language="json"
                            theme={editorTheme}
                            value={textA}
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
                            onChange={(val) => setTextA(val || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                padding: { top: 16 }
                            }}
                        />
                    </div>
                </div>

                {/* JSON B Input */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 relative bg-white dark:bg-zinc-950">
                    <div className="text-xs font-semibold px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider flex justify-between items-center h-10">
                        <span>Modified View (B)</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-indigo-500"
                            onClick={() => handleBeautify(textB, setTextB, "JSON B")}
                            title="Beautify JSON B"
                        >
                            <Wand2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Editor
                            height="100%"
                            language="json"
                            theme={editorTheme}
                            value={textB}
                            onChange={(val) => setTextB(val || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbersMinChars: 3,
                                padding: { top: 16 }
                            }}
                        />
                    </div>
                </div>

                {/* Compare Output */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 bg-[#fafafa] dark:bg-zinc-950/40">
                    <div className="text-xs font-semibold px-4 py-2 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider shadow-sm z-10 flex justify-between items-center h-10">
                        <span>Intersection Analysis</span>
                        {compareData && (
                            <div className="flex gap-3 text-[10px] font-bold">
                                {compareData.removed.length > 0 && <span className="text-red-500">{compareData.removed.length} Removed</span>}
                                {compareData.added.length > 0 && <span className="text-green-500">{compareData.added.length} Added</span>}
                                {compareData.changed.length > 0 && <span className="text-orange-500">{compareData.changed.length} Mutated</span>}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4 select-text">
                        {!compareData ? (
                            <div className="text-center text-muted-foreground text-sm flex flex-col gap-2 items-center opacity-50 mt-10">
                                <GitCompare className="w-8 h-8 mx-auto mb-2" />
                                <span>Paste valid JSON to analyze keys & values.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {/* Removed Section */}
                                {compareData.removed.length > 0 && (
                                    <div className="flex flex-col border border-red-200 dark:border-red-900/50 rounded-md overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
                                        <div className="bg-red-50 dark:bg-red-900/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-900/50 uppercase tracking-wide">
                                            Keys Missing from (B)
                                        </div>
                                        <div className="p-3 font-mono text-xs flex flex-col gap-3">
                                            {compareData.removed.map((item, idx) => (
                                                <div key={idx} className="flex flex-col border-b border-red-100 dark:border-red-900/30 pb-2 last:border-0 last:pb-0 gap-1 break-all">
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.path || "root"}</span>
                                                    <div className="flex gap-2 items-center text-red-600 dark:text-red-400">
                                                        <span className="opacity-60 font-semibold">A:</span>
                                                        <span className="truncate">{item.valA}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Added Section */}
                                {compareData.added.length > 0 && (
                                    <div className="flex flex-col border border-green-200 dark:border-green-900/50 rounded-md overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
                                        <div className="bg-green-50 dark:bg-green-900/10 px-3 py-2 text-xs font-bold text-green-600 dark:text-green-400 border-b border-green-200 dark:border-green-900/50 uppercase tracking-wide">
                                            New Keys Found in (B)
                                        </div>
                                        <div className="p-3 font-mono text-xs flex flex-col gap-3">
                                            {compareData.added.map((item, idx) => (
                                                <div key={idx} className="flex flex-col border-b border-green-100 dark:border-green-900/30 pb-2 last:border-0 last:pb-0 gap-1 break-all">
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.path || "root"}</span>
                                                    <div className="flex gap-2 items-center text-green-600 dark:text-green-400">
                                                        <span className="opacity-60 font-semibold">B:</span>
                                                        <span className="truncate">{item.valB}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Changed Section */}
                                {compareData.changed.length > 0 && (
                                    <div className="flex flex-col border border-orange-200 dark:border-orange-900/50 rounded-md overflow-hidden shadow-sm bg-white dark:bg-zinc-950">
                                        <div className="bg-orange-50 dark:bg-orange-900/10 px-3 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 border-b border-orange-200 dark:border-orange-900/50 uppercase tracking-wide">
                                            Mutated Values
                                        </div>
                                        <div className="p-3 font-mono text-xs flex flex-col gap-3">
                                            {compareData.changed.map((item, idx) => (
                                                <div key={idx} className="flex flex-col border-b last:border-0 border-orange-100 dark:border-orange-900/30 pb-3 last:pb-0 gap-1.5 break-all">
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.path || "root"}</span>
                                                    <div className="flex flex-col gap-1 pl-2 border-l-2 border-orange-200 dark:border-orange-800/50">
                                                        <div className="flex gap-2 items-center text-zinc-500 line-through">
                                                            <span className="opacity-60 font-semibold no-underline">A:</span>
                                                            <span className="truncate">{item.valA}</span>
                                                        </div>
                                                        <div className="flex gap-2 items-center text-orange-600 dark:text-orange-400">
                                                            <span className="opacity-60 font-semibold">B:</span>
                                                            <span className="truncate">{item.valB}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {compareData.added.length === 0 && compareData.removed.length === 0 && compareData.changed.length === 0 && (
                                    <div className="p-4 bg-green-50/50 dark:bg-green-900/5 text-center rounded-md border border-green-100 dark:border-green-900/20 text-green-600 dark:text-green-400 font-medium text-sm">
                                        Both objects are completely identical!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
