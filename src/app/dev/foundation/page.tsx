import { notFound } from "next/navigation";
import { parseEnv } from "@/server/config/env";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Icon, ICON_NAMES } from "../../ui/icons";

const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "danger"] as const;
const BADGE_VARIANTS = ["success", "warning", "danger", "info", "neutral", "brand"] as const;
const COLOR_TOKENS = [
  "background", "surface", "surface-subtle", "text-primary", "text-secondary", "text-muted",
  "border", "border-strong", "brand-primary", "brand-primary-hover", "brand-primary-active",
  "brand-primary-subtle", "success", "success-subtle", "warning", "warning-subtle",
  "danger", "danger-subtle", "info", "info-subtle", "neutral", "neutral-subtle"
];

/**
 * Isolated, non-production visual harness for the FOUNDATION_NEW design
 * tokens (Etapa 02 U1). Not linked from any navigation. No Storybook/new
 * platform introduced per the Etapa 02 brief, section 17 — this route is the
 * reused mechanism for manual + Playwright visual inspection of tokens,
 * icons, Button and Badge in isolation, without touching product pages.
 */
export default function FoundationPreviewPage() {
  if (parseEnv(process.env).NODE_ENV === "production") notFound();

  return (
    <div className="lc-surface" style={{ padding: 32, display: "grid", gap: 40 }}>
      <h1 style={{ fontSize: "var(--lc-font-size-page-title)", fontWeight: "var(--lc-font-weight-bold)" }}>
        Foundation Visual — Etapa 02 U1
      </h1>

      <section aria-labelledby="colors-heading">
        <h2 id="colors-heading">Color tokens</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {COLOR_TOKENS.map((token) => (
            <div key={token} style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  height: 48,
                  borderRadius: "var(--lc-radius-sm)",
                  border: "var(--lc-border-default)",
                  background: `var(--lc-color-${token})`
                }}
              />
              <span style={{ fontSize: "var(--lc-font-size-caption)" }}>--lc-color-{token}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">Button</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
          <Button variant="primary" disabled>
            disabled
          </Button>
          <Button variant="primary" loading>
            loading
          </Button>
          <Button variant="icon" icon="add" aria-label="Adicionar" />
        </div>
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading">Badge</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </section>

      <section aria-labelledby="icons-heading">
        <h2 id="icons-heading">Icons</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 12 }}>
          {ICON_NAMES.map((name) => (
            <div key={name} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
              <Icon name={name} label={name} />
              <span style={{ fontSize: "var(--lc-font-size-caption)" }}>{name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
