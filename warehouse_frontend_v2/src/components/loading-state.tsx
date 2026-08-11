import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingStateProps = {
  label: string;
  className?: string;
};

type TableLoadingStateProps = LoadingStateProps & {
  columns: number;
  rows?: number;
};

export function InlineLoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function PanelLoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">Please wait a moment.</p>
      </div>
    </div>
  );
}

export function TableLoadingState({ label, columns, rows = 6, className }: TableLoadingStateProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr
          key={rowIndex}
          className={cn("border-b border-border/60", className)}
          aria-hidden="true"
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="p-4">
              <Skeleton
                className={cn(
                  "h-4",
                  columnIndex === 0
                    ? "w-24"
                    : columnIndex === columns - 1
                      ? "ml-auto w-16"
                      : "w-full max-w-32",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only" role="status" aria-live="polite">
        <td colSpan={columns}>{label}</td>
      </tr>
    </>
  );
}

export function PageLoadingState({ label, className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="flex flex-wrap items-end justify-between gap-3" aria-hidden="true">
        <div className="space-y-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card space-y-3 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3" aria-hidden="true">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="surface-card overflow-hidden" aria-hidden="true">
        <div className="border-b border-border/60 bg-secondary/40 p-4">
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
