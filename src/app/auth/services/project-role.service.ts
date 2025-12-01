// services/project-role.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectRole, ProjectPermission } from '../models/project-member.model';
import { environment } from '../../../environments/environments';

export interface CreateProjectRoleDto {
  name: string;
  description?: string;
}

export interface UpdateProjectRoleDto {
  name?: string;
  description?: string;
}

export interface ProjectRolePermissionDto {
  projectPermissionId: string;
}

export interface ProjectRolePermissionsDto {
  projectPermissionIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectRoleService {
  private apiUrl = `${environment.apiUrl}/project-roles`;

  constructor(private http: HttpClient) {}

  private getHttpOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // Récupérer tous les rôles de projet
  findAll(): Observable<ProjectRole[]> {
    return this.http.get<ProjectRole[]>(this.apiUrl, this.getHttpOptions());
  }

  // Récupérer un rôle par ID
  findById(id: string): Observable<ProjectRole> {
    return this.http.get<ProjectRole>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }

  // Récupérer un rôle par nom
  findByName(name: string): Observable<ProjectRole> {
    return this.http.get<ProjectRole>(`${this.apiUrl}/name/${name}`, this.getHttpOptions());
  }

  // Créer un nouveau rôle
  create(dto: CreateProjectRoleDto): Observable<ProjectRole> {
    return this.http.post<ProjectRole>(this.apiUrl, dto, this.getHttpOptions());
  }

  // Mettre à jour un rôle
  update(id: string, dto: UpdateProjectRoleDto): Observable<ProjectRole> {
    return this.http.put<ProjectRole>(`${this.apiUrl}/${id}`, dto, this.getHttpOptions());
  }

  // Supprimer un rôle
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }

  // Ajouter une permission à un rôle
  addPermission(roleId: string, dto: ProjectRolePermissionDto): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${roleId}/permissions`,
      dto,
      this.getHttpOptions()
    );
  }

  // Ajouter plusieurs permissions à un rôle
  addPermissions(roleId: string, dto: ProjectRolePermissionsDto): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${roleId}/permissions/batch`,
      dto,
      this.getHttpOptions()
    );
  }

  // Retirer une permission d'un rôle
  removePermission(roleId: string, permissionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${roleId}/permissions/${permissionId}`,
      this.getHttpOptions()
    );
  }

  // Synchroniser les permissions d'un rôle
  syncPermissions(roleId: string, dto: ProjectRolePermissionsDto): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${roleId}/permissions/sync`,
      dto,
      this.getHttpOptions()
    );
  }
}