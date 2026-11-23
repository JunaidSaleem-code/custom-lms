"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessageAction } from "../actions";
import { MAX_MESSAGE_LENGTH } from "../constants";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function MessageForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(sendMessageAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="form"
      onKeyDown={(e) => {
        // Ctrl/Cmd + Enter sends, which is quicker on desktop without trapping plain Enter for new lines.
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) formRef.current?.requestSubmit();
      }}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="field">
        <label htmlFor="body" className="label">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          className="input"
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          required
        />
        <span className="hint">Press Ctrl+Enter to send.</span>
      </div>
      <FormMessage error={state?.error} />
      <div>
        <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      </div>
    </form>
  );
}
