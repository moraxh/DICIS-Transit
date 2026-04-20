"use client";

import { ThumbmarkProvider as BaseThumbmarkProvider } from "@thumbmarkjs/react";

export function ThumbmarkProvider({ children }: { children: React.ReactNode }) {
  return <BaseThumbmarkProvider>{children}</BaseThumbmarkProvider>;
}
