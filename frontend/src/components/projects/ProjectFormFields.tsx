import type { UseFormRegisterReturn } from "react-hook-form";
import { Input, Select, Textarea } from "@yza/ui";
import type { ProjectForm } from "@/lib/projects";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type FieldProps = Omit<UseFormRegisterReturn, "ref">;

interface ProjectFormFieldsProps {
  descriptionField: FieldProps;
  formErrors: Partial<Record<keyof ProjectForm, string | undefined>>;
  nameField: FieldProps;
  statusField: FieldProps;
  t: Translate;
}

export function ProjectFormFields({
  descriptionField,
  formErrors,
  nameField,
  statusField,
  t,
}: ProjectFormFieldsProps) {
  return (
    <div className="yza-doc-stack">
      <Input
        id="project-name"
        label={t("projects.name")}
        {...nameField}
        status={formErrors.name ? "error" : "default"}
        message={formErrors.name}
      />
      <Textarea
        id="project-description"
        label={t("projects.description")}
        {...descriptionField}
        rows={3}
      />
      <Select
        id="project-status"
        label={t("projects.status")}
        {...statusField}
      >
        <option value="draft">{t("projects.draft")}</option>
        <option value="active">{t("projects.active")}</option>
        <option value="archived">{t("projects.archived")}</option>
      </Select>
    </div>
  );
}
