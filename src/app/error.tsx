"use client";

import { useEffect } from "react";
import { useLang } from "@/components/LangProvider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl font-semibold">{t("err.generic")}</h1>
      {process.env.NODE_ENV !== "production" && (
        <p className="mx-auto mt-4 max-w-xl rounded-xl bg-sand p-4 text-left font-mono text-xs text-ink-soft">
          {error.message}
        </p>
      )}
      <button onClick={reset} className="btn-primary mt-8">
        {t("common.retry")}
      </button>
    </div>
  );
}
