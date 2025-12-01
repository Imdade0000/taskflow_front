import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalMembers: number;
  completionRate: number;
  weeklyProgress: number[];
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  statusDistribution: {
    [key: string]: number;
  };
}

export interface ProductivityData {
  date: string;
  completedTasks: number;
}

export interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueStart: string; // ou Date selon votre préférence
  project?: {
    name: string;
  };
  assignees?: Array<{
    member: {
      user: {
        firstname: string;
        lastname: string;
      };
    };
  }>;
}

export interface RecentProject {
  id: string;
  name: string;
  status: string;
  startDate: string; // ou Date selon votre préférence
  endDate?: string | null; // Correspond au DTO NestJS
  progress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Obtenir les statistiques du dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  // Obtenir les données de productivité
  getProductivityData(period: '7d' | '30d' | '3m' = '30d'): Observable<ProductivityData[]> {
    return this.http.get<ProductivityData[]>(`${this.apiUrl}/dashboard/productivity?period=${period}`);
  }

  // Obtenir les tâches récentes (avec la nouvelle interface)
  getRecentTasks(limit: number = 5): Observable<RecentTask[]> {
    return this.http.get<RecentTask[]>(`${this.apiUrl}/dashboard/recent-tasks?limit=${limit}`);
  }

  // Obtenir les projets récents (avec la nouvelle interface)
  getRecentProjects(limit: number = 4): Observable<RecentProject[]> {
    return this.http.get<RecentProject[]>(`${this.apiUrl}/dashboard/recent-projects?limit=${limit}`);
  }

  // Méthodes utilitaires pour formater les données
  formatTaskDueDate(dueStart: string): string {
    const today = new Date();
    const dueDate = new Date(dueStart);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Demain';
    if (diffDays < 0) return 'En retard';
    
    return `Dans ${diffDays} jours`;
  }

  formatProjectDates(startDate: string, endDate?: string | null): string {
    const start = new Date(startDate);
    const formattedStart = start.toLocaleDateString('fr-FR');
    
    if (!endDate) return `Début: ${formattedStart}`;
    
    const end = new Date(endDate);
    const formattedEnd = end.toLocaleDateString('fr-FR');
    
    return `${formattedStart} - ${formattedEnd}`;
  }

  // Simuler des données (à utiliser si l'API n'est pas encore prête)
  getMockDashboardStats(): DashboardStats {
    return {
      totalTasks: 24,
      completedTasks: 18,
      pendingTasks: 6,
      overdueTasks: 3,
      totalProjects: 5,
      activeProjects: 3,
      totalMembers: 12,
      completionRate: 75,
      weeklyProgress: [5, 8, 6, 9, 7, 4, 3],
      priorityDistribution: {
        high: 6,
        medium: 12,
        low: 6
      },
      statusDistribution: {
        'À faire': 8,
        'En cours': 10,
        'Terminé': 6
      }
    };
  }

  getMockProductivityData(): ProductivityData[] {
    const data: ProductivityData[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        completedTasks: Math.floor(Math.random() * 8) + 1
      });
    }
    
    return data;
  }

  // Méthodes mock pour les nouvelles interfaces
  getMockRecentTasks(): RecentTask[] {
    return [
      {
        id: '1',
        title: 'Intégration UI Dashboard',
        status: 'En cours',
        priority: 'Haute',
        dueStart: new Date().toISOString(),
        project: { name: 'TaskFlow' }
      },
      {
        id: '2',
        title: 'API Authentification',
        status: 'À faire',
        priority: 'Moyenne',
        dueStart: new Date(Date.now() + 86400000).toISOString(),
        project: { name: 'TaskFlow' }
      }
    ];
  }

  getMockRecentProjects(): RecentProject[] {
    return [
      {
        id: '1',
        name: 'Site Web',
        status: 'Actif',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2592000000).toISOString(),
        progress: 75
      },
      {
        id: '2',
        name: 'Application Mobile',
        status: 'Actif',
        startDate: new Date().toISOString(),
        progress: 45
      }
    ];
  }
}