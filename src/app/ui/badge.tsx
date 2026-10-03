import type { HTMLAttributes } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * FOUNDATION_NEW Badge primitive (Etapa 02 U1). Purely visual/semantic
 * (`variant="success"`); domain -> appearance mapping belongs to the
 * consuming page (e.g. a future `campaignStatusToBadgeVariant`), not here.
 */
export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
  const classes = ["lc-badge", `lc-badge--${variant}`, className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
