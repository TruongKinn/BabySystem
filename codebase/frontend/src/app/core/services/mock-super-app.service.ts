import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  DashboardSnapshot,
  FamilyMember,
  MealPlanItem,
  ShoppingItem,
  TaskItem
} from '../models/super-app.model';

@Injectable({
  providedIn: 'root'
})
export class MockSuperAppService {
  getDashboard(): Observable<DashboardSnapshot> {
    return of({
      familyName: 'Nhà bé Bơ',
      expense: {
        spentToday: 320000,
        monthlyBudget: 12000000,
        monthlySpent: 7450000,
        topCategory: 'Sữa & bỉm'
      },
      baby: {
        babyName: 'Bơ',
        sleepHours: 11.2,
        feedings: 6,
        diaperChanges: 5,
        nextVaccination: '2026-05-21'
      },
      todayMeals: ['Cháo yến mạch + chuối', 'Cơm gà nấm', 'Canh bí đỏ thịt bằm'],
      pendingTasks: 4,
      shoppingReminders: 7,
      moodScore: 82
    });
  }

  getWeekMeals(): Observable<MealPlanItem[]> {
    return of([
      { day: 'Thứ 2', breakfast: 'Bánh mì trứng', lunch: 'Cơm cá hồi', dinner: 'Canh rong biển' },
      { day: 'Thứ 3', breakfast: 'Yogurt + trái cây', lunch: 'Mì gà', dinner: 'Thịt kho trứng' },
      { day: 'Thứ 4', breakfast: 'Cháo yến mạch', lunch: 'Cơm bò sốt', dinner: 'Canh bí đỏ' },
      { day: 'Thứ 5', breakfast: 'Sandwich', lunch: 'Cơm tôm rau củ', dinner: 'Miến gà' },
      { day: 'Thứ 6', breakfast: 'Phở bò', lunch: 'Cơm sườn', dinner: 'Súp ngô gà' }
    ]);
  }

  getTasks(): Observable<TaskItem[]> {
    return of([
      { id: 't1', title: 'Đặt lịch tiêm vaccine', assignee: 'Mẹ', dueAt: '2026-05-13 09:00', done: false },
      { id: 't2', title: 'Mua bỉm size M', assignee: 'Bố', dueAt: '2026-05-12 19:00', done: false },
      { id: 't3', title: 'Thanh toán tiền điện', assignee: 'Mẹ', dueAt: '2026-05-14 20:00', done: false },
      { id: 't4', title: 'Giặt đồ em bé', assignee: 'Bà', dueAt: '2026-05-12 15:00', done: true }
    ]);
  }

  getShoppingItems(): Observable<ShoppingItem[]> {
    return of([
      { id: 's1', name: 'Bỉm size M', quantity: '2 gói', checked: false },
      { id: 's2', name: 'Sữa công thức', quantity: '1 hộp', checked: false },
      { id: 's3', name: 'Cà rốt', quantity: '500g', checked: true },
      { id: 's4', name: 'Yến mạch', quantity: '1 túi', checked: false }
    ]);
  }

  getFamilyMembers(): Observable<FamilyMember[]> {
    return of([
      { id: 'u1', name: 'Ngọc Anh', role: 'MOM', avatarColor: '#f59e0b' },
      { id: 'u2', name: 'Minh Khang', role: 'DAD', avatarColor: '#0ea5e9' },
      { id: 'u3', name: 'Bà Hạnh', role: 'GRANDMA', avatarColor: '#a855f7' }
    ]);
  }
}
