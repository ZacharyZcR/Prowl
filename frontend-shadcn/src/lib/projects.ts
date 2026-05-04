import { z } from "zod";
import type { Project } from "@/types";

export const PROJECT_STATUS_TONE = {
  active: "success",
  archived: "neutral",
  draft: "warning",
} as const;

export const projectFormSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(["active", "archived", "draft"]),
});

export type ProjectForm = z.infer<typeof projectFormSchema>;

export function createEmptyProjectForm(): ProjectForm {
  return {
    name: "",
    description: "",
    status: "draft",
  };
}

export function toProjectForm(project: Project): ProjectForm {
  return {
    name: project.name,
    description: project.description,
    status: project.status satisfies Project["status"],
  };
}
