import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  children?: React.ReactNode
}

export function FilterBar({
  search,
  onSearchChange,
  placeholder,
  children,
}: FilterBarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder ?? t("common.search", "Search...")}
          className="pl-8"
        />
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
