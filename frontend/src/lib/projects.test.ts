import { describe, expect, it } from "vitest";
import { createEmptyProjectForm, projectFormSchema, toProjectForm } from "./projects";

describe("projects helpers", () => {
  it("creates an isolated empty form", () => {
    const first = createEmptyProjectForm();
    const second = createEmptyProjectForm();

    expect(first).toEqual({
      name: "",
      description: "",
      status: "draft",
    });
    expect(first).not.toBe(second);
  });

  it("maps project data and validates required name", () => {
    const form = toProjectForm({
      id: 1,
      name: "alpha",
      description: "demo",
      status: "active",
      owner_id: 1,
      owner_name: "owner",
      created_at: "",
      updated_at: "",
    });

    expect(form).toEqual({
      name: "alpha",
      description: "demo",
      status: "active",
    });

    const invalidResult = projectFormSchema.safeParse(createEmptyProjectForm());
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["name"] }),
        ]),
      );
    }

    expect(projectFormSchema.safeParse(form).success).toBe(true);
  });
});
