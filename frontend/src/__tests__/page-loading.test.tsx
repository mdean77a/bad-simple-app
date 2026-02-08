import { render } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    isLoading: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import Home from "@/app/page";

describe("Home Page - Loading State", () => {
  it("shows loading spinner while auth is loading", () => {
    render(<Home />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
