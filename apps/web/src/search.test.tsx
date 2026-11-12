import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CountrySearch } from "./components/CountrySearch";
import { api } from "./api";
vi.mock("./api", () => ({ api: vi.fn() }));
const request = vi.mocked(api);
beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}
it("debounces input and preserves server results including partial matches", async () => {
  request.mockResolvedValue([
    { id: "fr", name: "France" },
    { id: "cf", name: "Central African Republic" },
  ]);
  render(<CountrySearch />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "f" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  fireEvent.change(input, { target: { value: "fra" } });
  expect(request).not.toHaveBeenCalled();
  await tick();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe("countries/search?q=fra&limit=10");
  expect(request.mock.calls[0][2]).toBe(true);
  expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(
    ["France", "Central African Republic"],
  );
});
it("selects with arrow keys and Enter without starting another search", async () => {
  request.mockResolvedValue([{ id: "fr", name: "France" }]);
  const select = vi.fn();
  render(<CountrySearch onSelect={select} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "fra" } });
  await tick();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(select).toHaveBeenCalledWith({ id: "fr", name: "France" });
  expect((input as HTMLInputElement).value).toBe("France");
  expect(screen.queryByRole("listbox")).toBeNull();
  await tick();
  expect(request).toHaveBeenCalledTimes(1);
});
it("does not let a stale response replace newer results", async () => {
  let finish: (value: unknown) => void = () => {};
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  request.mockResolvedValueOnce([{ id: "es", name: "Spain" }]);
  render(<CountrySearch />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "fra" } });
  await tick();
  fireEvent.change(input, { target: { value: "spa" } });
  await tick();
  await act(async () => {
    finish([{ id: "fr", name: "France" }]);
  });
  expect(screen.getByRole("option").textContent).toBe("Spain");
  expect(request.mock.calls[0][3]?.aborted).toBe(true);
});
it("shows empty and error states and clears the list when input is cleared", async () => {
  request
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error("Search unavailable"));
  render(<CountrySearch />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "xyz" } });
  await tick();
  expect(screen.getByRole("status").textContent).toContain("No countries");
  fireEvent.change(input, { target: { value: "abc" } });
  await tick();
  expect(screen.getByRole("status").textContent).toContain(
    "Search unavailable",
  );
  fireEvent.change(input, { target: { value: "" } });
  await tick();
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status").textContent).toBe("");
});
it("does not call protected search for a guest", async () => {
  render(<CountrySearch canSearch={false} />);
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "France" },
  });
  await tick();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain("Sign in");
});
