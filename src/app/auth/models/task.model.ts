// models/task.model.ts - MODÈLE COMPLET selon votre schéma Prisma

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueStart: Date;
  dueEnd?: Date;
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  isArchived: boolean;
  statusId: string;
  priorityId: string;
  projectId: string;
  timelineId?: string;
  createdById?: string;
  parentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
 
  // Relations
  status: TaskStatus;
  priority: TaskPriority;
  project: Project;
  timeline?: Timeline;
  assignees: TaskAssignee[];
  parentTask?: Task;
  subtasks?: Task[];
  dependencies?: Task[];
  dependents?: Task[];
  comments?: TaskComment[];
  documents?: TaskDocument[];
  taskReviews?: TaskReview[];
  createdBy?: ProjectMember;
}

export interface TaskStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  projectId?: string;
  timelineId?: string;
  
  // Relations
  tasks?: Task[];
  project?: Project;
  timeline?: Timeline;
}

export interface DefaultTaskStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  
  // Relations
  createdByUser?: User;
}

export interface TaskPriority {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relations
  tasks?: Task[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  
  // Relations optionnelles (selon votre modèle Project complet)
  tasks?: Task[];
  timelines?: Timeline[];
  taskStatuses?: TaskStatus[];
  members?: ProjectMember[];
  comments?: TaskComment[];
}

export interface Timeline {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relations
  tasksStatuses: TaskStatus[];
  tasks: Task[];
  project: Project;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  memberId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relations
  task: Task;
  member: ProjectMember;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role?: string;
  isActive?: boolean;
  joinedAt?: Date;
  leftAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  
  // Relations
  user: User;
  project: Project;
  assignees?: TaskAssignee[];
  createdTasks?: Task[];
}

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isActive?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  
  // Relations
  projectMembers?: ProjectMember[];
  comments?: TaskComment[];
  taskReviews?: TaskReview[];
  defaultTaskStatuses?: DefaultTaskStatus[];
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    firstname?: string;
    lastname?: string;
    email: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  
  // Relations
  user: User;
  task?: Task;
  project?: Project;
}

export interface TaskDocument {
  id: string;
  filename: string;
  originalName?: string;
  url: string;
  size?: number;
  mimeType?: string;
  taskId: string;
  uploadedBy?: string;
  uploadedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  
  // Relations
  task: Task;
  uploader?: User;
}

export interface TaskReview {
  id: string;
  taskId: string;
  reviewerId: string;
  status: string;
  comments?: string;
  rating?: number;
  reviewedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  
  // Relations
  reviewer: User;
  task: Task;
}

// DTO - Data Transfer Objects pour les requêtes API
export interface CreateTaskDto {
  title: string;
  description?: string;
  dueStart: Date;
  dueEnd?: Date;
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  statusId: string;
  priorityId: string;
  projectId: string;
  timelineId?: string;
  parentTaskId?: string;
  createdById?: string;
  assigneeIds?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueStart?: Date;
  dueEnd?: Date;
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  isArchived?: boolean;
  statusId?: string;
  priorityId?: string;
  timelineId?: string;
  parentTaskId?: string;
  assigneeIds?: string[];
}

// Interface pour les filtres de recherche
export interface TaskFilters {
  projectId?: string;
  statusId?: string;
  timelineId?: string;
  priorityId?: string;
  isArchived?: boolean;
  parentTaskId?: string;
  assigneeId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueStart' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Interfaces pour les réponses API paginées
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TaskListResponse extends PaginatedResponse<Task> {}

// Interfaces pour les statistiques (utiles pour les dashboards)
export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByStatus: { statusName: string; count: number }[];
  tasksByPriority: { priorityName: string; count: number }[];
  averageCompletionTime?: number;
}

export interface ProjectStatistics {
  id: string;
  name: string;
  taskStatistics: TaskStatistics;
  memberCount: number;
  timelineCount: number;
}

// Types utilitaires pour les composants
export type TaskFormMode = 'create' | 'edit' | 'view';
export type TaskSortField = 'title' | 'dueStart' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
export type TaskViewMode = 'list' | 'grid' | 'kanban' | 'calendar';

// Énumérations pour les constantes
export enum TaskStatusEnum {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriorityEnum {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum TaskReviewStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_CHANGES = 'NEEDS_CHANGES'
}

// Interfaces pour les notifications (si vous les implémentez plus tard)
export interface TaskNotification {
  id: string;
  taskId: string;
  userId: string;
  type: 'assignment' | 'due_date' | 'status_change' | 'comment' | 'review';
  message: string;
  isRead: boolean;
  createdAt: Date;
  
  // Relations
  task: Task;
  user: User;
}

// Interface pour l'historique des modifications
export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  action: 'created' | 'updated' | 'deleted' | 'archived' | 'restored';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
  
  // Relations
  task: Task;
  user: User;
}

// Interface pour les modèles de tâches (templates)
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  title: string;
  taskDescription?: string;
  estimatedHours?: number;
  priorityId: string;
  projectId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  priority: TaskPriority;
  project?: Project;
  createdBy: User;
}

// Interface pour les dépendances entre tâches
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  createdAt: Date;
  
  // Relations
  task: Task;
  dependsOnTask: Task;
}

// Interface pour les jalons (milestones)
export interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate: Date;
  projectId: string;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  project: Project;
  tasks?: Task[];
}

// Interface pour les étiquettes de tâches
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  projectId?: string;
  createdAt: Date;
  
  // Relations
  project?: Project;
  tasks?: Task[];
}

// Interface pour les relations many-to-many entre Task et Label
export interface TaskLabelRelation {
  taskId: string;
  labelId: string;
  assignedAt: Date;
  
  // Relations
  task: Task;
  label: TaskLabel;
}