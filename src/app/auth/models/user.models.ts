export interface User {
  id: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  phone?: string;
  isActive: boolean;
  roleId: string;
  departementId?: string;
  role?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
  clientProfile?: any;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateUserDto {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  roleId: string;
  departementId?: string;
  createdBy?: string;
  twoFactorEnabled?: boolean;
  isActive?: boolean;
}

export interface UpdateUserDto {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  roleId?: string;
  departementId?: string;
  twoFactorEnabled?: boolean;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export interface Role {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  name: string;
}