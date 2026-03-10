import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean };

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, forwardedRef) => {
    const localRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      if (localRef.current) {
        localRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <input
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }}
        type="checkbox"
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-input bg-background text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
