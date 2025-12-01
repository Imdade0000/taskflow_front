export interface Project {
  id: string;
  name: string;
  description: string;
  startDate?: Date;
  dueStart?: Date;
  endDate?: Date;
  dueEnd?: Date;
  isArchived?: boolean;
  archivedAt?: Date;
  status: ProjectStatus;
  members: ProjectMember[];
  tasks?: Task[];
  timelines?: Timeline[];
  tags?: ProjectTag[];
  documents?: Document[];
}

export interface CreateProjectDto {
  name: string;
  description: string;
  startDate?: string;
  dueStart?: string;
  endDate?: string;
  dueEnd?: string;
  projectStatusId: string;
  userId: string; // ID du créateur
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  startDate?: String;
  dueStart?: String;
  endDate?: String;
  dueEnd?: String;
  projectStatusId?: string;
}

export interface ProjectFiltersDto {
  search?: string;
  statusId?: string;
  isArchived?: boolean;
}

export interface ProjectStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  projectRoleId: string;
  user: User;
  projectRole: ProjectRole;
}

export interface ProjectRole {
  id: string;
  name: string;
  description?: string;
}

// Autres interfaces nécessaires
interface User {
  id: string;
  username: string;
  email: string;
}

interface Task {
  id: string;
  // ... autres champs de tâche
}

interface Timeline {
  id: string;
  // ... autres champs de timeline
}

interface ProjectTag {
  id: string;
  // ... autres champs de tag
}

interface Document {
  id: string;
  // ... autres champs de document
}