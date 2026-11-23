"use client";

import { useEffect } from "react";
import { markThreadReadAction } from "../actions";

// Marks the thread read once it has been opened. Renders nothing.
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markThreadReadAction(conversationId);
  }, [conversationId]);
  return null;
}
