export type Visibility = 'private' | 'shared';

export type Task = {
  id: string;
  owner_id: string;
  household_id: string | null;
  visibility: Visibility;
  title: string;
  completed: boolean;
  due_on: string | null;
  created_at: string;
};

export type Grocery = {
  id: string;
  household_id: string;
  added_by: string;
  name: string;
  checked: boolean;
  created_at: string;
};

export type Event = {
  id: string;
  owner_id: string;
  household_id: string | null;
  visibility: Visibility;
  title: string;
  starts_at: string;
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
};

export type MealPlan = {
  id: string;
  household_id: string;
  created_by: string;
  meal_date: string;
  meal_name: string;
  actual_meal: string | null;
  notes: string;
  status: 'planned' | 'eaten';
  eaten_at: string | null;
  created_at: string;
};

export type Page =
  | 'home'
  | 'tasks'
  | 'shopping'
  | 'calendar'
  | 'meals';