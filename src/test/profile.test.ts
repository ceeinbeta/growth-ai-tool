import { describe, expect, it } from "vitest";
import { profileSchema, profileWindowAvailable, summaryValidators } from "../lib/profile-schema";

const valid = { one_liner: "Edit PDF files in your browser", audience: "People who need to edit PDF documents", category: "online pdf editing software", competitors: ["Adobe Acrobat"], questions: ["Which PDF editor works online?", "What can edit PDF text?", "Which PDF editor is simple?", "Where can I merge PDFs?", "What tools annotate PDFs?"] };
describe("profile requirements", () => {
  it("accepts real structured profile shape", () => expect(profileSchema.safeParse(valid).success).toBe(true));
  it("requires fewer than 14 summary words", () => expect(summaryValidators.one_liner.safeParse(Array(14).fill("word").join(" ")).success).toBe(false));
  it("requires fewer than 16 audience words", () => expect(summaryValidators.audience.safeParse(Array(16).fill("word").join(" ")).success).toBe(false));
  it("requires 3–7 lowercase category words", () => {
    for (const v of ["pdf editor", "Online pdf editor", Array(8).fill("word").join(" ")]) expect(summaryValidators.category.safeParse(v).success).toBe(false);
    expect(summaryValidators.category.safeParse("online pdf editor").success).toBe(true);
  });
  it("allows at most four competitors", () => expect(profileSchema.safeParse({ ...valid, competitors: ["a", "b", "c", "d", "e"] }).success).toBe(false));
  it("requires five questions", () => expect(profileSchema.safeParse({ ...valid, questions: valid.questions.slice(1) }).success).toBe(false));
  it("blocks a sixth run within 24 hours", () => {
    const now = Date.parse("2026-10-24T10:00:00Z");
    expect(profileWindowAvailable(Array(5).fill("2026-10-24T09:00:00Z"), now)).toBe(false);
    expect(profileWindowAvailable(Array(4).fill("2026-10-24T09:00:00Z"), now)).toBe(true);
    expect(profileWindowAvailable(Array(5).fill("2026-10-23T10:00:00Z"), now)).toBe(true);
  });
});