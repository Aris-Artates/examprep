-- ============================================================
--  ExamPrep PH — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Profiles (extends Supabase auth.users) ─────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Questions ───────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null,            -- array of 4 option strings
  correct_answer int not null,       -- 0-3 index of correct option
  subject text not null,             -- mathematics|science|english|abstract_reasoning|verbal
  difficulty text default 'medium',  -- easy|medium|hard
  year int,                          -- exam year (2016-2025)
  created_at timestamptz default now()
);

-- ── Test Attempts ────────────────────────────────────────────
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  total_score int,
  section_scores jsonb,              -- {mathematics: 45, science: 38, ...}
  answers jsonb,                     -- {question_id: selected_option_index}
  created_at timestamptz default now()
);

-- ── AI Predictions ────────────────────────────────────────────
create table if not exists public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.test_attempts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  school_compatibility jsonb not null,   -- [{name, region, compatibility%}]
  narrative text not null,               -- LLM-generated explanation
  created_at timestamptz default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.ai_predictions enable row level security;

-- Profiles: users see only their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Questions: anyone authenticated can read
create policy "Authenticated users can read questions"
  on public.questions for select using (auth.role() = 'authenticated');

-- Test attempts: users see only their own
create policy "Users can view own attempts"
  on public.test_attempts for select using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.test_attempts for insert with check (auth.uid() = user_id);

-- AI predictions: users see only their own
create policy "Users can view own predictions"
  on public.ai_predictions for select using (auth.uid() = user_id);

-- ============================================================
--  SAMPLE QUESTIONS (10 to get started)
-- ============================================================

insert into public.questions (question_text, options, correct_answer, subject, difficulty, year) values
('What is the value of x if 3x + 9 = 24?',
 '["x = 3", "x = 5", "x = 7", "x = 9"]', 1, 'mathematics', 'easy', 2023),

('A train travels 240 km in 3 hours. What is its average speed in km/h?',
 '["60 km/h", "70 km/h", "80 km/h", "90 km/h"]', 2, 'mathematics', 'easy', 2022),

('What is the powerhouse of the cell?',
 '["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"]', 2, 'science', 'easy', 2023),

('Which planet is known as the Red Planet?',
 '["Venus", "Jupiter", "Mars", "Saturn"]', 2, 'science', 'easy', 2022),

('Choose the word that best completes the sentence: The student was __ for finishing the project on time.',
 '["criticized", "commended", "ignored", "punished"]', 1, 'english', 'easy', 2023),

('Which word is the antonym of "benevolent"?',
 '["Kind", "Generous", "Malevolent", "Charitable"]', 2, 'english', 'medium', 2022),

('If all Bloops are Razzles and all Razzles are Lazzles, then all Bloops are definitely:',
 '["Razzles only", "Lazzles", "Neither Razzles nor Lazzles", "Cannot be determined"]', 1, 'abstract_reasoning', 'medium', 2023),

('What comes next in the sequence? 2, 6, 12, 20, 30, __',
 '["38", "40", "42", "44"]', 2, 'abstract_reasoning', 'medium', 2022),

('Which word is most similar in meaning to "ephemeral"?',
 '["Permanent", "Fleeting", "Ancient", "Substantial"]', 1, 'verbal', 'medium', 2023),

('The word "pedagogical" is most closely related to which field?',
 '["Medicine", "Engineering", "Teaching", "Law"]', 2, 'verbal', 'hard', 2022);
