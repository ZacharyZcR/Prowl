import { useEffect, useRef, useState } from "react"
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  loading?: boolean
  enableSelection?: boolean
  onSelectionChange?: (rows: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  loading = false,
  enableSelection = false,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()

  const allColumns: ColumnDef<TData, TValue>[] = enableSelection
    ? [
        {
          id: "select",
          header: ({ table }) => (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected()
              }}
              onChange={(e) =>
                table.toggleAllPageRowsSelected(e.target.checked)
              }
              aria-label={t("common.selectAll", "Select all")}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={row.getIsSelected()}
              onChange={(e) => row.toggleSelected(e.target.checked)}
              aria-label={t("common.selectRow", "Select row")}
            />
          ),
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const callbackRef = useRef(onSelectionChange)
  callbackRef.current = onSelectionChange

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
  })

  useEffect(() => {
    if (!callbackRef.current) return
    const selected = table
      .getSelectedRowModel()
      .rows.map((row) => row.original)
    callbackRef.current(selected)
  }, [rowSelection, table])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {allColumns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.noData", "No data")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {onPageChange && total > 0 && (
        <div className="flex items-center justify-between px-2">
          {enableSelection && (
            <div className="text-sm text-muted-foreground">
              {t("common.rowsSelected", "{{count}} row(s) selected", {
                count: table.getFilteredSelectedRowModel().rows.length,
              })}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("common.pageInfo", "Page {{page}} of {{total}}", {
                page,
                total: totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft />
              <span className="sr-only">
                {t("common.previous", "Previous")}
              </span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight />
              <span className="sr-only">{t("common.next", "Next")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
