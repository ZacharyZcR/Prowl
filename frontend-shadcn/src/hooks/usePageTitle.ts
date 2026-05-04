import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `Prowl Range - ${title}` : "Prowl Range";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
