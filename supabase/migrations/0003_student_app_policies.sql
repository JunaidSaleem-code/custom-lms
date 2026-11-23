-- =====================================================================
-- 0003_student_app_policies.sql
-- Policies needed by the student web app (added after 0001/0002).
--
-- A student may mark a message thread as read. Nothing else on their
-- thread membership can be changed.
-- =====================================================================

create policy own_participation_update on conversation_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Table-level UPDATE is granted to authenticated by default in Supabase.
-- Narrow it to the single column students need.
revoke update on conversation_participants from authenticated;
grant update (last_read_at) on conversation_participants to authenticated;
