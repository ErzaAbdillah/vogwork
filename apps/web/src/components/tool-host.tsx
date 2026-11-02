"use client";

import { useT } from "@vogwork/i18n";
import { Alert, Button, Spinner, useIsClient } from "@vogwork/ui";
import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { shell } from "@/lib/dict";
import { registry } from "@/lib/tools";

function ToolLoading() {
  const t = useT(shell);
  return (
    <div className="flex min-h-64 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
      <Spinner /> {t("loadingTool")}
    </div>
  );
}

function ToolError({ onRetry, detail }: { onRetry: () => void; detail?: string }) {
  const t = useT(shell);
  return (
    <Alert
      variant="error"
      title={t("toolError")}
      action={
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      }
    >
      {t("toolErrorHint")}
      {detail && <span className="mt-1 block font-mono text-xs opacity-70">{detail}</span>}
    </Alert>
  );
}

class Boundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <ToolError
          detail={this.state.error.message}
          onRetry={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        />
      );
    }
    return this.props.children;
  }
}

type Loaded = { status: "loading" } | { status: "ready"; Component: ComponentType } | { status: "error"; error: Error };

function LoadedTool({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const tool = registry.get(id);
    if (!tool) return;
    tool
      .ui()
      .then((mod) => alive && setLoaded({ status: "ready", Component: mod.default }))
      .catch((error: Error) => alive && setLoaded({ status: "error", error }));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const retry = () => {
    setLoaded({ status: "loading" });
    setAttempt((a) => a + 1);
  };

  if (loaded.status === "loading") return <ToolLoading />;
  if (loaded.status === "error") return <ToolError detail={loaded.error.message} onRetry={retry} />;
  const { Component } = loaded;
  return (
    <Boundary onRetry={retry}>
      <Component />
    </Boundary>
  );
}

/**
 * Memuat antarmuka tool lewat registry hanya di browser: halaman statis
 * berisi kerangka, lalu kode tool diunduh saat halaman dibuka.
 */
export function ToolHost({ id }: { id: string }) {
  const isClient = useIsClient();
  return isClient ? <LoadedTool id={id} /> : <ToolLoading />;
}
