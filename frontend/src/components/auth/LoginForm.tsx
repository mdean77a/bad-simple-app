"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

interface FormErrors {
  name?: string;
  email?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      login({ name: name.trim(), email: email.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          className={`w-full rounded-lg border px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-300"
          }`}
          placeholder="Enter your name"
          aria-describedby={errors.name ? "name-error" : undefined}
          aria-invalid={errors.name ? "true" : "false"}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-500" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          className={`w-full rounded-lg border px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            errors.email
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-300"
          }`}
          placeholder="Enter your email"
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={errors.email ? "true" : "false"}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-500" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-violet-600 px-4 py-3 font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      >
        Continue
      </button>
    </form>
  );
}
