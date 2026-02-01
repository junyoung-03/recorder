-- helper functions
create or replace function public.is_friend(viewer uuid, owner uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = viewer and f.addressee_id = owner) or
        (f.requester_id = owner and f.addressee_id = viewer)
      )
  );
$$;

create or replace function public.can_view_meal(viewer uuid, owner uuid)
returns boolean
language sql
stable
as $$
  select viewer = owner or public.is_friend(viewer, owner);
$$;

create or replace function public.can_view_journal(viewer uuid, owner uuid)
returns boolean
language sql
stable
as $$
  select viewer = owner or public.is_friend(viewer, owner);
$$;

-- profiles
alter table public.profiles enable row level security;

create policy profiles_select_authenticated
on public.profiles for select
to authenticated
using (true);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy profiles_delete_own
on public.profiles for delete
to authenticated
using (user_id = auth.uid());

-- friendships
alter table public.friendships enable row level security;

create policy friendships_select_involved
on public.friendships for select
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy friendships_insert_requester
on public.friendships for insert
to authenticated
with check (requester_id = auth.uid());

create policy friendships_update_involved
on public.friendships for update
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid())
with check (requester_id = auth.uid() or addressee_id = auth.uid());

create policy friendships_delete_involved
on public.friendships for delete
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

-- private domain tables
alter table public.finance_records enable row level security;
alter table public.schedules enable row level security;
alter table public.todos enable row level security;
alter table public.exercise_plans enable row level security;
alter table public.exercise_records enable row level security;
alter table public.body_records enable row level security;

create policy finance_records_owner_all
on public.finance_records for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy schedules_owner_all
on public.schedules for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy todos_owner_all
on public.todos for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy exercise_plans_owner_all
on public.exercise_plans for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy exercise_records_owner_all
on public.exercise_records for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy body_records_owner_all
on public.body_records for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- social domain tables
alter table public.meal_records enable row level security;
alter table public.journals enable row level security;
alter table public.journal_categories enable row level security;

create policy meal_records_select
on public.meal_records for select
to authenticated
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'friends' and public.can_view_meal(auth.uid(), user_id))
);

create policy meal_records_owner_modify
on public.meal_records for insert
to authenticated
with check (user_id = auth.uid());

create policy meal_records_owner_update
on public.meal_records for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy meal_records_owner_delete
on public.meal_records for delete
to authenticated
using (user_id = auth.uid());

create policy journals_select
on public.journals for select
to authenticated
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'friends' and public.can_view_journal(auth.uid(), user_id))
);

create policy journals_owner_insert
on public.journals for insert
to authenticated
with check (user_id = auth.uid());

create policy journals_owner_update
on public.journals for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy journals_owner_delete
on public.journals for delete
to authenticated
using (user_id = auth.uid());

create policy journal_categories_owner_all
on public.journal_categories for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- comments
alter table public.comments enable row level security;

create policy comments_select
on public.comments for select
to authenticated
using (
  (
    meal_id is not null and exists (
      select 1
      from public.meal_records m
      where m.id = comments.meal_id
        and (
          m.user_id = auth.uid()
          or m.visibility = 'public'
          or (m.visibility = 'friends' and public.can_view_meal(auth.uid(), m.user_id))
        )
    )
  )
  or
  (
    journal_id is not null and exists (
      select 1
      from public.journals j
      where j.id = comments.journal_id
        and (
          j.user_id = auth.uid()
          or j.visibility = 'public'
          or (j.visibility = 'friends' and public.can_view_journal(auth.uid(), j.user_id))
        )
    )
  )
);

create policy comments_insert
on public.comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (
      meal_id is not null and exists (
        select 1
        from public.meal_records m
        where m.id = comments.meal_id
          and (
            m.user_id = auth.uid()
            or m.visibility = 'public'
            or (m.visibility = 'friends' and public.can_view_meal(auth.uid(), m.user_id))
          )
      )
    )
    or
    (
      journal_id is not null and exists (
        select 1
        from public.journals j
        where j.id = comments.journal_id
          and (
            j.user_id = auth.uid()
            or j.visibility = 'public'
            or (j.visibility = 'friends' and public.can_view_journal(auth.uid(), j.user_id))
          )
      )
    )
  )
);

create policy comments_update_own
on public.comments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy comments_delete_own
on public.comments for delete
to authenticated
using (user_id = auth.uid());

-- likes
alter table public.likes enable row level security;

create policy likes_select
on public.likes for select
to authenticated
using (
  (
    meal_id is not null and exists (
      select 1
      from public.meal_records m
      where m.id = likes.meal_id
        and (
          m.user_id = auth.uid()
          or m.visibility = 'public'
          or (m.visibility = 'friends' and public.can_view_meal(auth.uid(), m.user_id))
        )
    )
  )
  or
  (
    journal_id is not null and exists (
      select 1
      from public.journals j
      where j.id = likes.journal_id
        and (
          j.user_id = auth.uid()
          or j.visibility = 'public'
          or (j.visibility = 'friends' and public.can_view_journal(auth.uid(), j.user_id))
        )
    )
  )
);

create policy likes_insert
on public.likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (
      meal_id is not null and exists (
        select 1
        from public.meal_records m
        where m.id = likes.meal_id
          and (
            m.user_id = auth.uid()
            or m.visibility = 'public'
            or (m.visibility = 'friends' and public.can_view_meal(auth.uid(), m.user_id))
          )
      )
    )
    or
    (
      journal_id is not null and exists (
        select 1
        from public.journals j
        where j.id = likes.journal_id
          and (
            j.user_id = auth.uid()
            or j.visibility = 'public'
            or (j.visibility = 'friends' and public.can_view_journal(auth.uid(), j.user_id))
          )
      )
    )
  )
);

create policy likes_delete_own
on public.likes for delete
to authenticated
using (user_id = auth.uid());

