"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Unable to copy");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} type="button">
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {label}
    </Button>
  );
}
