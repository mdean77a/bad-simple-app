"use client";

import { useAuth } from "@/lib/auth";

interface PageHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function PageHeader({ title, showBack, onBack }: PageHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white" role="banner">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-slate-600">{user.name}</span>
          )}
          <button
            onClick={logout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
