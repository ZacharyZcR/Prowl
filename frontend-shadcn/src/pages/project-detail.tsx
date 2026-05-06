import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"

import { useProject } from "@/hooks/useProjects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const statusBadgeVariant: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  planning: "secondary",
  active: "default",
  completed: "outline",
  archived: "destructive",
}

export default function ProjectDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id) || 0

  const { data: project, isLoading } = useProject(projectId)

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-9 w-32" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="size-4" />
          {t("common.back", "Back")}
        </Button>
        <p className="mt-4 text-muted-foreground">
          {t("projects.notFound", "Project not found")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="size-4" />
          {t("common.back", "Back")}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <Badge variant={statusBadgeVariant[project.status] ?? "secondary"}>
          {project.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("projects.description", "Description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {project.description || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("projects.owner", "Owner")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.owner_name || `ID: ${project.owner_id}`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("common.createdAt", "Created At")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {new Date(project.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("common.updatedAt", "Updated At")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {new Date(project.updated_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
