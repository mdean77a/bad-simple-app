import { waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides initial null user when not logged in", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("restores user from localStorage on mount", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(storedUser);
  });

  it("handles invalid localStorage data gracefully", async () => {
    localStorage.setItem("user", "invalid-json");

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("handles incomplete user data in localStorage", async () => {
    localStorage.setItem("user", JSON.stringify({ name: "John" }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("login stores user in state and localStorage", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newUser = { name: "Jane Smith", email: "jane@example.com" };

    act(() => {
      result.current.login(newUser);
    });

    expect(result.current.user).toEqual(newUser);
    expect(JSON.parse(localStorage.getItem("user") || "{}")).toEqual(newUser);
  });

  it("logout clears user from state and localStorage", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(storedUser);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("useAuth hook", () => {
  it("throws error when used outside AuthProvider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleError.mockRestore();
  });
});
