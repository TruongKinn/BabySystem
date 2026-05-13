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

export type TaskItemStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeUserId: number | null;
  createdByUserId: number | null;
  dueAt: string;
  dueAtRaw: string | null;
  done: boolean;
  status: TaskItemStatus;
}

export interface TaskOverview {
  familyId: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  unassignedTasks: number;
  completionRate: number;
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
