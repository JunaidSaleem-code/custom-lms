import { signOutAction } from "../actions";

// Server-rendered form: works without JavaScript. "Everywhere" ends every session on every device.
export function SignOutForm() {
  return (
    <form action={signOutAction} className="signOut">
      <button type="submit" className="btn btn-ghost signOutButton">
        Sign out
      </button>
    </form>
  );
}
