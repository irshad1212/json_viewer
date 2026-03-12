import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, onCheckedChange, ...props }, forwardedRef) => {
    const localRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <span className={cn("relative inline-flex items-center justify-center", className)}>
        <input
          ref={(node) => {
            localRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 appearance-none rounded border border-input bg-background text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "checked:border-primary checked:bg-primary checked:text-primary-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          onChange={(e) => {
            props.onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          {...props}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 transition-opacity duration-150 ease-in-out peer-checked:opacity-100 peer-disabled:opacity-50"
        >
          <path
            d="M3 8.2 6.2 11l6.5-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
