export type Visibility = 'private' | 'shared';
export type Task = {
  id: string; owner_id: string; household_id: string | null;
  visibility: Visibility; title: string; completed: boolean;
  due_on: string | null; created_at: string;
  completed_by: string | null; completed_at: string | null;
};
export type Grocery = {
  id: string; household_id: string; added_by: string;
  name: string; checked: boolean; checked_at: string | null; created_at: string; visibility: Visibility;
};
export type Event = {
  id: string; owner_id: string; household_id: string | null;
  visibility: Visibility; title: string; starts_at: string; created_at: string;
};
export type Household = { id: string; name: string; invite_code: string; created_by: string };
export type MealPlan = {
  id: string; household_id: string; created_by: string;
  meal_date: string; meal_name: string; actual_meal: string | null; notes: string;
  status: 'planned' | 'eaten'; eaten_at: string | null; created_at: string;
};
export type Page = 'home' | 'tasks' | 'shopping' | 'calendar' | 'meals';

export type Recipe = {
  id: string; household_id: string; created_by: string;
  name: string; ingredients: string; instructions: string;
  favorite: boolean; created_at: string;
};
export type Routine = {
  id: string; household_id: string | null; owner_id: string;
  visibility: Visibility; title: string; start_on: string;
  interval_weeks: 1 | 2; created_at: string;
};
export type RoutineCompletion = {
  id: string; routine_id: string; occurrence_date: string;
  completed_by: string; created_at: string;
};

export type MemberProfile = { user_id: string; household_id: string; display_name: string };
