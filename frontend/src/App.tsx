import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { RealtimeProvider } from "./components/RealtimeProvider";
import { TransitionOverlay } from "./components/TransitionOverlay";
import { useThemeSync } from "./hooks/useTheme";
import i18n from "./i18n";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : i18n.t("common.operationFailed");
      toast.error(message);
    },
  }),
});

function ThemeSyncWrapper({ children }: { children: React.ReactNode }) {
  useThemeSync();
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSyncWrapper>
        <RealtimeProvider>
          <RouterProvider router={router} />
          <TransitionOverlay />
        </RealtimeProvider>
        <Toaster position="top-right" richColors />
      </ThemeSyncWrapper>
    </QueryClientProvider>
  );
}
