"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CopyButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    value: string;
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function CopyButton({
    value,
    className,
    variant = "outline",
    ...props
}: CopyButtonProps) {
    const [hasCopied, setHasCopied] = React.useState(false);

    React.useEffect(() => {
        setTimeout(() => {
            setHasCopied(false);
        }, 2000);
    }, [hasCopied]);

    return (
        <Tooltip>
            <TooltipTrigger
                type="button"
                className={cn(
                    buttonVariants({ variant, size: "icon", className })
                )}
                onClick={() => {
                    navigator.clipboard.writeText(value);
                    setHasCopied(true);
                }}
                {...props}
            >
                <span className="sr-only">Copy</span>
                {hasCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
        </Tooltip>
    );
}
