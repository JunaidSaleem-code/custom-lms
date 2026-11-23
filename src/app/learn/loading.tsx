// Shown while a learn page loads. Keeps the layout stable and tells assistive tech that content is coming.
export default function LearnLoading() {
  return (
    <div role="status" aria-live="polite" style={{ color: "var(--text-muted)", padding: "24px 0" }}>
      Loading…
    </div>
  );
}
