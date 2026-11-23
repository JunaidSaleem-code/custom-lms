-- =====================================================================
-- 0001_student_schema.sql
-- Student dashboard data model for the Nick sales coaching portal.
-- Target: Supabase (PostgreSQL 15+) project owned by the client.
--
-- Conventions
--   * uuid primary keys, timestamptz everywhere, created_at/updated_at.
--   * Enumerations are text + CHECK (easy to extend without migrations
--     that rewrite types).
--   * Access rules live here (RLS + helper functions), not in app code.
--   * Only server code uses the service role key. Admin RLS policies are
--     defence in depth.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. Profiles (1:1 with auth.users)
--    Email lives only in auth.users (single source of truth).
-- ---------------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  phone          text,
  avatar_path    text,                                   -- Storage path
  role           text not null default 'student'
                   check (role in ('student', 'admin')),
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Public, non-sensitive subset of profiles (names on community posts, messages).
create view public_profiles as
  select id, full_name, avatar_path from profiles;


-- ---------------------------------------------------------------------
-- 2. Membership plans and course catalogue
-- ---------------------------------------------------------------------
create table plans (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,                    -- e.g. "Basic Course"
  description          text,
  -- Null = no fixed expiry. Exact durations are still to be confirmed.
  access_duration_days int check (access_duration_days is null or access_duration_days > 0),
  stripe_price_id      text unique,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  thumbnail_path text,
  status         text not null default 'draft'
                   check (status in ('draft', 'published')),
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Which courses a plan grants. Many-to-many.
create table plan_courses (
  plan_id   uuid not null references plans (id)   on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  primary key (plan_id, course_id)
);
create index plan_courses_course_id_idx on plan_courses (course_id);

create table modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'draft'
                check (status in ('draft', 'published')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index modules_course_order_idx on modules (course_id, sort_order);

create table lessons (
  id                   uuid primary key default gen_random_uuid(),
  module_id            uuid not null references modules (id) on delete cascade,
  title                text not null,
  description          text,
  stream_uid           text,                              -- Cloudflare Stream video id
  duration_seconds     numeric(10, 2) check (duration_seconds is null or duration_seconds > 0),
  -- Fraction of the video that must be reached to count as completed.
  completion_threshold numeric(3, 2) not null default 0.90
                         check (completion_threshold > 0 and completion_threshold <= 1),
  status               text not null default 'draft'
                         check (status in ('draft', 'published')),
  sort_order           int  not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index lessons_module_order_idx on lessons (module_id, sort_order);

create table lesson_resources (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references lessons (id) on delete cascade,
  title        text not null,
  storage_path text not null,                             -- Supabase Storage path
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);
create index lesson_resources_lesson_idx on lesson_resources (lesson_id);


-- ---------------------------------------------------------------------
-- 3. Enrollments (a student's paid or granted access to a plan)
--    One row per purchase or subscription. Renewals update the same row.
-- ---------------------------------------------------------------------
create table enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  plan_id     uuid not null references plans (id),
  source      text not null check (source in ('stripe', 'manual')),
  -- Stripe checkout session or subscription id. Makes webhook handling idempotent.
  source_ref  text,
  status      text not null default 'active'
                check (status in ('active', 'expired', 'revoked', 'refunded')),
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,                                -- null = no expiry
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint enrollments_source_ref_required
    check (source = 'manual' or source_ref is not null),
  constraint enrollments_expiry_after_start
    check (expires_at is null or expires_at > starts_at),
  unique (source, source_ref)
);
create index enrollments_user_idx on enrollments (user_id, status);
create index enrollments_plan_idx on enrollments (plan_id);


-- ---------------------------------------------------------------------
-- 4. Access views and helper functions (the single definition of "access")
-- ---------------------------------------------------------------------
create view active_enrollments with (security_invoker = true) as
  select *
  from enrollments
  where status = 'active'
    and starts_at <= now()
    and (expires_at is null or expires_at > now());

create view user_course_access with (security_invoker = true) as
  select distinct ae.user_id, pc.course_id
  from active_enrollments ae
  join plan_courses pc on pc.plan_id = ae.plan_id;

create function can_access_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_course_access uca
    join courses c on c.id = uca.course_id
    where uca.user_id = auth.uid()
      and uca.course_id = p_course_id
      and c.status = 'published'
  );
$$;

create function can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from lessons l
    join modules m on m.id = l.module_id
    where l.id = p_lesson_id
      and l.status = 'published'
      and m.status = 'published'
      and can_access_course(m.course_id)
  );
$$;


-- ---------------------------------------------------------------------
-- 5. Communities (membership is derived from plans, not stored)
-- ---------------------------------------------------------------------
create table communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,                              -- e.g. "Full Course Community"
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table community_plans (
  community_id uuid not null references communities (id) on delete cascade,
  plan_id      uuid not null references plans (id)       on delete cascade,
  primary key (community_id, plan_id)
);
create index community_plans_plan_idx on community_plans (plan_id);

create view user_community_access with (security_invoker = true) as
  select distinct ae.user_id, cp.community_id
  from active_enrollments ae
  join community_plans cp on cp.plan_id = ae.plan_id
  join communities c       on c.id = cp.community_id and c.is_active;

create function is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_community_access
    where user_id = auth.uid() and community_id = p_community_id
  );
$$;

-- Announcements and group calls: null community = every active student.
create function can_see_audience(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_community_id is null
      then exists (select 1 from active_enrollments where user_id = auth.uid())
    else is_community_member(p_community_id)
  end;
$$;

create table community_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities (id) on delete cascade,
  author_id    uuid references profiles (id) on delete set null,
  body         text not null check (length(trim(body)) > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz                                -- soft delete
);
create index community_posts_feed_idx on community_posts (community_id, created_at desc);


-- ---------------------------------------------------------------------
-- 6. Messaging (students <-> Nick/admins; threads are created by admins
--    in phase 1, see architecture doc open questions)
-- ---------------------------------------------------------------------
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id         uuid not null references profiles (id)      on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on conversation_participants (user_id);

create function is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id       uuid references profiles (id) on delete set null,
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);
create index messages_thread_idx on messages (conversation_id, created_at);


-- ---------------------------------------------------------------------
-- 7. Announcements and group calls (admin writes, students read)
-- ---------------------------------------------------------------------
create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  community_id uuid references communities (id) on delete cascade,  -- null = all students
  author_id    uuid references profiles (id) on delete set null,
  published_at timestamptz,                                          -- null = draft
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index announcements_published_idx on announcements (published_at desc);

create table group_calls (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  community_id    uuid references communities (id) on delete cascade,  -- null = all students
  starts_at        timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0),
  join_url         text,
  provider         text,                                  -- pending client decision
  created_by       uuid references profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index group_calls_starts_idx on group_calls (starts_at);


-- ---------------------------------------------------------------------
-- 8. Learning progress and video tracking
-- ---------------------------------------------------------------------
-- One row per student per lesson. Written only by record_lesson_event().
create table lesson_progress (
  user_id                   uuid not null references profiles (id) on delete cascade,
  lesson_id                 uuid not null references lessons (id)  on delete cascade,
  first_interaction_at      timestamptz not null default now(),
  last_position_seconds     numeric(10, 2) not null default 0 check (last_position_seconds >= 0),
  furthest_position_seconds numeric(10, 2) not null default 0 check (furthest_position_seconds >= 0),
  watched_seconds           numeric(10, 2) not null default 0 check (watched_seconds >= 0),
  completed_at              timestamptz,
  last_event_at             timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_lesson_idx on lesson_progress (lesson_id);

-- Raw append-only event log, used for admin verification and disputes.
create table lesson_events (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references profiles (id) on delete cascade,
  lesson_id        uuid not null references lessons (id)  on delete cascade,
  event_type       text not null
                     check (event_type in ('play', 'pause', 'seek', 'heartbeat', 'ended')),
  position_seconds numeric(10, 2) not null check (position_seconds >= 0),
  occurred_at      timestamptz not null default now()
);
create index lesson_events_user_lesson_idx on lesson_events (user_id, lesson_id, occurred_at);


-- ---------------------------------------------------------------------
-- 9. Quizzes and assessments (AI-generated or admin-written, tied to video time)
-- ---------------------------------------------------------------------
create table lesson_questions (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references lessons (id) on delete cascade,
  source          text not null check (source in ('ai', 'admin')),
  question_text   text not null,
  show_at_seconds numeric(10, 2) check (show_at_seconds is null or show_at_seconds >= 0),
  points          int not null default 1 check (points >= 0),
  explanation     text,
  is_approved     boolean not null default false,        -- AI output needs admin review
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index lesson_questions_lesson_idx on lesson_questions (lesson_id, show_at_seconds);

create table question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references lesson_questions (id) on delete cascade,
  option_text text not null,
  is_correct  boolean not null default false,
  sort_order  int not null default 0
);
create index question_options_question_idx on question_options (question_id);
-- At most one correct option per question.
create unique index question_options_one_correct_idx
  on question_options (question_id) where is_correct;

create table question_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles (id) on delete cascade,
  question_id        uuid not null references lesson_questions (id) on delete cascade,
  selected_option_id uuid references question_options (id) on delete set null,
  is_correct         boolean not null,
  points_awarded     int not null default 0 check (points_awarded >= 0),
  answered_at        timestamptz not null default now(),
  unique (user_id, question_id)                            -- one scored attempt per question
);

-- Points are an append-only ledger. Totals are derived (DRY).
create table points_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  points      int  not null,
  source_type text not null,                               -- 'question', 'lesson', 'roleplay', 'challenge', 'manual'
  source_id   uuid not null,                               -- id of the thing that earned it
  created_at  timestamptz not null default now(),
  unique (user_id, source_type, source_id)                 -- no double-awarding
);
create index points_ledger_user_idx on points_ledger (user_id);

create view user_points with (security_invoker = true) as
  select user_id, sum(points)::int as total_points
  from points_ledger
  group by user_id;

-- Progress roll-ups. Only courses/modules/lessons that are published count.
create view module_progress with (security_invoker = true) as
  select
    uca.user_id,
    m.id        as module_id,
    m.course_id as course_id,
    count(l.id)                as total_lessons,
    count(lp.completed_at)     as completed_lessons
  from user_course_access uca
  join courses c  on c.id = uca.course_id and c.status = 'published'
  join modules m  on m.course_id = c.id    and m.status = 'published'
  join lessons l  on l.module_id = m.id    and l.status = 'published'
  left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = uca.user_id
  group by uca.user_id, m.id, m.course_id;

create view course_progress with (security_invoker = true) as
  select
    user_id,
    course_id,
    sum(total_lessons)     as total_lessons,
    sum(completed_lessons) as completed_lessons
  from module_progress
  group by user_id, course_id;


-- ---------------------------------------------------------------------
-- 10. Certificates
-- ---------------------------------------------------------------------
create table certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles (id) on delete cascade,
  course_id          uuid not null references courses (id)  on delete restrict,
  certificate_number text not null unique,
  issued_at          timestamptz not null default now(),
  pdf_path           text,                                 -- Storage path
  unique (user_id, course_id)
);


-- ---------------------------------------------------------------------
-- 11. Write functions (the only way students change progress/points)
-- ---------------------------------------------------------------------
create function record_lesson_event(
  p_lesson_id     uuid,
  p_event_type    text,
  p_position      numeric,
  p_watched_delta numeric default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_duration  numeric;
  v_threshold numeric;
begin
  if v_uid is null or not can_access_lesson(p_lesson_id) then
    raise exception 'access denied' using errcode = '42501';
  end if;
  if p_event_type not in ('play', 'pause', 'seek', 'heartbeat', 'ended') then
    raise exception 'invalid event type %', p_event_type;
  end if;

  select duration_seconds, completion_threshold
    into v_duration, v_threshold
    from lessons where id = p_lesson_id;

  insert into lesson_events (user_id, lesson_id, event_type, position_seconds)
  values (v_uid, p_lesson_id, p_event_type, p_position);

  -- Cap watched time per event so a client cannot inflate it.
  insert into lesson_progress (
    user_id, lesson_id, last_position_seconds, furthest_position_seconds,
    watched_seconds, last_event_at
  )
  values (
    v_uid, p_lesson_id, p_position, p_position,
    least(greatest(coalesce(p_watched_delta, 0), 0), 30), now()
  )
  on conflict (user_id, lesson_id) do update set
    last_position_seconds     = excluded.last_position_seconds,
    furthest_position_seconds = greatest(lesson_progress.furthest_position_seconds,
                                         excluded.furthest_position_seconds),
    watched_seconds           = lesson_progress.watched_seconds + excluded.watched_seconds,
    last_event_at             = now();

  -- Completion uses the furthest position reached, not the last one.
  update lesson_progress
     set completed_at = now()
   where user_id = v_uid
     and lesson_id = p_lesson_id
     and completed_at is null
     and v_duration is not null
     and furthest_position_seconds >= v_duration * v_threshold;

  update profiles set last_active_at = now() where id = v_uid;
end;
$$;

create function submit_question_answer(p_question_id uuid, p_option_id uuid)
returns table (is_correct boolean, points_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_lesson  uuid;
  v_points  int;
  v_correct boolean;
  v_awarded int;
begin
  select q.lesson_id, q.points
    into v_lesson, v_points
    from lesson_questions q
   where q.id = p_question_id and q.is_approved;

  if v_uid is null or v_lesson is null or not can_access_lesson(v_lesson) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  select o.is_correct
    into v_correct
    from question_options o
   where o.id = p_option_id and o.question_id = p_question_id;

  if v_correct is null then
    raise exception 'invalid option for this question';
  end if;

  if exists (select 1 from question_attempts
              where user_id = v_uid and question_id = p_question_id) then
    raise exception 'question already answered';
  end if;

  v_awarded := case when v_correct then v_points else 0 end;

  insert into question_attempts (user_id, question_id, selected_option_id, is_correct, points_awarded)
  values (v_uid, p_question_id, p_option_id, v_correct, v_awarded);

  if v_awarded > 0 then
    insert into points_ledger (user_id, points, source_type, source_id)
    values (v_uid, v_awarded, 'question', p_question_id);
  end if;

  return query select v_correct, v_awarded;
end;
$$;


-- ---------------------------------------------------------------------
-- 12. updated_at triggers (applied in one place)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'plans', 'courses', 'modules', 'lessons', 'enrollments',
    'communities', 'community_posts', 'announcements', 'group_calls',
    'lesson_progress', 'lesson_questions'
  ] loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end;
$$;


-- ---------------------------------------------------------------------
-- 13. Row-Level Security
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'plans', 'courses', 'plan_courses', 'modules', 'lessons',
    'lesson_resources', 'enrollments', 'communities', 'community_plans',
    'community_posts', 'conversations', 'conversation_participants',
    'messages', 'announcements', 'group_calls', 'lesson_progress',
    'lesson_events', 'lesson_questions', 'question_options',
    'question_attempts', 'points_ledger', 'certificates'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end;
$$;

-- Admins: full access to everything (writes also go through the server).
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'plans', 'courses', 'plan_courses', 'modules', 'lessons',
    'lesson_resources', 'enrollments', 'communities', 'community_plans',
    'community_posts', 'conversations', 'conversation_participants',
    'messages', 'announcements', 'group_calls', 'lesson_progress',
    'lesson_events', 'lesson_questions', 'question_options',
    'question_attempts', 'points_ledger', 'certificates'
  ] loop
    execute format(
      'create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end;
$$;

-- Profiles: students read and edit only their own row, and cannot change role.
create policy own_profile_select on profiles
  for select to authenticated using (id = auth.uid());
create policy own_profile_update on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, delete, update on profiles from authenticated;
grant update (full_name, phone, avatar_path, last_active_at) on profiles to authenticated;

-- Catalogue: students see only published content they are entitled to.
create policy read_active_plans on plans
  for select to authenticated using (is_active);

create policy read_plan_courses on plan_courses
  for select to authenticated using (true);

create policy read_accessible_courses on courses
  for select to authenticated using (can_access_course(id));

create policy read_accessible_modules on modules
  for select to authenticated using (
    status = 'published' and can_access_course(course_id)
  );

create policy read_accessible_lessons on lessons
  for select to authenticated using (can_access_lesson(id));

create policy read_accessible_resources on lesson_resources
  for select to authenticated using (can_access_lesson(lesson_id));

-- Enrollments: students see their own. Students never write enrollments.
create policy own_enrollments_select on enrollments
  for select to authenticated using (user_id = auth.uid());

-- Communities: only communities the student is entitled to.
create policy member_communities_select on communities
  for select to authenticated using (is_active and is_community_member(id));

create policy member_posts_select on community_posts
  for select to authenticated using (
    deleted_at is null and is_community_member(community_id)
  );
create policy member_posts_insert on community_posts
  for insert to authenticated with check (
    author_id = auth.uid() and is_community_member(community_id)
  );
create policy own_posts_update on community_posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Messaging: members of a thread only.
create policy member_conversations_select on conversations
  for select to authenticated using (is_conversation_member(id));
create policy member_participants_select on conversation_participants
  for select to authenticated using (is_conversation_member(conversation_id));
create policy member_messages_select on messages
  for select to authenticated using (is_conversation_member(conversation_id));
create policy member_messages_insert on messages
  for insert to authenticated with check (
    sender_id = auth.uid() and is_conversation_member(conversation_id)
  );

-- Announcements and group calls: published/relevant to the student.
create policy visible_announcements_select on announcements
  for select to authenticated using (
    published_at is not null and published_at <= now()
    and can_see_audience(community_id)
  );
create policy visible_group_calls_select on group_calls
  for select to authenticated using (can_see_audience(community_id));

-- Progress and learning history: own rows only. Writes happen in record_lesson_event().
create policy own_progress_select on lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy own_events_select on lesson_events
  for select to authenticated using (user_id = auth.uid());

-- Quizzes: approved questions for accessible lessons only.
create policy read_approved_questions on lesson_questions
  for select to authenticated using (is_approved and can_access_lesson(lesson_id));

create policy read_question_options on question_options
  for select to authenticated using (
    exists (
      select 1 from lesson_questions q
      where q.id = question_id and q.is_approved and can_access_lesson(q.lesson_id)
    )
  );
-- Students must never read the answer key. Column-level grant hides is_correct from
-- the authenticated role. Admin reads of is_correct go through server code using the
-- service role, which bypasses column grants.
revoke select on question_options from authenticated;
grant select (id, question_id, option_text, sort_order) on question_options to authenticated;

create policy own_attempts_select on question_attempts
  for select to authenticated using (user_id = auth.uid());
create policy own_points_select on points_ledger
  for select to authenticated using (user_id = auth.uid());
create policy own_certificates_select on certificates
  for select to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 14. Grants for views and functions
-- ---------------------------------------------------------------------
grant select on public_profiles, user_points, module_progress, course_progress,
                user_course_access, active_enrollments, user_community_access
  to authenticated;

revoke execute on function record_lesson_event(uuid, text, numeric, numeric) from public;
revoke execute on function submit_question_answer(uuid, uuid) from public;
grant  execute on function record_lesson_event(uuid, text, numeric, numeric) to authenticated;
grant  execute on function submit_question_answer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 15. Scheduled expiry (pg_cron is enabled in Supabase dashboard)
--     Access is already date-checked by active_enrollments; this keeps the
--     status column accurate for admin reporting.
-- ---------------------------------------------------------------------
-- select cron.schedule('expire-enrollments', '0 * * * *', $$
--   update enrollments set status = 'expired'
--    where status = 'active' and expires_at is not null and expires_at <= now();
-- $$);
