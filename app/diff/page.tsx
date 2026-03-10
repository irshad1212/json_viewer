"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileJson, Wand2, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import Link from "next/link";

type DiffLineType = "unchanged" | "removed" | "added";

interface DiffLine {
    type: DiffLineType;
    indent: number;
    text: string;
}

function isOrdinaryObject(obj: any) {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function stringifyToLines(
    val: any,
    key: string | null,
    indent: number,
    lines: DiffLine[],
    type: DiffLineType,
    isLast: boolean
) {
    const prefix = key ? `"${key}": ` : "";
    if (isOrdinaryObject(val)) {
        const keys = Object.keys(val);
        if (keys.length === 0) {
            lines.push({ indent, type, text: prefix + "{}" + (isLast ? "" : ",") });
            return;
        }
        lines.push({ indent, type, text: prefix + "{" });
        keys.forEach((k, idx) => {
            stringifyToLines(val[k], k, indent + 1, lines, type, idx === keys.length - 1);
        });
        lines.push({ indent, type, text: "}" + (isLast ? "" : ",") });
    } else if (Array.isArray(val)) {
        if (val.length === 0) {
            lines.push({ indent, type, text: prefix + "[]" + (isLast ? "" : ",") });
            return;
        }
        lines.push({ indent, type, text: prefix + "[" });
        val.forEach((item, idx) => {
            stringifyToLines(item, null, indent + 1, lines, type, idx === val.length - 1);
        });
        lines.push({ indent, type, text: "]" + (isLast ? "" : ",") });
    } else {
        lines.push({
            indent,
            type,
            text: prefix + JSON.stringify(val) + (isLast ? "" : ","),
        });
    }
}

function compareNodes(
    oldNode: any,
    newNode: any,
    key: string | null,
    indent: number,
    lines: DiffLine[],
    isLast: boolean
) {
    if (oldNode === newNode) {
        stringifyToLines(oldNode, key, indent, lines, "unchanged", isLast);
        return;
    }

    if (JSON.stringify(oldNode) === JSON.stringify(newNode)) {
        stringifyToLines(oldNode, key, indent, lines, "unchanged", isLast);
        return;
    }

    if (oldNode === undefined) {
        stringifyToLines(newNode, key, indent, lines, "added", isLast);
        return;
    }

    if (newNode === undefined) {
        stringifyToLines(oldNode, key, indent, lines, "removed", isLast);
        return;
    }

    if (isOrdinaryObject(oldNode) && isOrdinaryObject(newNode)) {
        const prefix = key ? `"${key}": ` : "";
        lines.push({ indent, type: "unchanged", text: prefix + "{" });

        const oldKeys = Object.keys(oldNode);
        const newKeys = Object.keys(newNode);
        const allKeys = Array.from(new Set([...oldKeys, ...newKeys])).sort();

        allKeys.forEach((k, i) => {
            const childIsLast = i === allKeys.length - 1;
            compareNodes(oldNode[k], newNode[k], k, indent + 1, lines, childIsLast);
        });

        lines.push({ indent, type: "unchanged", text: "}" + (isLast ? "" : ",") });
        return;
    }

    if (Array.isArray(oldNode) && Array.isArray(newNode)) {
        const prefix = key ? `"${key}": ` : "";
        lines.push({ indent, type: "unchanged", text: prefix + "[" });

        const maxLen = Math.max(oldNode.length, newNode.length);
        for (let i = 0; i < maxLen; i++) {
            const childIsLast = i === maxLen - 1;
            compareNodes(oldNode[i], newNode[i], null, indent + 1, lines, childIsLast);
        }

        lines.push({ indent, type: "unchanged", text: "]" + (isLast ? "" : ",") });
        return;
    }

    stringifyToLines(oldNode, key, indent, lines, "removed", isLast);
    stringifyToLines(newNode, key, indent, lines, "added", isLast);
}

export default function DiffPage() {
    const [textA, setTextA] = useState("");
    const [textB, setTextB] = useState("");
    const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        try {
            setError(null);
            const strA = textA.trim();
            const strB = textB.trim();

            if (!strA && !strB) {
                setDiffLines([]);
                return;
            }

            const objA = strA ? JSON.parse(strA) : undefined;
            const objB = strB ? JSON.parse(strB) : undefined;

            const lines: DiffLine[] = [];
            compareNodes(objA, objB, null, 0, lines, true);
            setDiffLines(lines);
        } catch (e: any) {
            setError("Invalid JSON format");
        }
    }, [textA, textB]);

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
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground mr-2">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <FileJson className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-sm font-semibold text-foreground dark:text-zinc-100 uppercase tracking-wider">
                        Structural JSON Diff
                    </h1>
                </div>
                <div className="flex items-center gap-4 pr-4 text-sm font-medium">
                    {error && <span className="text-red-500">{error}</span>}
                </div>
            </header>

            {/* 3 Split Panes */}
            <div className="flex flex-1 min-h-0 overflow-hidden divide-x dark:divide-zinc-800">

                {/* JSON A Input */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 relative bg-white dark:bg-zinc-950">
                    <div className="text-xs font-semibold px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider flex justify-between items-center h-10">
                        <span>Original JSON (A)</span>
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
                    <textarea
                        className="flex-1 w-full h-full resize-none p-4 font-mono text-[13px] leading-6 focus:outline-none bg-transparent dark:text-zinc-100"
                        placeholder="Paste original JSON..."
                        value={textA}
                        onChange={(e) => setTextA(e.target.value)}
                        spellCheck={false}
                    />
                </div>

                {/* JSON B Input */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 relative bg-white dark:bg-zinc-950">
                    <div className="text-xs font-semibold px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider flex justify-between items-center h-10">
                        <span>Modified JSON (B)</span>
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
                    <textarea
                        className="flex-1 w-full h-full resize-none p-4 font-mono text-[13px] leading-6 focus:outline-none bg-transparent dark:text-zinc-100"
                        placeholder="Paste modified JSON..."
                        value={textB}
                        onChange={(e) => setTextB(e.target.value)}
                        spellCheck={false}
                    />
                </div>

                {/* Diff Output */}
                <div className="flex-1 flex flex-col w-1/3 min-h-0 bg-[#fafafa] dark:bg-zinc-950/40">
                    <div className="text-xs font-semibold px-4 py-2 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 text-muted-foreground uppercase tracking-wider shadow-sm z-10 flex justify-between items-center h-10">
                        <span>Comparison Result</span>
                        {diffLines.length > 0 && <span className="text-indigo-500 text-[10px]">{diffLines.length} lines</span>}
                    </div>

                    <div className="flex-1 overflow-auto p-4 select-text">
                        <div className="font-mono text-[13px] leading-6 flex flex-col border rounded-md bg-white dark:bg-zinc-950 shadow-sm border-zinc-200 dark:border-zinc-800 overflow-hidden min-w-max">
                            {diffLines.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col gap-2 items-center opacity-50">
                                    <FileJson className="w-8 h-8 mx-auto mb-2" />
                                    <span>Waiting for valid JSON objects to compare...</span>
                                </div>
                            ) : (
                                diffLines.map((line, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "px-4 py-0 flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                                            line.type === "added" && "bg-green-100/40 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20",
                                            line.type === "removed" && "bg-red-100/40 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20",
                                            line.type === "unchanged" && "text-zinc-600 dark:text-zinc-400 opacity-60"
                                        )}
                                    >
                                        <div className="w-8 shrink-0 text-center select-none font-bold opacity-60 border-r border-transparent dark:border-transparent mr-4 flex justify-center">
                                            {line.type === "added" && "+"}
                                            {line.type === "removed" && "-"}
                                            {line.type === "unchanged" && "·"}
                                        </div>
                                        <div
                                            style={{ paddingLeft: `${line.indent * 1.5}rem` }}
                                            className="flex-1 whitespace-pre-wrap break-all"
                                        >
                                            {line.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
