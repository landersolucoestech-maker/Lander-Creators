import type { SVGAttributes } from "react";

/**
 * FOUNDATION_NEW icon set (Etapa 02 U1). Internal SVG, no external icon
 * library. Covers navigation/action/status/utility icons required by the
 * 27 canonical references (docs/reference-ui/ETAPA-01-AUDITORIA.md, section 10).
 */
const ICON_PATHS = {
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-left": "M15 6l-6 6 6 6",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 13l4 4L19 7",
  add: "M12 5v14M5 12h14",
  edit: "M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L4.5 17v3zM14 6.5l3.5 3.5",
  delete: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
  upload: "M12 21V9m0 0l-4 4m4-4l4 4M4 5h16",
  "external-link": "M9 6h-4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4M14 4h6v6M20 4l-9 9",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  filter: "M4 5h16M7 12h10M10 19h4",
  menu: "M4 6h16M4 12h16M4 18h16",
  notification: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM10.5 21a1.5 1.5 0 0 0 3 0",
  warning: "M12 3l10 18H2L12 3zM12 10v4M12 17h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7h.01",
  success: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-5",
  error: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6"
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
  name: IconName;
  size?: number;
  label?: string;
}

/** Decorative by default (`aria-hidden`); pass `label` to expose it to assistive tech. */
export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  const path = ICON_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      <path d={path} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
