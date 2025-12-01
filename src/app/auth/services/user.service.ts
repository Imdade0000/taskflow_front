import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserDto, UpdateUserDto, User, PaginatedResponse, Role, Department } from '../models/user.models';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Créer un nouvel utilisateur
   */
  createUser(userData: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData);
  }

  /**
   * Récupérer tous les utilisateurs avec pagination et filtrage par statut
   */
  getUsers(page: number = 1, limit: number = 10, isActive?: boolean): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Ajouter le paramètre isActive seulement s'il est défini
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
   
    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params });
  }

  /**
   * Rechercher des utilisateurs avec filtrage par statut
   */
  searchUsers(query: string, page: number = 1, limit: number = 10, isActive?: boolean): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Ajouter le paramètre isActive seulement s'il est défini
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
   
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Récupérer un utilisateur par ID
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer l'utilisateur connecté
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  /**
   * Mettre à jour un utilisateur
   */
  updateUser(id: string, userData: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData);
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Supprimer définitivement un utilisateur
   */
  hardDeleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/hard`);
  }

  /**
   * Activer/désactiver un utilisateur
   */
  toggleUserActive(id: string, isActive: boolean): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/active`, { isActive });
  }

  /**
   * Mettre à jour le département d'un utilisateur
   */
  updateUserDepartment(id: string, departementId: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/department`, { departementId });
  }

  /**
   * Mettre à jour le rôle d'un utilisateur
   */
  updateUserRole(id: string, roleId: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/role`, { roleId });
  }

  /**
   * Récupérer les projets d'un utilisateur
   */
  getUserProjects(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/projects`);
  }

  /**
   * Configurer l'authentification à deux facteurs
   */
  configureTwoFactor(id: string, enable: boolean): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/2fa`, { enable });
  }

  /**
   * Récupérer tous les utilisateurs actifs seulement
   */
  getActiveUsers(page: number = 1, limit: number = 10): Observable<PaginatedResponse<User>> {
    return this.getUsers(page, limit, true);
  }

  /**
   * Récupérer tous les utilisateurs inactifs seulement
   */
  getInactiveUsers(page: number = 1, limit: number = 10): Observable<PaginatedResponse<User>> {
    return this.getUsers(page, limit, false);
  }

  /**
   * Rechercher parmi les utilisateurs actifs seulement
   */
  searchActiveUsers(query: string, page: number = 1, limit: number = 10): Observable<PaginatedResponse<User>> {
    return this.searchUsers(query, page, limit, true);
  }

  /**
   * Rechercher parmi les utilisateurs inactifs seulement
   */
  searchInactiveUsers(query: string, page: number = 1, limit: number = 10): Observable<PaginatedResponse<User>> {
    return this.searchUsers(query, page, limit, false);
  }

  // Méthodes pour récupérer les rôles et départements (à adapter selon votre API)
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${environment.apiUrl}/roles`);
  }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${environment.apiUrl}/departments`);
  }
}