// services/project-permission.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectPermission, MemberPermissions } from '../models/project-member.model';
import { environment } from '../../../environments/environments';

export interface CreateProjectPermissionDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateProjectPermissionDto {
  name?: string;
  slug?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectPermissionService {
  private apiUrl = `${environment.apiUrl}/projects-permissions`;

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

  // Récupérer toutes les permissions de projet
  findAll(): Observable<ProjectPermission[]> {
    return this.http.get<ProjectPermission[]>(this.apiUrl, this.getHttpOptions());
  }

  // Récupérer une permission par ID
  findById(id: string): Observable<ProjectPermission> {
    return this.http.get<ProjectPermission>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }

  // Récupérer une permission par slug
  findBySlug(slug: string): Observable<ProjectPermission> {
    return this.http.get<ProjectPermission>(`${this.apiUrl}/slug/${slug}`, this.getHttpOptions());
  }

  // Créer une nouvelle permission
  create(dto: CreateProjectPermissionDto): Observable<ProjectPermission> {
    return this.http.post<ProjectPermission>(this.apiUrl, dto, this.getHttpOptions());
  }

  // Mettre à jour une permission
  update(id: string, dto: UpdateProjectPermissionDto): Observable<ProjectPermission> {
    return this.http.put<ProjectPermission>(`${this.apiUrl}/${id}`, dto, this.getHttpOptions());
  }

  // Supprimer une permission
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }

  // Récupérer les permissions d'un utilisateur sur un projet
  getUserProjectPermissions(userId: string, projectId: string): Observable<MemberPermissions> {
    return this.http.get<MemberPermissions>(
      `${this.apiUrl}/user/${userId}/project/${projectId}`,
      this.getHttpOptions()
    );
  }

  // Initialiser les permissions par défaut
  seedDefaultPermissions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/seed-defaults`, {}, this.getHttpOptions());
  }
}