// Accessible feedback for forms. Errors use role="alert" so screen readers announce them.
export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="form-message form-message-error">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="form-message form-message-success">
        {success}
      </p>
    );
  }
  return null;
}
