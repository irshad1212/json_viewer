"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

function GuideContent() {
  const [queryLang, setQueryLang] = useState<"jsonpath" | "jmespath" | "jq">("jsonpath");
  const searchParams = useSearchParams();
  const docType = searchParams.get("type");

  if (docType !== "json-query") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Documentation</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Please select a specific documentation topic from the application.
        </p>
        <Link href="/" className="mt-8 text-blue-600 hover:underline">
          Return to JSON Viewer
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-zinc-950">
        <div className="container flex h-14 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 items-center">
              <h1 className="text-sm font-semibold sm:text-base">JSON Query Guide</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">Syntax:</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-ring w-[140px]">
                {queryLang === "jsonpath" && "JSONPath"}
                {queryLang === "jmespath" && "JMESPath"}
                {queryLang === "jq" && "jq"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[140px]">
                <DropdownMenuItem onClick={() => setQueryLang("jsonpath")}>JSONPath</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQueryLang("jmespath")}>JMESPath</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQueryLang("jq")}>jq</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        {queryLang === "jsonpath" ? (
          <article className="prose prose-zinc dark:prose-invert max-w-none">
            <h1 className="text-3xl font-bold tracking-tight mb-4 text-center sm:text-left">Filtering JSON Data</h1>
            <p className="text-lg text-muted-foreground mb-8">
              The JSON Viewer uses a simplified querying syntax inspired by JSONPath to help you find precisely what you're looking for in large JSON documents.
            </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Syntax Notation</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse border border-border">
                <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-border text-foreground">
                  <tr>
                    <th className="px-4 py-3 border-r border-border font-semibold w-1/4">Notation</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">$</td>
                    <td className="px-4 py-3 text-muted-foreground">The root object or array. This is strictly optional in our viewer (e.g., <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">$.foo</code> is the same as <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">foo</code>).</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">@</td>
                    <td className="px-4 py-3 text-muted-foreground">The current node being processed by a filter predicate.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">.property</td>
                    <td className="px-4 py-3 text-muted-foreground">Selects the specified property in a parent object.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">['property']</td>
                    <td className="px-4 py-3 text-muted-foreground">Selects a property. Use this if the name contains spaces or special characters.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">[n]</td>
                    <td className="px-4 py-3 text-muted-foreground">Selects the exactly nth element from an array. Indexing is 0-based.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">*</td>
                    <td className="px-4 py-3 text-muted-foreground">Wildcard. Selects all elements in an object or an array, regardless of their names or indexes.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-border font-mono text-blue-600 dark:text-blue-400 font-medium">[?(expression)]</td>
                    <td className="px-4 py-3 text-muted-foreground">Filter expression. Selects all elements in an object or array that match the specified filter predicate.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Basic Access</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $.store.book[0].title
                </div>
                <div className="px-4 py-3 text-sm">
                  Access nested properties using dot notation <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.</code> and arrays using brackets <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">[0]</code>. The <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">$</code> prefix is optional.
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $['First Name']
                </div>
                <div className="px-4 py-3 text-sm">
                  Use bracket notation with quotes for properties containing spaces or special characters.
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Wildcards & Arrays</h2>
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $.store.book[*]
                </div>
                <div className="px-4 py-3 text-sm">
                  The <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">[*]</code> wildcard selects all elements within an array. It flattens the contents to return an array of all the internal items.
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $[*]['First Name']
                </div>
                <div className="px-4 py-3 text-sm">
                  Extract a specific property from an array of objects. This will return a list containing just the "First Name" of every object in the root array.
                </div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Condition Filters</h2>
            <p className="mb-4">
              You can filter arrays for objects matching specific property values using the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">[?(@.property == value)]</code> syntax.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $.results.data[*].meetings[?(@.id == 692)]
                </div>
                <div className="px-4 py-3 text-sm">
                  Filters the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">meetings</code> array to only return items where the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">id</code> property exactly matches the number 692.
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                  $[?(@.Country == "United States")]
                </div>
                <div className="px-4 py-3 text-sm">
                  Matches objects in the root array where the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">Country</code> is exactly the string "United States". Note the use of quotes for strings.
                </div>
              </div>
            </div>
          </section>

        <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-2xl font-semibold mb-6">Practical Examples</h2>
            
            <div className="space-y-10">
              {/* Example 1: Simple Object */}
              <div>
                <h3 className="text-xl font-medium mb-3">1. Accessing Simple Objects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                    <pre>{`{
  "user": {
    "id": 42,
    "username": "jdoe",
    "isAdmin": true
  }
}`}</pre>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 dark:bg-zinc-950 px-3 py-1.5 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                        $.user.username
                      </div>
                      <div className="px-3 py-2 text-sm text-muted-foreground flex flex-col items-start gap-1">
                        <span>Returns:</span>
                        <code className="text-emerald-600 dark:text-emerald-400">"jdoe"</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example 2: Flat Array of Objects */}
              <div>
                <h3 className="text-xl font-medium mb-3">2. Filtering Arrays of Objects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                    <pre>{`[
  { "name": "Alice", "role": "developer" },
  { "name": "Bob", "role": "designer" },
  { "name": "Charlie", "role": "developer" }
]`}</pre>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 dark:bg-zinc-950 px-3 py-1.5 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                        $[*].name
                      </div>
                      <div className="px-3 py-2 text-sm text-muted-foreground flex flex-col items-start gap-1">
                        <span>Extracts names:</span>
                        <code className="text-emerald-600 dark:text-emerald-400">["Alice", "Bob", "Charlie"]</code>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 dark:bg-zinc-950 px-3 py-1.5 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                        $[?(@.role == "developer")]
                      </div>
                      <div className="px-3 py-2 text-sm text-muted-foreground flex flex-col items-start gap-1">
                        <span>Filters users:</span>
                        <code className="text-emerald-600 dark:text-emerald-400">Array (2 items)</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example 3: Deeply Nested Data */}
              <div>
                <h3 className="text-xl font-medium mb-3">3. Deeply Nested Arrays</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto">
                    <pre>{`{
  "department": "Engineering",
  "teams": [
    {
      "name": "Frontend",
      "members": [
        { "id": 1, "active": true },
        { "id": 2, "active": false }
      ]
    }
  ]
}`}</pre>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 dark:bg-zinc-950 px-3 py-1.5 font-mono text-sm border-b border-border text-blue-600 dark:text-blue-400">
                        $.teams[*].members[?(@.active == true)]
                      </div>
                      <div className="px-3 py-2 text-sm text-muted-foreground flex flex-col items-start gap-1">
                        <span>Finds active members across all teams. Returns:</span>
                        <code className="text-emerald-600 dark:text-emerald-400">[{`{"id": 1, "active": true}`}]</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          </article>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Guide Under Construction</h2>
            <p className="text-muted-foreground max-w-md">
              We are currently working on documentation for {queryLang === "jmespath" ? "JMESPath" : "jq"}. Please check back later or switch back to JSONPath for available reference.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading documentation...</div>}>
      <GuideContent />
    </Suspense>
  );
}
