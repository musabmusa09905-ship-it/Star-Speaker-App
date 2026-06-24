begin;

-- Privacy-preserving consistency board.
-- This function exposes only habit-effort metrics and masked display names.
-- It does not expose emails, levels, feedback, scores, reflection text, or audio paths.
create or replace function public.get_consistency_board()
returns table (
  period text,
  student_id uuid,
  display_name text,
  rank_position integer,
  is_current_user boolean,
  points integer,
  weekly_points integer,
  monthly_points integer,
  yearly_points integer,
  completion_rate numeric,
  submitted_task_count integer,
  current_streak integer,
  active_days integer,
  badges text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with period_defs as (
    select
      'week'::text as period,
      (current_date - (((extract(dow from current_date)::int + 6) % 7)))::date as start_date,
      current_date::date as end_date,
      greatest(
        1,
        current_date::date - (current_date - (((extract(dow from current_date)::int + 6) % 7)))::date + 1
      )::int as available_days
    union all
    select
      'month'::text,
      date_trunc('month', current_date)::date,
      current_date::date,
      greatest(1, current_date::date - date_trunc('month', current_date)::date + 1)::int
    union all
    select
      'year'::text,
      date_trunc('year', current_date)::date,
      current_date::date,
      greatest(1, current_date::date - date_trunc('year', current_date)::date + 1)::int
  ),
  students as (
    select
      p.id as student_id,
      case
        when nullif(trim(p.full_name), '') is null then 'Student'
        when trim(p.full_name) ~ '\s' then regexp_replace(trim(p.full_name), '^(\S+)\s+(\S).*$', '\1 \2.')
        else trim(p.full_name)
      end as display_name
    from public.profiles p
    where p.role = 'student'
      and coalesce(p.status, 'active') = 'active'
  ),
  safe_submissions as (
    select
      s.id,
      s.student_id,
      s.assigned_task_id,
      s.submitted_at,
      s.submitted_at::date as submitted_day,
      nullif(trim(coalesce(s.reflection_text, '')), '') is not null as has_reflection,
      t.due_date
    from public.submissions s
    left join public.assigned_tasks t on t.id = s.assigned_task_id
    where s.submitted_at is not null
      and coalesce(s.status, 'submitted') in ('submitted', 'reviewed')
  ),
  student_days as (
    select distinct student_id, submitted_day
    from safe_submissions
  ),
  numbered_days as (
    select
      student_id,
      submitted_day,
      submitted_day - (row_number() over (partition by student_id order by submitted_day))::int as streak_group
    from student_days
  ),
  streak_groups as (
    select
      student_id,
      min(submitted_day) as start_day,
      max(submitted_day) as end_day,
      count(*)::int as streak_length
    from numbered_days
    group by student_id, streak_group
  ),
  streak_anchors as (
    select
      st.student_id,
      case
        when exists (
          select 1 from student_days d
          where d.student_id = st.student_id
            and d.submitted_day = current_date::date
        ) then current_date::date
        when exists (
          select 1 from student_days d
          where d.student_id = st.student_id
            and d.submitted_day = current_date::date - 1
        ) then current_date::date - 1
        else null::date
      end as anchor_day
    from students st
  ),
  streaks as (
    select
      st.student_id,
      coalesce(max(case
        when a.anchor_day is not null and a.anchor_day between g.start_day and g.end_day
          then g.streak_length
        else 0
      end), 0)::int as current_streak,
      coalesce(max(g.streak_length), 0)::int as best_streak
    from students st
    left join streak_anchors a on a.student_id = st.student_id
    left join streak_groups g on g.student_id = st.student_id
    group by st.student_id
  ),
  comeback as (
    select
      student_id,
      bool_or(submitted_day - previous_day >= 7) as has_comeback
    from (
      select
        student_id,
        submitted_day,
        lag(submitted_day) over (partition by student_id order by submitted_day) as previous_day
      from student_days
    ) gaps
    where previous_day is not null
    group by student_id
  ),
  period_base as (
    select
      pd.period,
      pd.available_days,
      st.student_id,
      st.display_name,
      count(ss.id)::int as submitted_task_count,
      count(distinct ss.submitted_day)::int as active_days,
      (
        count(ss.id) * 10
        + count(ss.id) filter (where ss.has_reflection) * 3
        + count(ss.id) filter (where ss.due_date is not null and ss.submitted_day <= ss.due_date) * 5
      )::int as base_points
    from period_defs pd
    cross join students st
    left join safe_submissions ss
      on ss.student_id = st.student_id
      and ss.submitted_day between pd.start_date and pd.end_date
    group by pd.period, pd.available_days, st.student_id, st.display_name
  ),
  period_scored as (
    select
      pb.*,
      case
        when s.current_streak >= 7 then 30
        when s.current_streak >= 5 then 20
        when s.current_streak >= 3 then 10
        else 0
      end as streak_bonus,
      s.current_streak,
      s.best_streak
    from period_base pb
    left join streaks s on s.student_id = pb.student_id
  ),
  period_points as (
    select
      period,
      student_id,
      display_name,
      submitted_task_count,
      active_days,
      current_streak,
      best_streak,
      (base_points + streak_bonus)::int as points,
      round((active_days::numeric / nullif(available_days, 0)) * 100, 0) as completion_rate
    from period_scored
  ),
  point_summary as (
    select
      student_id,
      max(points) filter (where period = 'week')::int as weekly_points,
      max(points) filter (where period = 'month')::int as monthly_points,
      max(points) filter (where period = 'year')::int as yearly_points,
      max(active_days) filter (where period = 'month')::int as month_active_days,
      max(completion_rate) filter (where period = 'month') as month_completion_rate
    from period_points
    group by student_id
  ),
  total_submissions as (
    select student_id, count(*)::int as total_count
    from safe_submissions
    group by student_id
  ),
  student_badges as (
    select
      st.student_id,
      array_remove(array[
        case when coalesce(ts.total_count, 0) >= 1 then 'First Step' end,
        case when greatest(coalesce(s.current_streak, 0), coalesce(s.best_streak, 0)) >= 3 then '3-Day Streak' end,
        case when greatest(coalesce(s.current_streak, 0), coalesce(s.best_streak, 0)) >= 7 then '7-Day Speaker' end,
        case when coalesce(ps.month_active_days, 0) >= 20 then 'Monthly Grinder' end,
        case when coalesce(ps.month_completion_rate, 0) >= 80 then 'Consistency Elite' end,
        case when coalesce(ts.total_count, 0) >= 100 then 'Iron Voice' end,
        case when coalesce(cb.has_comeback, false) then 'Comeback' end
      ], null)::text[] as badges
    from students st
    left join streaks s on s.student_id = st.student_id
    left join point_summary ps on ps.student_id = st.student_id
    left join total_submissions ts on ts.student_id = st.student_id
    left join comeback cb on cb.student_id = st.student_id
  ),
  ranked as (
    select
      pp.*,
      ps.weekly_points,
      ps.monthly_points,
      ps.yearly_points,
      (rank() over (
        partition by pp.period
        order by pp.points desc, pp.active_days desc, pp.submitted_task_count desc, pp.display_name asc
      ))::int as rank_position,
      pp.student_id = auth.uid() as is_current_user,
      sb.badges
    from period_points pp
    left join point_summary ps on ps.student_id = pp.student_id
    left join student_badges sb on sb.student_id = pp.student_id
  )
  select
    ranked.period,
    case
      when ranked.is_current_user then ranked.student_id
      else null::uuid
    end as student_id,
    ranked.display_name,
    ranked.rank_position,
    ranked.is_current_user,
    ranked.points,
    coalesce(ranked.weekly_points, 0),
    coalesce(ranked.monthly_points, 0),
    coalesce(ranked.yearly_points, 0),
    coalesce(ranked.completion_rate, 0),
    ranked.submitted_task_count,
    coalesce(ranked.current_streak, 0),
    ranked.active_days,
    coalesce(ranked.badges, array[]::text[])
  from ranked
  where auth.uid() is not null
    and (
      ranked.rank_position <= 10
      or ranked.is_current_user
    )
  order by
    case ranked.period
      when 'week' then 1
      when 'month' then 2
      else 3
    end,
    ranked.rank_position,
    ranked.display_name
$$;

grant execute on function public.get_consistency_board() to authenticated;

commit;
