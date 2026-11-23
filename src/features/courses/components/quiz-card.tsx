"use client";

import { useEffect, useRef, useState } from "react";
import { submitAnswerAction, type AnswerOutcome } from "../actions";
import { FormMessage } from "@/components/ui/form-message";
import { plural } from "@/lib/format";
import styles from "./quiz-card.module.css";

export type QuizQuestion = {
  id: string;
  questionText: string;
  points: number;
  explanation: string | null;
  options: { id: string; text: string }[];
};

type Props = {
  question: QuizQuestion;
  onAnswered: (questionId: string, outcome: AnswerOutcome) => void;
  onContinue: () => void;
};

// Shown below the video when a question's timestamp is reached. The player is paused until the student continues.
export function QuizCard({ question, onAnswered, onContinue }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the question so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const res = await submitAnswerAction({ questionId: question.id, optionId: selected });
    setSubmitting(false);

    if (!res.ok || !res.data) {
      setError(res.ok ? "Your answer could not be saved." : res.error);
      return;
    }
    setOutcome(res.data);
    onAnswered(question.id, res.data);
  }

  return (
    <section className={`card ${styles.card}`} aria-labelledby={`q-${question.id}`}>
      <p className="eyebrow">Quick check · {plural(question.points, "point")}</p>
      <h2 id={`q-${question.id}`} tabIndex={-1} ref={headingRef} className={styles.title}>
        {question.questionText}
      </h2>

      {!outcome && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset className={styles.options} disabled={submitting}>
            <legend className="hint">Choose one answer</legend>
            {question.options.map((o) => (
              <label key={o.id} className={styles.option} data-selected={selected === o.id}>
                <input
                  type="radio"
                  name={`answer-${question.id}`}
                  value={o.id}
                  checked={selected === o.id}
                  onChange={() => setSelected(o.id)}
                />
                <span>{o.text}</span>
              </label>
            ))}
          </fieldset>

          <FormMessage error={error} />

          <div>
            <button type="submit" className="btn btn-primary" disabled={!selected || submitting}>
              {submitting ? "Checking…" : "Submit answer"}
            </button>
          </div>
        </form>
      )}

      {outcome && (
        <div className={styles.result} role="status" aria-live="polite">
          <p className={outcome.isCorrect ? styles.correct : styles.incorrect}>
            {outcome.alreadyAnswered
              ? "You answered this question earlier."
              : outcome.isCorrect
                ? `Correct. +${plural(outcome.pointsAwarded, "point")}.`
                : "Not quite."}
          </p>
          {question.explanation && <p className={styles.explanation}>{question.explanation}</p>}
          <div>
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              Continue video
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
