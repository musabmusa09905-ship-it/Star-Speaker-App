-- Add the final MVP writing review fields without removing the earlier
-- correction_note / encouragement_note columns used by existing data.

begin;

alter table public.writing_submissions
  add column if not exists one_correction text,
  add column if not exists encouragement text,
  add column if not exists clarity_score integer,
  add column if not exists accuracy_score integer,
  add column if not exists structure_score integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'writing_submissions_clarity_score_range'
  ) then
    alter table public.writing_submissions
      add constraint writing_submissions_clarity_score_range
      check (clarity_score is null or clarity_score between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'writing_submissions_accuracy_score_range'
  ) then
    alter table public.writing_submissions
      add constraint writing_submissions_accuracy_score_range
      check (accuracy_score is null or accuracy_score between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'writing_submissions_structure_score_range'
  ) then
    alter table public.writing_submissions
      add constraint writing_submissions_structure_score_range
      check (structure_score is null or structure_score between 1 and 5);
  end if;
end $$;

update public.writing_submissions
set
  one_correction = coalesce(nullif(trim(one_correction), ''), correction_note),
  encouragement = coalesce(nullif(trim(encouragement), ''), encouragement_note)
where
  (one_correction is null or trim(one_correction) = '')
  or (encouragement is null or trim(encouragement) = '');

commit;
