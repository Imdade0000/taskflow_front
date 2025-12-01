// services/task.service.ts - VERSION CORRIGÉE
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Task, CreateTaskDto, UpdateTaskDto, TaskFilters, TaskStatus, TaskPriority, Project, Timeline, ProjectMember } from '../models/task.model';
import { environment } from '../../../environments/environments';
import { TaskComment } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = `${environment.apiUrl}/tasks`; // URL de base de l'API
  
  constructor(private http: HttpClient) {
    console.log('TaskService initialisé avec baseUrl:', this.baseUrl);
  }
   
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // CRUD Tasks
  createTask(createTaskDto: CreateTaskDto): Observable<Task> {
    console.log('Création de tâche - URL utilisée:', this.baseUrl);
    console.log('Données envoyées:', createTaskDto);
    
    return this.http.post<Task>(this.baseUrl, createTaskDto, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Tâche créée avec succès:', response);
      }),
      catchError(error => {
        console.error('Erreur création tâche:', error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Error body:', error.error);
        return throwError(() => error);
      })
    );
  }

  getTasks(filters?: TaskFilters): Observable<Task[]> {
    let params = new HttpParams();
   
    if (filters) {
      if (filters.projectId) params = params.set('projectId', filters.projectId);
      if (filters.statusId) params = params.set('statusId', filters.statusId);
      if (filters.timelineId) params = params.set('timelineId', filters.timelineId);
      if (filters.search) params = params.set('search', filters.search);
    }
   
    console.log('Récupération des tâches avec filtres:', filters);
    return this.http.get<Task[]>(this.baseUrl, { 
      params,
      headers: this.getHeaders() 
    }).pipe(
      tap(response => {
        console.log(`${response.length} tâches récupérées`);
      }),
      catchError(error => {
        console.error('Erreur récupération tâches:', error);
        return throwError(() => error);
      })
    );
  }

  getTask(id: string): Observable<Task> {
    const url = `${this.baseUrl}/${id}`;
    console.log('Récupération tâche:', url);
    
    return this.http.get<Task>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Tâche récupérée:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération tâche:', error);
        return throwError(() => error);
      })
    );
  }

  // CORRECTION: Méthode séparée pour getTaskById
  getTaskById(id: string): Observable<Task> {
    const url = `${this.baseUrl}/${id}`;
    console.log('Récupération tâche par ID:', url);
    
    return this.http.get<Task>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Tâche récupérée par ID:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération tâche par ID:', error);
        return throwError(() => error);
      })
    );
  }

  updateTask(id: string, updateTaskDto: UpdateTaskDto): Observable<Task> {
    const url = `${this.baseUrl}/${id}`;
    console.log('Mise à jour tâche:', url, updateTaskDto);
    
    return this.http.patch<Task>(url, updateTaskDto, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Tâche mise à jour:', response);
      }),
      catchError(error => {
        console.error('Erreur mise à jour tâche:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    console.log('Suppression tâche:', url);
    
    return this.http.delete<void>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        console.log('Tâche supprimée avec succès');
      }),
      catchError(error => {
        console.error('Erreur suppression tâche:', error);
        return throwError(() => error);
      })
    );
  }

  // ENDPOINTS DE RÉFÉRENCE - Correspondent exactement à votre contrôleur
  getTaskStatuses(): Observable<TaskStatus[]> {
    const url = `${this.baseUrl}/task-statuses`;
    console.log('Récupération statuts tâches:', url);
    
    return this.http.get<TaskStatus[]>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Statuts tâches récupérés:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération statuts tâches:', error);
        // Fallback en cas d'erreur
        return of([
          { id: '1', name: 'À faire', color: 'gray', order: 1, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'En cours', color: 'blue', order: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', name: 'Terminé', color: 'green', order: 3, createdAt: new Date(), updatedAt: new Date() }
        ]);
      })
    );
  }

  getTaskPriorities(): Observable<TaskPriority[]> {
    const url = `${this.baseUrl}/task-priorities`;
    console.log('Récupération priorités tâches:', url);
    
    return this.http.get<TaskPriority[]>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Priorités tâches récupérées:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération priorités tâches:', error);
        // Fallback en cas d'erreur
        return of([
          { id: '1', name: 'Basse', order: 1, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'Moyenne', order: 2, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', name: 'Haute', order: 3, createdAt: new Date(), updatedAt: new Date() }
        ]);
      })
    );
  }

  getProjects(): Observable<Project[]> {
    const url = `${this.baseUrl}/projects`;
    console.log('Récupération projets:', url);
    
    return this.http.get<Project[]>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Projets récupérés:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération projets:', error);
        return of([]);
      })
    );
  }

  getTimelines(): Observable<Timeline[]> {
    const url = `${this.baseUrl}/timelines`;
    console.log('Récupération timelines:', url);
    
    return this.http.get<Timeline[]>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Timelines récupérées:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération timelines:', error);
        return of([]);
      })
    );
  }

  getMembers(projectId?: string): Observable<ProjectMember[]> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('projectId', projectId);
    }
    
    const url = `${this.baseUrl}/members`;
    console.log('Récupération membres:', url, projectId ? `pour projet ${projectId}` : 'tous');
    
    return this.http.get<ProjectMember[]>(url, { 
      params,
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log('Membres récupérés:', response);
      }),
      catchError(error => {
        console.error('Erreur récupération membres:', error);
        return of([]);
      })
    );
  }

  // AJOUT: Méthodes utilitaires pour les notifications
  
  /**
   * Récupère les IDs des membres assignés à une tâche
   */
  getTaskAssigneeIds(taskId: string): Observable<string[]> {
  return this.getTaskById(taskId).pipe(
    map(task => {
      const assigneeIds = task.assignees?.map(a => a.memberId || a.member?.id).filter(id => id) || [];
      console.log('IDs des assignés récupérés:', assigneeIds);
      return assigneeIds;
    }),
    catchError(error => {
      console.error('Erreur récupération assignés de la tâche:', error);
      return of([] as string[]);
    })
  );
}

  /**
   * Vérifie si une tâche est marquée comme terminée
   */
  isTaskCompleted(task: Task): boolean {
    if (!task.status) return false;
    
    const completedKeywords = ['terminé', 'completed', 'done', 'fini', 'achevé'];
    const statusName = task.status.name?.toLowerCase() || '';
    
    return completedKeywords.some(keyword => statusName.includes(keyword));
  }

  /**
   * Récupère les détails d'une tâche avec ses assignés pour les notifications
   */
  getTaskForNotification(taskId: string): Observable<{
  task: Task;
  assigneeIds: string[];
  isCompleted: boolean;
}> {
  return this.getTaskById(taskId).pipe(
    map(task => {
      const assigneeIds = task.assignees?.map(a => a.memberId || a.member?.id).filter(id => id) || [];
      const isCompleted = this.isTaskCompleted(task);
      console.log('Détails pour notification:', { assigneeIds, isCompleted });
      return { task, assigneeIds, isCompleted };
    }),
    catchError(error => {
      console.error('Erreur récupération tâche pour notification:', error);
      return throwError(() => error);
    })
  );
}


// CRUD pour les commentaires
createTaskComment(taskId: string, content: string): Observable<TaskComment> {
  const url = `${this.baseUrl}/${taskId}/comments`;
  console.log('Création de commentaire:', url, content);
  
  return this.http.post<TaskComment>(url, { content }, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('Commentaire créé avec succès:', response);
    }),
    catchError(error => {
      console.error('Erreur création commentaire:', error);
      return throwError(() => error);
    })
  );
}

getTaskComments(taskId: string): Observable<TaskComment[]> {
  const url = `${this.baseUrl}/${taskId}/comments`;
  console.log('Récupération des commentaires:', url);
  
  return this.http.get<TaskComment[]>(url, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('Commentaires récupérés:', response.length);
    }),
    catchError(error => {
      console.error('Erreur récupération commentaires:', error);
      return of([]);
    })
  );
}

updateTaskComment(commentId: string, content: string): Observable<TaskComment> {
  const url = `${this.baseUrl}/comments/${commentId}`;
  console.log('Mise à jour commentaire:', url, content);
  
  return this.http.patch<TaskComment>(url, { content }, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('Commentaire mis à jour:', response);
    }),
    catchError(error => {
      console.error('Erreur mise à jour commentaire:', error);
      return throwError(() => error);
    })
  );
}

deleteTaskComment(commentId: string): Observable<void> {
  const url = `${this.baseUrl}/comments/${commentId}`;
  console.log('Suppression commentaire:', url);
  
  return this.http.delete<void>(url, {
    headers: this.getHeaders()
  }).pipe(
    tap(() => {
      console.log('Commentaire supprimé avec succès');
    }),
    catchError(error => {
      console.error('Erreur suppression commentaire:', error);
      return throwError(() => error);
    })
  );
}

}