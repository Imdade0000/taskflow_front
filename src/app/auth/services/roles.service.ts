import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environments';
import { catchError } from 'rxjs/operators';

// Interfaces - IDs cohérents en tant que string
export interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  hasAllPermissions: boolean;
  permissions?: RolePermission[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  hasAllPermissions?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  hasAllPermissions?: boolean; 
}

export interface RolePermissionDto {
  permissionId: string;
}

export interface RolePermissionsDto {
  permissionIds: string[];
}

export interface SetAllPermissionsDto {
  value: boolean;
}

export interface AssignRoleDto {
  roleId: string;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private apiUrl = `${environment.apiUrl}/roles`;
  private permissionsUrl = `${environment.apiUrl}/permissions`; // URL pour les permissions
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Récupérer tous les rôles
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap(roles => this.rolesSubject.next(roles))
      );
  }

  // Récupérer un rôle par ID
  getRoleById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Rechercher un rôle par nom
  getRoleByName(name: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/by-name/${name}`, { headers: this.getHeaders() });
  }

  // Créer un nouveau rôle
  createRole(createRoleDto: CreateRoleDto): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, createRoleDto, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Mettre à jour un rôle
  updateRole(id: string, updateRoleDto: UpdateRoleDto): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/${id}`, updateRoleDto, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Supprimer un rôle
  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Récupérer toutes les permissions disponibles
  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.permissionsUrl, { headers: this.getHeaders() });
  }

  // Ajouter une permission à un rôle
  addPermissionToRole(roleId: string, permissionId: string): Observable<Role> {
    const body: RolePermissionDto = { permissionId };
    return this.http.post<Role>(`${this.apiUrl}/${roleId}/permissions`, body, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Ajouter plusieurs permissions à un rôle
  addPermissionsToRole(roleId: string, permissionIds: string[]): Observable<Role> {
    const body: RolePermissionsDto = { permissionIds };
    return this.http.post<Role>(`${this.apiUrl}/${roleId}/permissions/batch`, body, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Retirer une permission d'un rôle
  removePermissionFromRole(roleId: string, permissionId: string): Observable<Role> {
    return this.http.delete<Role>(`${this.apiUrl}/${roleId}/permissions/${permissionId}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Retirer plusieurs permissions d'un rôle
  removePermissionsFromRole(roleId: string, permissionIds: string[]): Observable<void> {
    const body: RolePermissionsDto = { permissionIds };
    return this.http.request<void>('DELETE', `${this.apiUrl}/${roleId}/permissions`, {
      headers: this.getHeaders(),
      body
    }).pipe(
      tap(() => this.refreshRoles())
    );
  }

  // Synchroniser les permissions d'un rôle
  syncRolePermissions(roleId: string, permissionIds: string[]): Observable<Role> {
    const body: RolePermissionsDto = { permissionIds };
    return this.http.put<Role>(`${this.apiUrl}/${roleId}/permissions/sync`, body, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Ajouter toutes les permissions à un rôle
  addAllPermissionsToRole(roleId: string): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/${roleId}/permissions/all`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.refreshRoles())
      );
  }

  // Définir si un rôle a toutes les permissions
  setHasAllPermissions(roleId: string, value: boolean): Observable<Role> {
    return this.http.patch<Role>(`${this.apiUrl}/${roleId}/permissions`, 
      { hasAllPermissions: value }, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Erreur inconnue';
        
        if (error.status === 403) {
          errorMessage = 'Permission refusée';
        } else if (error.status === 404) {
          errorMessage = 'Rôle non trouvé';
        } else if (error.status >= 500) {
          errorMessage = 'Erreur serveur';
        }
        
        return throwError(() => ({
          message: errorMessage,
          originalError: error
        }));
      })
    );
  }

  // Assigner un rôle à un utilisateur
  assignRoleToUser(userId: string, roleId: string): Observable<any> {
    const body: AssignRoleDto = { roleId };
    return this.http.post(`${this.apiUrl}/assign/${userId}`, body, { headers: this.getHeaders() });
  }

  // Méthode utilitaire pour rafraîchir la liste des rôles
  private refreshRoles(): void {
    this.getAllRoles().subscribe();
  }
}