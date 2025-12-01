// services/project-member.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ProjectMember, 
  CreateProjectMemberDto, 
  UpdateProjectMemberRoleDto,
  MemberPermissions 
} from '../models/project-member.model';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class ProjectMemberService {
  private apiUrl = `${environment.apiUrl}/projects`;

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

  // Ajouter un membre au projet
  addMember(projectId: string, dto: CreateProjectMemberDto): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(
      `${this.apiUrl}/${projectId}/members`,
      dto,
      this.getHttpOptions()
    );
  }

  // Lister les membres du projet
  listMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(
      `${this.apiUrl}/${projectId}/members`,
      this.getHttpOptions()
    );
  }

  // Récupérer un membre spécifique
  getMember(projectId: string, userId: string): Observable<ProjectMember> {
    return this.http.get<ProjectMember>(
      `${this.apiUrl}/${projectId}/members/${userId}`,
      this.getHttpOptions()
    );
  }

  // Modifier le rôle d'un membre
  updateMemberRole(
    projectId: string, 
    userId: string, 
    dto: UpdateProjectMemberRoleDto
  ): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(
      `${this.apiUrl}/${projectId}/members/${userId}/role`,
      dto,
      this.getHttpOptions()
    );
  }

  // Activer un membre
  activateMember(projectId: string, userId: string): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(
      `${this.apiUrl}/${projectId}/members/${userId}/activate`,
      {},
      this.getHttpOptions()
    );
  }

  // Désactiver un membre
  deactivateMember(projectId: string, userId: string): Observable<ProjectMember> {
    return this.http.patch<ProjectMember>(
      `${this.apiUrl}/${projectId}/members/${userId}/deactivate`,
      {},
      this.getHttpOptions()
    );
  }

  // Supprimer un membre
  removeMember(projectId: string, userId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${projectId}/members/${userId}`,
      this.getHttpOptions()
    );
  }

  // Récupérer les permissions d'un membre
  getMemberPermissions(projectId: string, userId: string): Observable<MemberPermissions> {
    return this.http.get<MemberPermissions>(
      `${this.apiUrl}/${projectId}/members/${userId}/permissions`,
      this.getHttpOptions()
    );
  }
}