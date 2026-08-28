export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 py-12 text-center">
      <p className="font-medium text-red-500">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-subtle"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** A pulsing placeholder bar, for skeletons that mirror the shape of the content they stand in for. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-subtle ${className ?? ""}`} aria-hidden="true" />;
}

/**
 * A quiet, single-line failure notice for secondary content (rails, related
 * reading) where a full boxed ErrorState would outweigh what it is reporting.
 */
export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-[0.9375rem] text-muted">
      <span>{message}</span>
      <button onClick={onRetry} className="font-medium text-accent hover:text-accent-hover">
        Try again
      </button>
    </div>
  );
}
