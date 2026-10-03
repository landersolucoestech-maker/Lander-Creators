import { notFound } from "next/navigation";
import { parseEnv } from "@/server/config/env";
import { ShellPreview } from "./shell-preview";

/**
 * Isolated, non-production visual harness for the Etapa 03 U2 Application
 * Shell (Sidebar/Topbar/PageContainer/mobile drawer). Not linked from any
 * navigation. Mirrors the /dev/foundation precedent: dev-only, 404s in a
 * production build, uses controlled fixture data exclusively for isolated
 * visualization (never substitutes for real application state).
 */
export default function ShellPreviewPage() {
  if (parseEnv(process.env).NODE_ENV === "production") notFound();
  return <ShellPreview />;
}
