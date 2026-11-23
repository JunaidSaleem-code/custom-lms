"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stream, type StreamPlayerApi } from "@cloudflare/stream-react";
import { recordLessonEventAction, type AnswerOutcome } from "../actions";
import { QuizCard, type QuizQuestion } from "./quiz-card";
import { FormMessage } from "@/components/ui/form-message";
import { findDueQuestion, heartbeatDelta, resumePosition } from "../tracking";
import styles from "./lesson-player.module.css";

export type PlaybackState =
  | { ok: true; src: string }
  | { ok: false; reason: "pending" | "not-configured" | "failed" };

export type TimedQuestion = QuizQuestion & { showAtSeconds: number | null };

type Props = {
  lessonId: string;
  playback: PlaybackState;
  durationSeconds: number | null;
  initialPositionSeconds: number;
  questions: TimedQuestion[];
  answered: Record<string, { isCorrect: boolean; pointsAwarded: number }>;
};

const HEARTBEAT_MS = 15_000;

export function LessonPlayer({
  lessonId,
  playback,
  durationSeconds,
  initialPositionSeconds,
  questions,
  answered: initialAnswered,
}: Props) {
  const playerRef = useRef<StreamPlayerApi | undefined>(undefined);

  // Last position the server has confirmed. Watched time is counted from here, so a failed save
  // is retried on the next heartbeat instead of being lost.
  const savedPositionRef = useRef(0);
  const playingRef = useRef(false);
  const resumedRef = useRef(false);
  const activeRef = useRef<TimedQuestion | null>(null);
  const endModeRef = useRef(false);

  const [answered, setAnswered] = useState(initialAnswered);
  const answeredRef = useRef(answered);
  const [active, setActive] = useState<TimedQuestion | null>(null);
  const [notice, setNotice] = useState<string | undefined>(undefined);

  // Questions in order. "Timed" ones pause playback; "end" ones appear after the video finishes.
  const timed = useMemo(
    () =>
      questions
        .filter((q) => q.showAtSeconds !== null && (durationSeconds === null || q.showAtSeconds <= durationSeconds))
        .sort((a, b) => (a.showAtSeconds ?? 0) - (b.showAtSeconds ?? 0)),
    [questions, durationSeconds],
  );
  const endQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.showAtSeconds === null || (durationSeconds !== null && q.showAtSeconds > durationSeconds),
      ),
    [questions, durationSeconds],
  );

  const setActiveQuestion = useCallback((q: TimedQuestion | null) => {
    activeRef.current = q;
    setActive(q);
  }, []);

  const nextUnanswered = useCallback(
    (list: TimedQuestion[]) => list.find((q) => !answeredRef.current[q.id]) ?? null,
    [],
  );

  // Sends a tracking event. Resolves true only when the server has saved it.
  const save = useCallback(
    async (eventType: "play" | "pause" | "seek" | "heartbeat" | "ended", position: number, delta: number) => {
      const res = await recordLessonEventAction({
        lessonId,
        eventType,
        position,
        watchedDelta: Math.max(delta, 0),
      });
      if (!res.ok) {
        setNotice(res.error);
        return false;
      }
      setNotice(undefined);
      return true;
    },
    [lessonId],
  );

  const currentTime = () => playerRef.current?.currentTime ?? 0;
  const deltaSinceSaved = (pos: number) => heartbeatDelta(pos, savedPositionRef.current);

  // Resume where the student left off.
  const handleLoadedMetadata = () => {
    if (resumedRef.current || !playerRef.current) return;
    resumedRef.current = true;
    const start = resumePosition(initialPositionSeconds, durationSeconds);
    if (start > 0) {
      playerRef.current.currentTime = start;
      savedPositionRef.current = start;
    }
  };

  const handlePlay = () => {
    playingRef.current = true;
    void save("play", currentTime(), 0);
  };

  const handlePause = async () => {
    playingRef.current = false;
    const pos = currentTime();
    if (await save("pause", pos, deltaSinceSaved(pos))) savedPositionRef.current = pos;
  };

  const handleSeeked = () => {
    const pos = currentTime();
    // Seeking doesn't count as watching, so update the saved position straight away.
    savedPositionRef.current = pos;
    void save("seek", pos, 0);
    // A student who skipped past a question still sees it, once.
    const due = firstDue(pos);
    if (due && playingRef.current === false && !activeRef.current) {
      playerRef.current?.pause();
      setActiveQuestion(due);
    }
  };

  const firstDue = (pos: number) => findDueQuestion(timed, answeredRef.current, pos);

  const handleTimeUpdate = () => {
    if (activeRef.current) return;
    const due = firstDue(currentTime());
    if (due) {
      playerRef.current?.pause(); // fires onPause, which saves progress
      setActiveQuestion(due);
    }
  };

  const handleEnded = async () => {
    playingRef.current = false;
    const pos = currentTime();
    if (await save("ended", pos, deltaSinceSaved(pos))) savedPositionRef.current = pos;
    endModeRef.current = true;
    const next = nextUnanswered(endQuestions);
    if (next) setActiveQuestion(next);
  };

  // Heartbeat: counts watched time while the video plays, even if the student doesn't pause.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playingRef.current || !playerRef.current) return;
      const pos = currentTime();
      const delta = deltaSinceSaved(pos);
      if (delta <= 0) return;
      void save("heartbeat", pos, delta).then((ok) => {
        if (ok) savedPositionRef.current = pos;
      });
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
    // save/currentTime are stable for the lifetime of this lesson page.
  }, [save]);

  // Save progress when the student leaves the page.
  useEffect(() => {
    const flush = () => {
      if (!playingRef.current || !playerRef.current) return;
      const pos = currentTime();
      void save("pause", pos, deltaSinceSaved(pos));
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [save]);

  const handleAnswered = (questionId: string, outcome: AnswerOutcome) => {
    const next = { ...answeredRef.current, [questionId]: { isCorrect: outcome.isCorrect, pointsAwarded: outcome.pointsAwarded } };
    answeredRef.current = next;
    setAnswered(next);
  };

  const handleContinue = () => {
    if (endModeRef.current) {
      const next = nextUnanswered(endQuestions);
      setActiveQuestion(next);
      return;
    }
    setActiveQuestion(null);
    void playerRef.current?.play();
  };

  const showPlayer = playback.ok;

  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        {playback.ok ? (
          <Stream
            src={playback.src}
            streamRef={playerRef}
            controls
            width="100%"
            height="100%"
            className={styles.player}
            onLoadedMetaData={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeeked}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setNotice("This video couldn't load. Refresh the page to try again.")}
          />
        ) : (
          <div className={styles.placeholder} role="status">
            <p>{PLACEHOLDER[playback.reason]}</p>
          </div>
        )}
      </div>

      <FormMessage error={notice} />

      {active && (
        <QuizCard
          key={active.id}
          question={active}
          onAnswered={handleAnswered}
          onContinue={handleContinue}
        />
      )}

      {!showPlayer && questions.length > 0 && (
        <p className="hint">Quick checks will appear here once the video is playing.</p>
      )}
    </div>
  );
}

const PLACEHOLDER: Record<"pending" | "not-configured" | "failed", string> = {
  pending: "This video is still being prepared. Check back shortly.",
  "not-configured": "Video playback isn't set up yet.",
  failed: "We couldn't prepare this video. Refresh the page to try again.",
};
