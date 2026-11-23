"use client";

import { useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  autoComplete: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
};

// Password input with show/hide. The toggle is a real button with aria-pressed, so it is keyboard-accessible.
export function PasswordField({
  name,
  label,
  autoComplete,
  hint,
  required = true,
  minLength,
  defaultValue,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="passwordWrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          defaultValue={defaultValue}
          className="input"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="toggle"
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
    </div>
  );
}
