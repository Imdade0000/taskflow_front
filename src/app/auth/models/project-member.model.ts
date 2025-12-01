// models/project-member.model.ts
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

export interface ProjectRole {
  id: string;
  name: string;
  description?: string;
  projectsRolePermissions?: ProjectRolePermission[];
}

export interface ProjectPermission {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface ProjectRolePermission {
  id: string;
  projectPermission: ProjectPermission;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  projectRoleId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  projectRole: ProjectRole;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
  assignedTasks?: any[];
}

export interface CreateProjectMemberDto {
  userId: string;
  projectRoleId: string;
}

export interface UpdateProjectMemberRoleDto {
  projectRoleId: string;
}

export interface MemberPermissions {
  userId: string;
  projectId: string;
  user: User;
  projectRole: {
    id: string;
    name: string;
    description?: string;
  };
  permissions: ProjectPermission[];
  permissionSlugs: string[];
}