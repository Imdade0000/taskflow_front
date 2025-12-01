import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environments';
import { Project, CreateProjectDto, UpdateProjectDto, ProjectFiltersDto } from '../models/project.model';
import { ProjectStatus } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;
  
  constructor(private http: HttpClient) {}

  // Headers par défaut
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Headers avec authentification améliorée
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Essayer plusieurs sources pour le token
    const token = this.getAuthToken();
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('Token ajouté aux headers:', token.substring(0, 20) + '...');
    } else {
      console.warn('Aucun token d\'authentification trouvé');
    }
    
    return headers;
  }

  // Méthode pour récupérer le token d'authentification
  private getAuthToken(): string | null {
    // Essayer localStorage en premier
    let token = localStorage.getItem('token');
    if (token) return token;
    
    // Essayer sessionStorage
    token = sessionStorage.getItem('token');
    if (token) return token;
    
    // Essayer d'autres clés possibles
    token = localStorage.getItem('authToken') || 
            localStorage.getItem('access_token') || 
            localStorage.getItem('jwt_token');
    
    return token;
  }

  // Vérifier si l'utilisateur est authentifié
  private isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  // Créer un projet avec validation d'auth
  createProject(projectData: CreateProjectDto): Observable<Project> {
    console.log('ProjectService - createProject appelé avec:', projectData);
    console.log('URL utilisée:', this.apiUrl);
    
    // Vérifier l'authentification
    if (!this.isAuthenticated()) {
      console.error('Utilisateur non authentifié');
      return throwError(() => new Error('Authentification requise'));
    }
    
    return this.http.post<Project>(this.apiUrl, projectData, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('ProjectService - Réponse reçue:', response);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur détaillée:', error);
        console.error('ProjectService - Status:', error.status);
        console.error('ProjectService - Error body:', error.error);
        console.error('ProjectService - Headers envoyés:', this.getAuthHeaders());
        
        // Gestion spécifique des erreurs d'authentification
        if (error.status === 401) {
          console.error('Token expiré ou invalide');
          // Optionnel: rediriger vers la page de connexion
          // this.router.navigate(['/login']);
        }
        
        return throwError(() => error);
      })
    );
  }

  // Récupérer tous les projets (avec filtres)
  getProjects(filters?: ProjectFiltersDto): Observable<Project[]> {
    let params = new HttpParams();
 
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.statusId) params = params.set('statusId', filters.statusId);
      if (filters.isArchived !== undefined) {
        params = params.set('isArchived', String(filters.isArchived));
      }
    }
    
    console.log('Request params:', params.toString());
    
    return this.http.get<Project[]>(this.apiUrl, { 
      params,
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('ProjectService - Erreur lors de la récupération des projets:', error);
        if (error.status === 401) {
          console.error('Token expiré ou invalide lors de la récupération');
        }
        return throwError(() => error);
      })
    );
  }

  // Récupérer un projet par ID
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('ProjectService - Erreur lors de la récupération du projet:', error);
        return throwError(() => error);
      })
    );
  }

getStatuses(): Observable<ProjectStatus[]> {
  const statusApiUrl = `${environment.apiUrl}/project-status`; // Adaptez selon votre API
  
  console.log('ProjectService - getStatuses appelé');
  
  return this.http.get<ProjectStatus[]>(statusApiUrl, {
    headers: this.getAuthHeaders()
  }).pipe(
    tap(response => {
      console.log('ProjectService - Statuts récupérés:', response);
    }),
    catchError(error => {
      console.error('ProjectService - Erreur lors de la récupération des statuts:', error);
      
      // Retourner des statuts par défaut en cas d'erreur
      const defaultStatuses: ProjectStatus[] = [
        { id: '1', name: 'Actif', color: '#fff'},
        { id: '2', name: 'En attente', color: '#fbbf24', isActive: true },
        { id: '3', name: 'En cours', color: '#3b82f6', isActive: true },
        { id: '4', name: 'Terminé', color: '#10b981', isActive: true },
        { id: '5', name: 'Suspendu', color: '#ef4444', isActive: false }
      ];
      
      if (error.status === 404) {
        console.warn('Endpoint des statuts non trouvé, utilisation des statuts par défaut');
        return of(defaultStatuses); // Retourne les statuts par défaut
      }
      
      return throwError(() => error);
    })
  );
}

  // Mettre à jour un projet
  updateProject(id: string, updateData: UpdateProjectDto): Observable<Project> {
    console.log('ProjectService - updateProject appelé avec:', { id, updateData });
    
    return this.http.patch<Project>(`${this.apiUrl}/${id}`, updateData, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('ProjectService - Projet mis à jour:', response);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur lors de la mise à jour:', error);
        return throwError(() => error);
      })
    );
  }

  // Supprimer un projet
  deleteProject(id: string): Observable<void> {
    console.log('ProjectService - deleteProject appelé avec:', id);
    
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('ProjectService - Projet supprimé:', id);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur lors de la suppression:', error);
        return throwError(() => error);
      })
    );
  }

  // Archiver un projet
  archiveProject(id: string): Observable<Project> {
    console.log('ProjectService - archiveProject appelé avec:', id);
    
    return this.http.patch<Project>(`${this.apiUrl}/${id}/archive`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('ProjectService - Projet archivé:', response);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur lors de l\'archivage:', error);
        return throwError(() => error);
      })
    );
  }

  // Restaurer un projet
  restoreProject(id: string): Observable<Project> {
    console.log('ProjectService - restoreProject appelé avec:', id);
    
    return this.http.patch<Project>(`${this.apiUrl}/${id}/restore`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('ProjectService - Projet restauré:', response);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur lors de la restauration:', error);
        return throwError(() => error);
      })
    );
  }

  // Lister les membres d'un projet
  getProjectMembers(projectId: string): Observable<any[]> {
    console.log('ProjectService - getProjectMembers appelé avec:', projectId);
    
    return this.http.get<any[]>(`${this.apiUrl}/${projectId}/members`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log('ProjectService - Membres récupérés:', response);
      }),
      catchError(error => {
        console.error('ProjectService - Erreur lors de la récupération des membres:', error);
        return throwError(() => error);
      })
    );
  }
}