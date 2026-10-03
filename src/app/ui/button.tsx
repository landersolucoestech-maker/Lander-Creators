import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
}

/** FOUNDATION_NEW Button primitive (Etapa 02 U1). Consumes --lc-* tokens only. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  if (variant === "icon" && !children && !rest["aria-label"]) {
    console.warn("Button: icon-only variant requires an aria-label.");
  }

  const classes = ["lc-button", `lc-button--${variant}`, `lc-button--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="lc-button-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={18} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
