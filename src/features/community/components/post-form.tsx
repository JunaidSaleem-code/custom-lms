"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPostAction } from "../actions";
import { MAX_POST_LENGTH } from "../constants";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

type Props = { communityId: string; communitySlug: string };

export function PostForm({ communityId, communitySlug }: Props) {
  const [state, action] = useActionState(createPostAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box after a successful post.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="form">
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <div className="field">
        <label htmlFor="body" className="label">
          Share with the community
        </label>
        <textarea
          id="body"
          name="body"
          className="input"
          maxLength={MAX_POST_LENGTH}
          required
          rows={3}
          placeholder="Ask a question, share a win, or start a discussion."
        />
        <span className="hint">Up to {MAX_POST_LENGTH} characters.</span>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <div>
        <SubmitButton pendingLabel="Posting…">Post</SubmitButton>
      </div>
    </form>
  );
}
