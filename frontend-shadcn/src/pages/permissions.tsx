import { useTranslation } from "react-i18next"

import { usePermissionCategories } from "@/hooks/usePermissions"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Permissions() {
  const { t } = useTranslation()
  const { data: categories, isLoading } = usePermissionCategories()

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("permissions.title", "Permissions")}
        description={t(
          "permissions.description",
          "System permissions grouped by category",
        )}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {categories?.map((cat) => (
            <Card key={cat.category}>
              <CardHeader>
                <CardTitle className="text-lg">{cat.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("permissionsPage.code", "Code")}</TableHead>
                      <TableHead>{t("permissionsPage.name", "Name")}</TableHead>
                      <TableHead>
                        {t("permissionsPage.resource", "Resource")}
                      </TableHead>
                      <TableHead>{t("permissionsPage.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {perm.code}
                          </Badge>
                        </TableCell>
                        <TableCell>{perm.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {perm.resource}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {perm.action}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
