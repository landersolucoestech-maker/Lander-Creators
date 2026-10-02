"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Runs a JSON API mutation, surfaces the safe PT-BR error message and refreshes server data on success. */
export function useApiAction() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(url: string, method: "POST" | "PATCH", body: unknown, fallback: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error?.message ?? fallback);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMessage(fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** Surfaces a client-side validation message in the same notice region. */
  function fail(text: string) {
    setMessage(text);
  }

  return { message, busy, run, fail };
}
