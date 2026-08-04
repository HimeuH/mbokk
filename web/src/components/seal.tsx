import { cn } from "@/lib/utils";

/**
 * The propose→approve workflow's visual anchor: an empty ring means a
 * proposal is awaiting an admin/owner, a filled brass seal means it (or the
 * person it's attached to) has been stamped. "half" is the in-between state
 * used while an approval is in flight. Deliberately not a status pill —
 * approving a proposal should read as sealing the register, not clearing a
 * notification.
 */
export function Seal({
  status,
  size = "md",
  className,
}: {
  status: "stamped" | "pending" | "half";
  size?: "sm" | "md";
  className?: string;
}) {
  const dimension = size === "sm" ? "size-4" : "size-6";

  if (status === "pending") {
    return (
      <span
        aria-label="En attente de validation"
        className={cn(
          dimension,
          "shrink-0 rounded-full border-2 border-dashed border-muted-foreground/50",
          className
        )}
      />
    );
  }

  if (status === "half") {
    return (
      <span
        aria-label="Validation en cours"
        className={cn(dimension, "shrink-0 rounded-full ring-1 ring-inset ring-black/25", className)}
        style={{
          background:
            "conic-gradient(var(--accent) 0deg 180deg, transparent 180deg 360deg)",
        }}
      />
    );
  }

  return (
    <span
      aria-label="Public et validé"
      className={cn(dimension, "shrink-0 rounded-full bg-accent ring-1 ring-inset ring-black/25", className)}
    />
  );
}
