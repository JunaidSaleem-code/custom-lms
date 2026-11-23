// Standard return shape for server actions. Client code checks `ok` and never has to catch exceptions.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
