import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { RealtimeProvider } from "./components/RealtimeProvider";
import { useThemeSync } from "./hooks/useTheme";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ThemeSyncWrapper({ children }: { children: React.ReactNode }) {
  useThemeSync();
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSyncWrapper>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
        <Toaster position="top-right" richColors />
      </ThemeSyncWrapper>
    </QueryClientProvider>
  );
}
