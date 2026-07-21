import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from "react";

const fieldBase =
  "w-full rounded-lg border border-border bg-card text-fg placeholder:text-muted px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return <input ref={ref} className={`${fieldBase} ${className}`} {...rest} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...rest }, ref) {
    return <textarea ref={ref} className={`${fieldBase} resize-y ${className}`} {...rest} />;
  }
);

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-red-500">{children}</p>;
}
