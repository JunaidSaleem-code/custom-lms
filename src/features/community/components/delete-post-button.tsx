"use client";

import { useActionState } from "react";
import { deletePostAction } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

// Asks for confirmation first, because deleting a post can't be undone from the app.
export function DeletePostButton({ postId, communitySlug }: { postId: string; communitySlug: string }) {
  const [state, action] = useActionState(deletePostAction, undefined);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this post? Other members will no longer see it.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="communitySlug" value={communitySlug} />
      <SubmitButton className="btn btn-ghost" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
      <FormMessage error={state?.error} />
    </form>
  );
}
