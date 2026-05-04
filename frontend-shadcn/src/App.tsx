import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useThemeSync } from "./hooks/useTheme";

export function App() {
  useThemeSync();
  return <RouterProvider router={router} />;
}
