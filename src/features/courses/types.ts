// Shapes returned by the courses queries. Kept separate so UI and queries share one definition.
export type LessonStatus = "not_started" | "in_progress" | "completed";

export type LessonSummary = {
  id: string;
  title: string;
  duration_seconds: number | null;
  sort_order: number;
  completion_threshold: number;
  progress: {
    furthestSeconds: number;
    completed: boolean;
  } | null;
  status: LessonStatus;
};

export type ModuleOutline = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: LessonSummary[];
};

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  totalLessons: number;
  completedLessons: number;
};
