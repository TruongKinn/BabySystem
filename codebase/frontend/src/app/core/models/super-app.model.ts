export interface BabySummary {
  babyName: string;
  sleepHours: number;
  feedings: number;
  diaperChanges: number;
  nextVaccination: string;
}

export interface ExpenseSummary {
  spentToday: number;
  monthlyBudget: number;
  monthlySpent: number;
  topCategory: string;
}

export interface MealPlanItem {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  dueAt: string;
  done: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'MOM' | 'DAD' | 'GRANDMA' | 'CAREGIVER';
  avatarColor: string;
}

export interface DashboardSnapshot {
  familyName: string;
  expense: ExpenseSummary;
  baby: BabySummary;
  todayMeals: string[];
  pendingTasks: number;
  shoppingReminders: number;
  moodScore: number;
}
