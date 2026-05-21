import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FamilyMember, TaskItem } from '../core/models/super-app.model';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { SuperAppCommandService, TaskStatus } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

type TaskFilter = 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'ASSIGNED_TO_ME' | 'CREATED_BY_ME';
type TaskView = 'LIST' | 'CALENDAR' | 'KANBAN';

interface TaskSummary {
  total: number;
  today: number;
  upcoming: number;
  overdue: number;
  done: number;
  assignedToMe: number;
  createdByMe: number;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    TranslateModule,
    NzButtonModule,
    NzCalendarModule,
    NzCardModule,
    NzDatePickerModule,
    NzDescriptionsModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  readonly boardOrder: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE'];
  readonly filterOptions: { labelKey: string; value: TaskFilter }[] = [
    { labelKey: 'momApp.tasks.filters.today', value: 'TODAY' },
    { labelKey: 'momApp.tasks.filters.upcoming', value: 'UPCOMING' },
    { labelKey: 'momApp.tasks.filters.overdue', value: 'OVERDUE' },
    { labelKey: 'momApp.tasks.filters.assignedToMe', value: 'ASSIGNED_TO_ME' },
    { labelKey: 'momApp.tasks.filters.createdByMe', value: 'CREATED_BY_ME' }
  ];

  readonly taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(600)]],
    assigneeUserId: [null as string | number | null],
    dueAt: [null as Date | null, [Validators.required]]
  });

  readonly assignTaskForm = this.fb.group({
    assigneeUserId: [null as string | number | null, [Validators.required]]
  });

  loading = false;
  saving = false;
  assignSaving = false;

  view: TaskView = 'LIST';
  filter: TaskFilter = 'TODAY';
  selectedDate = new Date();

  listPageIndex = 1;
  listPageSize = 10;

  tasks: TaskItem[] = [];
  filteredTasks: TaskItem[] = [];
  members: FamilyMember[] = [];
  summary: TaskSummary = {
    total: 0,
    today: 0,
    upcoming: 0,
    overdue: 0,
    done: 0,
    assignedToMe: 0,
    createdByMe: 0
  };

  board: Record<TaskStatus, TaskItem[]> = {
    PENDING: [],
    IN_PROGRESS: [],
    DONE: []
  };

  boardColumns: Array<{ status: TaskStatus; items: TaskItem[] }> = [
    { status: 'PENDING', items: [] },
    { status: 'IN_PROGRESS', items: [] },
    { status: 'DONE', items: [] }
  ];

  selectedTask: TaskItem | null = null;

  taskModalVisible = false;
  editingTask: TaskItem | null = null;

  assignModalVisible = false;
  assigningTask: TaskItem | null = null;

  private readonly currentUserId = this.command.getUserId();

  ngOnInit(): void {
    this.loadWorkspace();
  }

  get listStart(): number {
    return this.filteredTasks.length ? (this.listPageIndex - 1) * this.listPageSize + 1 : 0;
  }

  get listEnd(): number {
    return Math.min(this.listPageIndex * this.listPageSize, this.filteredTasks.length);
  }

  get selectedDateItems(): TaskItem[] {
    return this.filteredTasks
      .filter((task) => {
        const due = this.toDate(task.dueAtRaw);
        return due !== null && this.isSameDay(due, this.selectedDate);
      })
      .sort((left, right) => {
        const leftDue = this.toDate(left.dueAtRaw)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDue = this.toDate(right.dueAtRaw)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDue - rightDue;
      });
  }

  loadWorkspace(): void {
    this.loading = true;

    forkJoin({
      tasks: this.data.getTasks(null),
      members: this.data.getFamilyMembers()
    })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: ({ tasks, members }) => {
          this.tasks = this.sortTasks(tasks);
          this.members = this.normalizeMembers(members);
          this.summary = this.buildSummary(this.tasks);
          this.applyFilterAndBoard();
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.tasks.messages.loadFailed')
          );
        }
      });
  }

  changeView(view: TaskView): void {
    this.view = view;
  }

  changeFilter(filter: TaskFilter): void {
    this.filter = filter;
    this.listPageIndex = 1;
    this.applyFilterAndBoard();
  }

  getFilterCount(filter: TaskFilter): number {
    const map: Record<TaskFilter, number> = {
      TODAY: this.summary.today,
      UPCOMING: this.summary.upcoming,
      OVERDUE: this.summary.overdue,
      ASSIGNED_TO_ME: this.summary.assignedToMe,
      CREATED_BY_ME: this.summary.createdByMe
    };
    return map[filter] ?? 0;
  }

  openCreateModal(): void {
    this.editingTask = null;
    this.taskForm.reset({
      title: '',
      description: '',
      assigneeUserId: null,
      dueAt: null
    });
    this.taskModalVisible = true;
  }

  openEditModal(task: TaskItem): void {
    this.editingTask = task;
    this.taskForm.reset({
      title: task.title,
      description: task.description,
      assigneeUserId: this.toMemberValue(task.assigneeUserId),
      dueAt: this.toDate(task.dueAtRaw)
    });
    this.taskModalVisible = true;
  }

  closeTaskModal(): void {
    this.taskModalVisible = false;
    this.saving = false;
    this.editingTask = null;
    this.taskForm.reset({
      title: '',
      description: '',
      assigneeUserId: null,
      dueAt: null
    });
  }

  submitTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const title = this.taskForm.controls.title.value?.trim() ?? '';
    const description = this.taskForm.controls.description.value?.trim() ?? '';
    const assigneeUserId = this.parseAssigneeUserId(this.taskForm.controls.assigneeUserId.value);
    const dueAt = this.taskForm.controls.dueAt.value?.toISOString();

    this.saving = true;

    if (this.editingTask) {
      const taskId = this.parseTaskId(this.editingTask.id);
      if (taskId === null) {
        this.saving = false;
        return;
      }

      this.command
        .updateTask(taskId, {
          title,
          description,
          assigneeUserId,
          dueAt,
          status: this.editingTask.status
        })
        .pipe(finalize(() => {
          this.saving = false;
        }))
        .subscribe({
          next: () => {
            this.closeTaskModal();
            this.loadWorkspace();
            this.notification.success(
              this.i18n.translate('momApp.common.success'),
              this.i18n.translate('momApp.tasks.messages.updateSuccess')
            );
          },
          error: (err) => {
            this.notification.error(
              this.i18n.translate('common.errorTitle'),
              err?.error?.message || this.i18n.translate('momApp.tasks.messages.updateFailed')
            );
          }
        });
      return;
    }

    this.command
      .createTask({
        title,
        description,
        assigneeUserId,
        dueAt,
        createdByUserId: this.currentUserId
      })
      .pipe(finalize(() => {
        this.saving = false;
      }))
      .subscribe({
        next: () => {
          this.closeTaskModal();
          this.loadWorkspace();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.tasks.messages.createSuccess')
          );
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.tasks.messages.createFailed')
          );
        }
      });
  }

  openAssignModal(task: TaskItem): void {
    this.assigningTask = task;
    this.assignTaskForm.reset({
      assigneeUserId: this.toMemberValue(task.assigneeUserId)
    });
    this.assignModalVisible = true;
  }

  closeAssignModal(): void {
    this.assignModalVisible = false;
    this.assignSaving = false;
    this.assigningTask = null;
    this.assignTaskForm.reset({
      assigneeUserId: null
    });
  }

  submitAssign(): void {
    if (this.assignTaskForm.invalid) {
      this.assignTaskForm.markAllAsTouched();
      return;
    }

    if (!this.assigningTask) {
      return;
    }

    const taskId = this.parseTaskId(this.assigningTask.id);
    const assigneeUserId = this.parseAssigneeUserId(this.assignTaskForm.controls.assigneeUserId.value);
    if (taskId === null || assigneeUserId === null) {
      return;
    }

    this.assignSaving = true;
    this.command.assignTask(taskId, assigneeUserId)
      .pipe(finalize(() => {
        this.assignSaving = false;
      }))
      .subscribe({
        next: () => {
          this.closeAssignModal();
          this.loadWorkspace();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.tasks.messages.assignSuccess')
          );
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.tasks.messages.assignFailed')
          );
        }
      });
  }

  startTask(task: TaskItem): void {
    this.updateTaskStatus(task, 'IN_PROGRESS', 'momApp.tasks.messages.startSuccess', 'momApp.tasks.messages.startFailed');
  }

  completeTask(task: TaskItem): void {
    this.updateTaskStatus(task, 'DONE', 'momApp.tasks.messages.completeSuccess', 'momApp.tasks.messages.completeFailed');
  }

  deleteTask(task: TaskItem): void {
    const taskId = this.parseTaskId(task.id);
    if (taskId === null) {
      return;
    }

    this.command.deleteTask(taskId).subscribe({
      next: () => {
        this.loadWorkspace();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.tasks.messages.deleteSuccess')
        );
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.tasks.messages.deleteFailed')
        );
      }
    });
  }

  onCalendarDateChange(date: Date): void {
    this.selectedDate = date;
  }

  calendarCount(date: Date): number {
    return this.filteredTasks.filter((task) => {
      const due = this.toDate(task.dueAtRaw);
      return due !== null && this.isSameDay(due, date);
    }).length;
  }

  selectTask(task: TaskItem): void {
    this.selectedTask = task;
  }

  drop(event: CdkDragDrop<TaskItem[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    const movedTask = event.container.data[event.currentIndex];
    if (!movedTask) {
      return;
    }

    const taskId = this.parseTaskId(movedTask.id);
    if (taskId === null) {
      this.loadWorkspace();
      return;
    }

    const originalStatus = movedTask.status;
    movedTask.status = targetStatus;

    this.command.updateTaskStatus(taskId, targetStatus).subscribe({
      next: () => {
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.tasks.messages.dragUpdateSuccess')
        );
        this.loadWorkspace();
      },
      error: (err) => {
        movedTask.status = originalStatus;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.tasks.messages.dragUpdateFailed')
        );
        this.loadWorkspace();
      }
    });
  }

  onListPageIndexChange(index: number): void {
    this.listPageIndex = index;
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize = size;
    this.listPageIndex = 1;
  }

  refresh(): void {
    this.loadWorkspace();
  }

  statusLabelKey(status: TaskStatus): string {
    if (status === 'PENDING') {
      return 'momApp.tasks.status.pending';
    }
    if (status === 'IN_PROGRESS') {
      return 'momApp.tasks.status.inProgress';
    }
    return 'momApp.tasks.status.done';
  }

  statusColor(status: TaskStatus): string {
    if (status === 'PENDING') {
      return 'gold';
    }
    if (status === 'IN_PROGRESS') {
      return 'processing';
    }
    return 'success';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return this.i18n.translate('momApp.tasks.noDeadline');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  dropListId(status: TaskStatus): string {
    return `tasks-board-${status}`;
  }

  trackByTaskId(_: number, task: TaskItem): string {
    return task.id;
  }

  trackByColumn(_: number, column: { status: TaskStatus }): string {
    return column.status;
  }

  private updateTaskStatus(task: TaskItem, status: TaskStatus, successKey: string, failedKey: string): void {
    const taskId = this.parseTaskId(task.id);
    if (taskId === null) {
      return;
    }

    this.command.updateTaskStatus(taskId, status).subscribe({
      next: () => {
        this.loadWorkspace();
        this.notification.success(this.i18n.translate('momApp.common.success'), this.i18n.translate(successKey));
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate(failedKey)
        );
      }
    });
  }

  private applyFilterAndBoard(): void {
    this.filteredTasks = this.sortTasks(this.tasks.filter((task) => this.matchesFilter(task, this.filter)));
    this.board = {
      PENDING: this.filteredTasks.filter((task) => task.status === 'PENDING'),
      IN_PROGRESS: this.filteredTasks.filter((task) => task.status === 'IN_PROGRESS'),
      DONE: this.filteredTasks.filter((task) => task.status === 'DONE')
    };

    for (const col of this.boardColumns) {
      col.items = this.board[col.status] ?? [];
    }

    const selectedTaskId = this.selectedTask?.id ?? null;
    if (!selectedTaskId || !this.filteredTasks.some((task) => task.id === selectedTaskId)) {
      this.selectedTask = this.filteredTasks[0] ?? null;
    } else {
      const refreshedSelected = this.filteredTasks.find((task) => task.id === selectedTaskId);
      this.selectedTask = refreshedSelected ?? null;
    }

    const maxPage = Math.max(1, Math.ceil(this.filteredTasks.length / this.listPageSize));
    this.listPageIndex = Math.min(this.listPageIndex, maxPage);
  }

  private matchesFilter(task: TaskItem, filter: TaskFilter): boolean {
    const due = this.toDate(task.dueAtRaw);
    const now = new Date();
    const endOfToday = this.endOfDay(now);

    if (filter === 'TODAY') {
      return due !== null && this.isSameDay(due, now) && task.status !== 'DONE';
    }

    if (filter === 'UPCOMING') {
      return due !== null && due.getTime() > endOfToday.getTime() && task.status !== 'DONE';
    }

    if (filter === 'OVERDUE') {
      return due !== null && due.getTime() < now.getTime() && task.status !== 'DONE';
    }

    if (filter === 'ASSIGNED_TO_ME') {
      return this.currentUserId !== null && task.assigneeUserId === this.currentUserId;
    }

    return this.currentUserId !== null && task.createdByUserId === this.currentUserId;
  }

  private buildSummary(tasks: TaskItem[]): TaskSummary {
    const now = new Date();
    const endOfToday = this.endOfDay(now);

    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    let done = 0;
    let assignedToMe = 0;
    let createdByMe = 0;

    for (const task of tasks) {
      const due = this.toDate(task.dueAtRaw);

      if (task.status === 'DONE') {
        done += 1;
      }

      if (this.currentUserId !== null && task.assigneeUserId === this.currentUserId) {
        assignedToMe += 1;
      }

      if (this.currentUserId !== null && task.createdByUserId === this.currentUserId) {
        createdByMe += 1;
      }

      if (!due || task.status === 'DONE') {
        continue;
      }

      if (this.isSameDay(due, now)) {
        today += 1;
      } else if (due.getTime() > endOfToday.getTime()) {
        upcoming += 1;
      } else if (due.getTime() < now.getTime()) {
        overdue += 1;
      }
    }

    return {
      total: tasks.length,
      today,
      upcoming,
      overdue,
      done,
      assignedToMe,
      createdByMe
    };
  }

  private sortTasks(tasks: TaskItem[]): TaskItem[] {
    return [...tasks].sort((left, right) => {
      const leftDue = this.toDate(left.dueAtRaw)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = this.toDate(right.dueAtRaw)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }
      return left.title.localeCompare(right.title);
    });
  }

  private toDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private endOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  private parseTaskId(taskId: string): number | null {
    const parsed = Number(taskId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private parseAssigneeUserId(rawValue: string | number | null): number | null {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private toMemberValue(userId: number | null): string | null {
    if (userId === null || userId === undefined) {
      return null;
    }
    return String(userId);
  }

  private normalizeMembers(members: FamilyMember[]): FamilyMember[] {
    const normalized = members
      .filter((member) => !!member.id)
      .map((member) => ({
        ...member,
        id: String(member.id)
      }));

    if (normalized.length > 0) {
      return normalized;
    }

    if (this.currentUserId === null) {
      return normalized;
    }

    return [{
      id: String(this.currentUserId),
      name: this.resolveCurrentUserName(),
      role: 'CAREGIVER',
      avatarColor: '#0ea5e9'
    }];
  }

  private resolveCurrentUserName(): string {
    if (typeof window === 'undefined') {
      return 'Me';
    }
    return window.localStorage.getItem('atg_username')
      || window.localStorage.getItem('mom_display_name')
      || 'Me';
  }

  private isSameDay(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }
}
