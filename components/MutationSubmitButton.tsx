"use client";

import { useFormStatus } from "react-dom";

export default function MutationSubmitButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? "Please waitâ€¦" : children}</button>;
}

