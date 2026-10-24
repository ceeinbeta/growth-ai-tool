import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ component: null as any, test: vi.fn(), start: vi.fn(), runs: [] as any[], checks: null as any[] | null }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (config: any) => { state.component = config.component; return config; }, Link: () => null }));
vi.mock("@tanstack/react-query", () => ({ queryOptions: (o: any) => o, useQueryClient: () => ({ invalidateQueries: vi.fn() }), useQuery: (o: any) => ({ data: o.queryKey[0] === "sov-engine-status"
  ? { engines: [{ id: "openai", label: "OpenAI", connected: true }, { id: "claude", label: "Claude", connected: true }] }
  : { questions: [{ question: "q" }], checks: state.checks ?? (state.runs.length ? [{ id: "last", status: "failed", engines: ["openai", "claude"], started_at: "2026-10-24T20:00:00Z" }] : []), runs: state.runs, fixes: [], mentions: [] } }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/sov.functions", () => ({ getSovEngineStatus: vi.fn(), testEngineConnection: state.test, startSovCheck: state.start, advanceSovCheckFn: vi.fn(), setSovSchedule: vi.fn() }));
vi.mock("@/components/AppShell", () => ({ useActiveProduct: () => ({ active: { id: "choice-test", name: "Test" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import "@/routes/_authenticated/ai-search-visibility";

describe("visibility dialog interactions", () => {
  beforeEach(() => { localStorage.clear(); state.runs = []; state.checks = null; state.test.mockReset(); state.start.mockReset(); });
  it("shows test results only after a click and keeps failed engines selectable", async () => {
    state.test.mockResolvedValue({ ok: false, error: "The key was rejected." });
    render(<state.component />);
    expect(screen.queryByText("Test passed just now")).toBeNull();
    const testButton = screen.getAllByRole("button", { name: "Test connection" }).at(0);
    if (!testButton) throw new Error("Missing test button");
    fireEvent.click(testButton);
    await screen.findByText("The key was rejected.");
    fireEvent.click(screen.getByRole("button", { name: "Run a check" }));
    expect(screen.getByText("Failed last time. Tick to try again.")).toBeInTheDocument();
    const engine = within(screen.getByRole("group", { name: "Engines" })).getByRole("checkbox", { name: /OpenAI/ });
    expect(engine).not.toBeDisabled();
    expect(engine).not.toBeChecked();
    fireEvent.click(engine);
    expect(engine).toBeChecked();
  });
  it("updates call estimates, remembers selection and submits only chosen engines", async () => {
    state.start.mockResolvedValue({ ok: true });
    const first = render(<state.component />);
    fireEvent.click(screen.getByRole("button", { name: "Run a check" }));
    expect(screen.getByText(/This will make about 6 calls/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "OpenAI" }));
    expect(screen.getByText(/This will make about 3 calls/)).toBeInTheDocument();
    first.unmount();
    render(<state.component />);
    fireEvent.click(screen.getByRole("button", { name: "Run a check" }));
    expect(screen.getByRole("checkbox", { name: "OpenAI" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Run the check" }));
    await waitFor(() => expect(state.start).toHaveBeenCalledWith({ data: { productId: "choice-test", runsPerQuestion: 3, engines: ["claude"] } }));
  });
  it("shows a passed-test line without a second Connected label", async () => {
    state.test.mockResolvedValue({ ok: true });
    render(<state.component />);
    const testButton = screen.getAllByRole("button", { name: "Test connection" }).at(0);
    if (!testButton) throw new Error("Missing test button");
    fireEvent.click(testButton);
    await screen.findByText("Test passed just now");
    expect(screen.getAllByText("Connected")).toHaveLength(2);
  });
  it("defaults an engine off after all its last runs failed, but allows retry", () => {
    state.runs = [{ id: "r", check_id: "last", engine: "openai", status: "failed" }];
    localStorage.setItem("growloop:sov-engines:choice-test", '["openai","claude"]');
    render(<state.component />);
    fireEvent.click(screen.getByRole("button", { name: "Run a check" }));
    const engine = screen.getByRole("checkbox", { name: /OpenAI/ });
    expect(engine).not.toBeChecked();
    fireEvent.click(engine);
    expect(engine).toBeChecked();
    expect(screen.getByText(/This will make about 6 calls/)).toBeInTheDocument();
  });
  it("shows per-engine success counts for each check and no recommendation percentage for an unusable engine", () => {
    state.checks = [
      { id: "last", status: "done", engines: ["openai", "claude"], runs_per_question: 1, started_at: "2026-10-24T20:00:00Z" },
      { id: "older", status: "failed", engines: ["openai"], started_at: "2026-10-23T20:00:00Z" },
    ];
    state.runs = [
      { id: "empty", check_id: "last", engine: "openai", question: "q", status: "failed" },
      { id: "usable", check_id: "last", engine: "claude", question: "q", status: "done" },
      { id: "old", check_id: "older", engine: "openai", question: "q", status: "failed" },
    ];
    render(<state.component />);
    expect(screen.getAllByText("OpenAI: 0 of 1 runs succeeded — No usable answers in this check")).toHaveLength(2);
    expect(screen.getByText("Claude: 1 of 1 runs succeeded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OpenAI", exact: true }));
    expect(screen.getByText("No usable answers in this check", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/was not recommended in these usable answers/)).toBeNull();
  });
});