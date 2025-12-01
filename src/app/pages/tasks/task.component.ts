import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../auth/services/task.service';
import { NotificationService } from '../../auth/services/notification.service';
import { Task, CreateTaskDto, UpdateTaskDto, TaskFilters, TaskStatus, TaskPriority, Project, Timeline, ProjectMember } from '../../auth/models/task.model';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { TaskCommentsComponent } from '../../auth/components/task-comments/task-comments.component';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TaskCommentsComponent],
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css']
})
export class TaskComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  paginatedTasks: Task[] = [];
  
  // Reference data
  taskStatuses: TaskStatus[] = [];
  taskPriorities: TaskPriority[] = [];
  projects: Project[] = [];
  timelines: Timeline[] = [];
  members: ProjectMember[] = [];
  
  // Forms
  taskForm!: FormGroup;
  filterForm!: FormGroup;
  
  // UI states
  showCreateModal = false;
  showEditModal = false;
  showAssignModal = false;
  isLoading = false;
  currentTask: Task | null = null;
  currentAssignTask: Task | null = null;
  
  // Temporary assignments
  tempAssignments: string[] = [];
  
  // Loading states
  loadingStates = {
    tasks: false,
    statuses: false,
    priorities: false,
    projects: false,
    timelines: false,
    members: false
  };

  // Colors for assignees
  assigneeColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
    'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
  ];

  showCommentsModal = false;
  currentCommentsTask: Task | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pageSizeOptions = [5, 10, 25, 50];
  Math = Math;

  constructor(
    private taskService: TaskService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadInitialData();
  }

  private initializeForms(): void {
    // Set default date (tomorrow at 9AM)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    defaultDate.setHours(9, 0, 0, 0);

    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      dueStart: [this.formatDateForInput(defaultDate), [Validators.required]],
      dueEnd: [''],
      startDate: [''],
      endDate: [''],
      estimatedHours: [null, [Validators.min(0)]],
      actualHours: [null, [Validators.min(0)]],
      statusId: ['', Validators.required],
      priorityId: ['', Validators.required],
      projectId: ['', Validators.required],
      timelineId: [''],
      assigneeIds: [[]]
    });

    this.filterForm = this.fb.group({
      projectId: [''],
      statusId: [''],
      timelineId: [''],
      search: ['']
    });
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load essential data first
      await Promise.all([
        this.loadTaskStatuses(),
        this.loadTaskPriorities(),
        this.loadProjects()
      ]);
      
      // Then load secondary data
      await Promise.all([
        this.loadTasks(),
        this.loadTimelines(),
        this.loadMembers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showError('Error', 'Failed to load initial data. Please check your connection.');
    } finally {
      this.isLoading = false;
    }
  }

  // Data loading methods
  private async loadTasks(filters?: TaskFilters): Promise<void> {
    this.loadingStates.tasks = true;
    try {
      this.tasks = await this.taskService.getTasks(filters).toPromise() || [];
      this.filteredTasks = [...this.tasks];
      this.updatePagination();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showError('Error', 'Failed to load tasks');
    } finally {
      this.loadingStates.tasks = false;
    }
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTasks.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTasks = this.filteredTasks.slice(startIndex, endIndex);
  }

  // Pagination methods
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.updatePagination();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  private async loadTaskStatuses(): Promise<void> {
    this.loadingStates.statuses = true;
    try {
      this.taskStatuses = await this.taskService.getTaskStatuses().toPromise() || [];
    } catch (error) {
      console.error('Error loading task statuses:', error);
      this.taskStatuses = [];
    } finally {
      this.loadingStates.statuses = false;
    }
  }

  private async loadTaskPriorities(): Promise<void> {
    this.loadingStates.priorities = true;
    try {
      this.taskPriorities = await this.taskService.getTaskPriorities().toPromise() || [];
    } catch (error) {
      console.error('Error loading task priorities:', error);
      this.taskPriorities = [];
    } finally {
      this.loadingStates.priorities = false;
    }
  }

  private async loadProjects(): Promise<void> {
    this.loadingStates.projects = true;
    try {
      this.projects = await this.taskService.getProjects().toPromise() || [];
    } catch (error) {
      console.error('Error loading projects:', error);
      this.projects = [];
    } finally {
      this.loadingStates.projects = false;
    }
  }

  private async loadTimelines(): Promise<void> {
    this.loadingStates.timelines = true;
    try {
      this.timelines = await this.taskService.getTimelines().toPromise() || [];
    } catch (error) {
      console.error('Error loading timelines:', error);
      this.timelines = [];
    } finally {
      this.loadingStates.timelines = false;
    }
  }

  private async loadMembers(): Promise<void> {
    this.loadingStates.members = true;
    try {
      this.members = await this.taskService.getMembers().toPromise() || [];
      if (this.members.length === 0) {
        this.members = this.createDefaultMember();
      }
    } catch (error) {
      console.error('Error loading members:', error);
      this.members = this.createDefaultMember();
    } finally {
      this.loadingStates.members = false;
    }
  }

  // Modal management
  openCreateModal(): void {
    this.currentTask = null;
    this.taskForm.reset();
    
    // Set default values after reset
    setTimeout(() => {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      defaultDate.setHours(9, 0, 0, 0);

      this.taskForm.patchValue({
        dueStart: this.formatDateForInput(defaultDate),
        assigneeIds: []
      });
    }, 0);
    
    this.showCreateModal = true;
  }

  openEditModal(task: Task): void {
    this.currentTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      dueStart: this.formatDateForInput(task.dueStart),
      dueEnd: task.dueEnd ? this.formatDateForInput(task.dueEnd) : '',
      startDate: task.startDate ? this.formatDateForInput(task.startDate) : '',
      endDate: task.endDate ? this.formatDateForInput(task.endDate) : '',
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      statusId: task.statusId,
      priorityId: task.priorityId,
      projectId: task.projectId,
      timelineId: task.timelineId,
      assigneeIds: this.getTaskAssignees(task).map(a => a.memberId || a.member?.id)
    });
    this.showEditModal = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showAssignModal = false;
    this.showCommentsModal = false;
    this.currentTask = null;
    this.currentAssignTask = null;
    this.currentCommentsTask = null;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.currentAssignTask = null;
    this.tempAssignments = [];
  }

  isCurrentlyAssigned(memberId: string): boolean {
    return this.tempAssignments.includes(memberId);
  }

  onDateChange(event: any): void {
    console.log('Date changed:', event.target.value);
  }

  // Form submission
  async onSubmit(): Promise<void> {
    this.markFormGroupTouched(this.taskForm);

    if (this.taskForm.invalid) {
      this.showError('Formulaire invalide', 'Veuillez remplir tous les champs requis');
      return;
    }

    const formData = this.taskForm.value;
    const statusName = this.taskStatuses.find(s => s.id === formData.statusId)?.name || '';

    try {
      if (this.currentTask) {
        const updateDto = this.prepareUpdateTaskDto(formData);
        await this.updateTask(this.currentTask.id, updateDto);
        
        // Vérifier si le statut est "terminé"
        if (statusName.toLowerCase().includes('terminé') || 
            statusName.toLowerCase().includes('completed')) {
          await this.sendTaskCompletedNotification(this.currentTask.id, this.currentTask.title);
        }
        
      } else {
        const createDto = this.prepareCreateTaskDto(formData);
        await this.createTask(createDto);
      }

      await this.loadTasks();
      this.closeModals();
      this.showSuccess('Succès', 'Tâche sauvegardée');
      
    } catch (error) {
      console.error('Erreur soumission formulaire:', error);
      this.showError('Erreur', 'Échec de la sauvegarde');
    }
  }

  private async sendTaskCompletedNotification(taskId: string, taskTitle: string): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId).toPromise();
      
      if (task && task.assignees && task.assignees.length > 0) {
        const assigneeIds = task.assignees
          .map(a => a.memberId || a.member?.id)
          .filter(id => id !== undefined && id !== null);

        this.notificationService.createTaskCompletedNotification(
          assigneeIds as string[],
          taskTitle,
          taskId,
          this.authService.getCurrentUser()?.id
        ).subscribe({
          next: (response) => {
            console.log('Notification tâche terminée envoyée:', response);
          },
          error: (error) => {
            console.warn('Erreur notification tâche terminée:', error);
          }
        });
      }
    } catch (error) {
      console.warn('Erreur récupération tâche pour notification:', error);
    }
  }

  // Méthodes pour ouvrir/fermer le modal des commentaires
  openCommentsModal(task: Task): void {
    this.currentCommentsTask = task;
    this.showCommentsModal = true;
  }

  closeCommentsModal(): void {
    this.showCommentsModal = false;
    this.currentCommentsTask = null;
  }

  /**
   * Envoie une notification de commentaire sur une tâche
   */
  async sendTaskCommentNotification(
    taskId: string,
    taskTitle: string,
    commentContent: string,
    commentAuthorId?: string
  ): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId).toPromise();
      
      if (task && task.assignees && task.assignees.length > 0) {
        const assigneeIds = task.assignees
          .map(a => a.memberId || a.member?.id)
          .filter(id => id !== undefined && id !== null);

        this.notificationService.createTaskCommentNotification(
          taskId,
          taskTitle,
          commentContent,
          commentAuthorId || this.authService.getCurrentUser()?.id,
          assigneeIds as string[]
        ).subscribe({
          next: (response) => {
            console.log('Notification commentaire envoyée:', response);
          },
          error: (error) => {
            console.warn('Erreur notification commentaire:', error);
          }
        });
      }
    } catch (error) {
      console.warn('Erreur récupération tâche pour notification commentaire:', error);
    }
  }

  /**
   * Envoie une notification de rappel pour une tâche
   */
  async sendTaskReminderNotification(
    taskId: string,
    taskTitle: string,
    reminderType: 'DUE_SOON' | 'OVERDUE' = 'DUE_SOON'
  ): Promise<void> {
    try {
      const task = await this.taskService.getTaskById(taskId).toPromise();
      
      if (task && task.assignees && task.assignees.length > 0) {
        const assigneeIds = task.assignees
          .map(a => a.memberId || a.member?.id)
          .filter(id => id !== undefined && id !== null);

        this.notificationService.createTaskReminderNotification(
          assigneeIds as string[],
          taskTitle,
          taskId,
          reminderType
        ).subscribe({
          next: (response) => {
            console.log('Notification rappel envoyée:', response);
          },
          error: (error) => {
            console.warn('Erreur notification rappel:', error);
          }
        });
      }
    } catch (error) {
      console.warn('Erreur récupération tâche pour notification rappel:', error);
    }
  }

  private prepareCreateTaskDto(formData: any): CreateTaskDto {
    return {
      title: formData.title,
      description: formData.description || undefined,
      dueStart: this.parseDate(formData.dueStart),
      dueEnd: this.parseDateOptional(formData.dueEnd),
      startDate: this.parseDateOptional(formData.startDate),
      endDate: this.parseDateOptional(formData.endDate),
      estimatedHours: formData.estimatedHours || undefined,
      statusId: formData.statusId,
      priorityId: formData.priorityId,
      projectId: formData.projectId,
      timelineId: formData.timelineId || undefined,
      assigneeIds: formData.assigneeIds || []
    };
  }

  private prepareUpdateTaskDto(formData: any): UpdateTaskDto {
    return {
      title: formData.title,
      description: formData.description || undefined,
      dueStart: this.parseDate(formData.dueStart),
      dueEnd: this.parseDateOptional(formData.dueEnd),
      startDate: this.parseDateOptional(formData.startDate),
      endDate: this.parseDateOptional(formData.endDate),
      estimatedHours: formData.estimatedHours || undefined,
      actualHours: formData.actualHours || undefined,
      statusId: formData.statusId,
      priorityId: formData.priorityId,
      timelineId: formData.timelineId || undefined,
      assigneeIds: formData.assigneeIds || []
    };
  }

  // Task assignment methods
  openAssignModal(task: Task): void {
    this.currentAssignTask = task;
    this.tempAssignments = this.getTaskAssignees(task).map(a => a.memberId || a.member?.id);
    this.showAssignModal = true;
  }

  toggleMemberAssignment(memberId: string, event: any): void {
    if (event.target.checked) {
      if (!this.tempAssignments.includes(memberId)) {
        this.tempAssignments.push(memberId);
      }
    } else {
      this.tempAssignments = this.tempAssignments.filter(id => id !== memberId);
    }
  }

  onStatusChange(event: any): void {
    const statusId = event.target.value;
    const statusName = event.target.selectedOptions[0].getAttribute('data-name');
    
    if (this.currentTask && statusId && statusName) {
      this.updateTaskStatusWithNotification(this.currentTask.id, statusId, statusName);
    }
  }

  // Ajoutez cette méthode pour mettre à jour le statut avec notification
  async updateTaskStatusWithNotification(taskId: string, statusId: string, statusName: string): Promise<void> {
    const updateDto: UpdateTaskDto = { statusId };
    
    await this.taskService.updateTask(taskId, updateDto).toPromise();

    const isCompleted = statusName.toLowerCase().includes('terminé') || 
                       statusName.toLowerCase().includes('completed') ||
                       statusName.toLowerCase().includes('done') ||
                       statusName.toLowerCase().includes('fini');

    if (isCompleted) {
      const task = await this.taskService.getTaskById(taskId).toPromise();
      
      if (task && task.assignees && task.assignees.length > 0) {
        const assigneeIds = task.assignees.map(a => a.memberId || a.member?.id).filter(id => id);
        
        this.notificationService.createTaskCompletedNotification(
          assigneeIds as string[],
          task.title,
          task.id,
          this.authService.getCurrentUser()?.id
        ).subscribe({
          next: (response: any) => {
            console.log('Notification tâche terminée envoyée:', response);
          },
          error: (error: any) => {
            console.warn('Erreur notification tâche terminée:', error);
          }
        });
      }
    }
  }

  async saveAssignments(): Promise<void> {
    if (!this.currentAssignTask) return;

    try {
      const uniqueAssignments = [...new Set(this.tempAssignments)];
      
      const updateDto: UpdateTaskDto = {
        assigneeIds: uniqueAssignments
      };

      await this.taskService.updateTask(this.currentAssignTask.id, updateDto).toPromise();

      const previousAssignees = this.getTaskAssignees(this.currentAssignTask)
        .map(a => a.memberId || a.member?.id)
        .filter(id => id !== undefined && id !== null);

      const newAssignees = uniqueAssignments.filter(id => 
        !previousAssignees.includes(id as string)
      );

      console.log('Nouveaux assignés:', newAssignees);
      console.log('Anciens assignés:', previousAssignees);

      if (newAssignees.length > 0) {
        this.notificationService.createTaskAssignmentNotification(
          this.currentAssignTask.title,
          newAssignees as string[],
          this.currentAssignTask.id
        ).subscribe({
          next: (response) => {
            console.log('Notifications envoyées:', response);
            this.loadTasks();
          },
          error: (error) => {
            console.warn('Erreur envoi notifications:', error);
            this.loadTasks();
          }
        });
      } else {
        this.loadTasks();
      }

      this.closeModals();
      this.showSuccess('Succès', 'Assignations mises à jour');
      
    } catch (error) {
      console.error('Erreur mise à jour assignations:', error);
      this.showError('Erreur', 'Échec de la mise à jour des assignations');
    }
  }

  // Task CRUD operations
  private async createTask(createTaskDto: CreateTaskDto): Promise<void> {
    const newTask = await this.taskService.createTask(createTaskDto).toPromise();

    if (!newTask) {
      throw new Error('Échec création tâche');
    }

    if (createTaskDto.assigneeIds && createTaskDto.assigneeIds.length > 0) {
      this.notificationService.createTaskAssignmentNotification(
        createTaskDto.title,
        createTaskDto.assigneeIds,
        newTask.id
      ).subscribe({
        next: (response) => {
          console.log('Notifications création tâche envoyées:', response);
        },
        error: (error) => {
          console.warn('Erreur notifications création tâche:', error);
        }
      });
    }
  }

  private async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<void> {
    await this.taskService.updateTask(id, updateTaskDto).toPromise();
  }

  async deleteTask(task: Task): Promise<void> {
    const result = await Swal.fire({
      title: 'Etes-vous sûr de vouloir?',
      text: `Supprimer la tâche "${task.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await this.taskService.deleteTask(task.id).toPromise();
        await this.loadTasks();
        this.showSuccess('Supprimée', 'Tâche supprimée avec succès');
      } catch (error) {
        this.showError('Error', 'Failed to delete task');
      }
    }
  }

  // Filtering
  async onFilterChange(): Promise<void> {
    const filters: TaskFilters = this.filterForm.value;
    this.currentPage = 1; // Reset to first page when filtering
    await this.loadTasks(filters);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadTasks();
  }

  // Utility methods
  private parseDate(dateValue: any): Date {
    if (!dateValue) {
      throw new Error('Date value is required');
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateValue}`);
    }

    return date;
  }

  private parseDateOptional(dateValue: any): Date | undefined {
    if (!dateValue) return undefined;
    return this.parseDate(dateValue);
  }

  private formatDateForInput(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private createDefaultMember(): ProjectMember[] {
    return [{
      id: 'default-member',
      userId: 'default-user',
      projectId: 'default-project',
      role: 'Member',
      isActive: true,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'default-user',
        username: 'Current User',
        email: 'user@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      project: {
        id: 'default-project',
        name: 'Default Project',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }];
  }

  // UI helper methods
  getTaskAssignees(task: Task): any[] {
    return task.assignees || [];
  }

  getAssigneeName(assignee: any): string {
    const memberId = assignee.memberId || assignee.id;
    const member = this.members.find(m => m.id === memberId);
    
    if (member?.user?.username) {
      return member.user.username;
    }
    
    return assignee.user?.username || assignee.username || 'Unknown User';
  }

  getAssigneeInitials(assignee: any): string {
    const name = this.getAssigneeName(assignee);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  getAssigneeColorClass(assignee: any): string {
    const assigneeId = assignee.id || assignee.memberId || assignee.member?.id || '0';
    const hash = this.hashString(assigneeId);
    const colorIndex = hash % this.assigneeColors.length;
    return this.assigneeColors[colorIndex];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getPriorityClass(priority: TaskPriority): string {
    if (!priority) return 'bg-gray-100 text-gray-800';
    
    const classes: { [key: number]: string } = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800'
    };
    return classes[priority.order] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: TaskStatus): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    return `bg-${status.color || 'blue'}-100 text-${status.color || 'blue'}-800`;
  }

  formatDate(date: Date | string): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.taskForm.get(fieldName);
    if (!field?.errors) return '';

    if (field.errors['required']) return 'This field is required';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    if (field.errors['invalidDate']) return 'Invalid date format';
    
    return 'Invalid field';
  }

  // Alert helpers
  private showSuccess(title: string, text: string): void {
    Swal.fire({
      title,
      text,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  }

  private showError(title: string, text: string): void {
    Swal.fire({
      title,
      text,
      icon: 'error'
    });
  }
}