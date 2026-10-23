import { describe, expect, it } from "vitest";
import { normalizeWebsite } from "@/lib/website";

describe("normalizeWebsite", () => {
  it("stores https://www.Example.com/ as www.example.com", () => {
    expect(normalizeWebsite("https://www.Example.com/")).toBe("www.example.com");
  });
  it("accepts a bare domain", () => {
    expect(normalizeWebsite("yourapp.com")).toBe("yourapp.com");
  });
  it("rejects things that are not websites", () => {
    expect(normalizeWebsite("hello")).toBeNull();
    expect(normalizeWebsite("me@mail.com")).toBeNull();
    expect(normalizeWebsite("not a site.com")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});
