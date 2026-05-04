import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Terminal } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface SystemLog {
  timestamp: string;
  level: string;
  message: string;
}

const LEVEL_CLASS: Record<string, string> = {
  error: "text-red-400",
  warn: "text-yellow-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
  debug: "text-gray-500",
};

function LogLine({ log }: { log: SystemLog }) {
  const cls = LEVEL_CLASS[log.level?.toLowerCase()] ?? "text-gray-300";
  const ts = log.timestamp?.slice(0, 23) ?? "";
  return (
    <div className="font-mono text-xs leading-5 whitespace-pre-wrap break-all">
      <span className="text-muted-foreground">{ts}</span>{" "}
      <span className={cls}>[{log.level?.toUpperCase()}]</span>{" "}
      <span className="text-foreground">{log.message}</span>
    </div>
  );
}

export default function SystemLogs() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system-logs"],
    queryFn: () =>
      api.get<SystemLog[]>("/api/v1/system-logs").then((r) => r.data),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  const logs = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("systemLogs.title", "System Logs")}
        description={t(
          "systemLogs.description",
          "Real-time application log viewer",
        )}
      >
        <Badge variant="outline" className="gap-1">
          <Terminal className="size-3" />
          {t("systemLogs.entries", "{{count}} entries", {
            count: logs.length,
          })}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-1 size-4 ${isFetching ? "animate-spin" : ""}`} />
          {t("common.refresh", "Refresh")}
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="h-[600px] overflow-y-auto bg-zinc-950 p-4 dark:bg-zinc-900"
            >
              {logs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("systemLogs.empty", "No logs available")}
                </p>
              ) : (
                logs.map((log, i) => <LogLine key={i} log={log} />)
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
