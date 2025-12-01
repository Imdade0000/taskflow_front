//dashboard.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { NotificationService } from '../../auth/services/notification.service';
import { 
  DashboardService, 
  DashboardStats, 
  RecentTask, 
  RecentProject 
} from '../../auth/services/dashboard.service';
import { Router } from '@angular/router';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { Event as RouterEvent, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { delay, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, interval, Subject, merge } from 'rxjs';
import type { Notification } from '../../auth/services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LoaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  userMenuOpen = false;
  notificationsOpen = false;
  isLoading = false;

  // Données du dashboard
  dashboardStats: DashboardStats | null = null;
  notifications: Notification[] = [];
  unreadNotificationCount = 0;
  
  // États de chargement
  isLoadingNotifications = false;
  notificationError: string | null = null;
  
  // Données pour les graphiques
  weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  
  // Données réelles depuis l'API
  recentProjects: RecentProject[] = [];
  recentTasks: RecentTask[] = [];

  private subscriptions = new Subscription();
  private destroy$ = new Subject<void>();
  private notificationInitialized = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    public notificationService: NotificationService,
    private dashboardService: DashboardService
  ) {
    // Gestion du loader
    this.router.events.pipe(delay(100)).subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        setTimeout(() => {
          this.isLoading = false;
        }, 800);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    console.log('Dashboard ngOnInit - Initialisation');
    
    // Attendre que l'utilisateur soit complètement chargé
    await this.waitForUserAuthentication();
    
    // Initialiser les notifications
    await this.initializeNotifications();
    
    // Charger les autres données
    this.loadDashboardData();
    this.loadRecentTasks();
    this.loadRecentProjects();
    
    // Configurer le rafraîchissement automatique
    this.setupAutoRefresh();
  }

  private async waitForUserAuthentication(): Promise<void> {
    return new Promise((resolve) => {
      if (this.authService.getCurrentUser()?.id) {
        resolve();
        return;
      }

      // Attendre jusqu'à 5 secondes que l'utilisateur soit chargé
      const maxWaitTime = 5000;
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (this.authService.getCurrentUser()?.id || Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  ngOnDestroy(): void {
    console.log('Dashboard ngOnDestroy');
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  private async initializeNotifications(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id) {
      console.warn('Aucun utilisateur connecté pour initialiser les notifications');
      this.notificationError = 'Utilisateur non connecté';
      return;
    }

    // Vérifier si déjà initialisé pour cet utilisateur
    if (this.notificationInitialized && this.notificationService.getCurrentUserId() === currentUser.id) {
      console.log('Notifications déjà initialisées pour cet utilisateur');
      this.setupNotificationSubscriptions();
      return;
    }

    try {
      this.isLoadingNotifications = true;
      this.notificationError = null;
      
      console.log('Initialisation des notifications pour:', currentUser.id);
      
      // Initialiser le service
      await this.notificationService.initializeForUser(currentUser.id);
      
      // S'abonner aux observables
      this.setupNotificationSubscriptions();
      
      this.notificationInitialized = true;
      console.log('Notifications initialisées avec succès');
      
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      this.notificationError = 'Erreur de chargement des notifications';
      
      // Créer des notifications de test en cas d'erreur
      this.createTestNotifications();
    } finally {
      this.isLoadingNotifications = false;
    }
  }

  private setupNotificationSubscriptions(): void {
    console.log('Configuration des abonnements notifications');
    
    // Nettoyer les anciens abonnements
    this.subscriptions.add(
      this.notificationService.notifications$.pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      ).subscribe({
        next: (notifications) => {
          console.log('Mise à jour notifications dashboard:', notifications.length);
          this.notifications = notifications;
          this.updateNotificationBadge();
        },
        error: (error) => {
          console.error('Erreur dans l\'abonnement aux notifications:', error);
        }
      })
    );

    // Abonnement au compteur non lu
    this.subscriptions.add(
      this.notificationService.unreadCount$.pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (count) => {
          console.log('Mise à jour compteur non lu:', count);
          this.unreadNotificationCount = count;
        },
        error: (error) => {
          console.error('Erreur dans l\'abonnement au compteur:', error);
        }
      })
    );
  }

  private updateNotificationBadge(): void {
    const unreadCount = this.notifications.filter(n => !n.isRead).length;
    if (unreadCount !== this.unreadNotificationCount) {
      this.unreadNotificationCount = unreadCount;
      console.log('Badge notification mis à jour:', unreadCount);
    }
  }

  private createTestNotifications(): void {
    console.log('Création de notifications de test');
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) return;

    const testNotifications: Notification[] = [
      {
        id: 'test-1-' + Date.now(),
        title: 'Test - Tâche assignée',
        content: 'Ceci est une notification de test pour vérifier l\'affichage',
        type: 'task_assigned',
        taskId: 'test-task-1',
        userId: currentUser.id,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 2)
      },
      {
        id: 'test-2-' + Date.now(),
        title: 'Test - Tâche terminée',
        content: 'Une tâche a été marquée comme terminée (test)',
        type: 'task_completed',
        taskId: 'test-task-2',
        userId: currentUser.id,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5)
      }
    ];

    // Ajouter directement aux notifications
    this.notifications = testNotifications;
    this.unreadNotificationCount = testNotifications.length;
  }

  private loadDashboardData(): void {
    console.log('Chargement des données du dashboard...');
    
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        console.log('Statistiques reçues:', stats);
        this.dashboardStats = stats;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.dashboardStats = this.dashboardService.getMockDashboardStats();
      }
    });
  }

  private loadRecentTasks(): void {
    console.log('Chargement des tâches récentes...');
    
    this.dashboardService.getRecentTasks(5).subscribe({
      next: (tasks) => {
        console.log('Tâches récentes reçues:', tasks);
        this.recentTasks = tasks;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tâches récentes:', error);
        this.recentTasks = this.dashboardService.getMockRecentTasks();
      }
    });
  }

  private loadRecentProjects(): void {
    console.log('Chargement des projets récents...');
    
    this.dashboardService.getRecentProjects(4).subscribe({
      next: (projects) => {
        console.log('Projets récents reçus:', projects);
        this.recentProjects = projects;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des projets récents:', error);
        this.recentProjects = this.dashboardService.getMockRecentProjects();
      }
    });
  }

  private setupAutoRefresh(): void {
    // Rafraîchir les notifications toutes les 30 secondes
    this.subscriptions.add(
      interval(30000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.notificationInitialized && !this.notificationsOpen) {
          this.refreshNotifications();
        }
      })
    );

    // Rafraîchir les données du dashboard toutes les 2 minutes
    this.subscriptions.add(
      interval(120000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.loadDashboardData();
      })
    );
  }

  toggleNotifications(): void {
    console.log('Toggle notifications, current state:', this.notificationsOpen);
    this.notificationsOpen = !this.notificationsOpen;
    
    if (this.notificationsOpen) {
      this.userMenuOpen = false;
      console.log('Notifications ouvertes, liste actuelle:', this.notifications.length);
      
      // Marquer les permissions de notification si pas encore fait
      if (Notification.permission === 'default') {
        this.notificationService.requestNotificationPermission();
      }
      
      // Rafraîchir les notifications quand on ouvre le dropdown
      this.refreshNotifications();
    }
  }

  async markNotificationAsRead(notification: Notification): Promise<void> {
    if (notification.isRead) {
      console.log('Notification déjà lue:', notification.id);
      return;
    }

    try {
      console.log('Marquage comme lue:', notification.id);
      
      // Marquer localement d'abord pour une réponse immédiate
      this.markNotificationAsReadLocally(notification.id);
      
      // Puis via l'API
      await this.notificationService.markAsRead(notification.id).toPromise();
      console.log('Notification marquée comme lue via API');
      
    } catch (error) {
      console.error('Erreur marquage comme lu:', error);
    }
  }

  private markNotificationAsReadLocally(notificationId: string): void {
    this.notifications = this.notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    this.updateNotificationBadge();
  }

  async markAllNotificationsAsRead(): Promise<void> {
    console.log('Marquage de toutes les notifications comme lues');
    
    try {
      // Marquer localement d'abord
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.unreadNotificationCount = 0;
      
      // Puis via l'API
      await this.notificationService.markAllAsRead().toPromise();
      console.log('Toutes les notifications marquées comme lues');
      
    } catch (error) {
      console.error('Erreur marquage toutes comme lues:', error);
    }
  }

  refreshNotifications(): void {
    if (!this.notificationInitialized) {
      console.log('Service non initialisé, skip refresh');
      return;
    }

    console.log('Rafraîchissement des notifications');
    
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.notificationService.loadNotifications(currentUser.id).subscribe({
        next: (notifications) => {
          console.log('Notifications rafraîchies:', notifications.length);
        },
        error: (error) => {
          console.warn('Erreur rafraîchissement notifications:', error);
        }
      });
    }
  }

  simulateTaskAssignmentNotification(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.warn('Pas d\'utilisateur connecté pour la simulation');
      return;
    }

    console.log('Simulation d\'une notification de tâche assignée');

    const mockNotification: Notification = {
      id: 'sim-assigned-' + Date.now(),
      title: 'Nouvelle tâche assignée (Simulation)',
      content: 'Vous avez été assigné à la tâche "Test Simulation Assignment"',
      type: 'task_assigned',
      taskId: 'sim-task-' + Date.now(),
      userId: currentUser.id,
      isRead: false,
      createdAt: new Date()
    };

    // Ajouter directement la notification
    this.notificationService.addNotification(mockNotification);
    console.log('Notification simulée ajoutée:', mockNotification);
  }

  simulateTaskCompletedNotification(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) return;

    const mockNotification: Notification = {
      id: 'sim-completed-' + Date.now(),
      title: 'Tâche terminée (Simulation)',
      content: 'La tâche "Test Simulation Completion" a été marquée comme terminée',
      type: 'task_completed',
      taskId: 'sim-task-completed-' + Date.now(),
      userId: currentUser.id,
      isRead: false,
      createdAt: new Date()
    };

    this.notificationService.addNotification(mockNotification);
    console.log('Notification de tâche terminée simulée ajoutée:', mockNotification);
  }

  debugNotifications(): void {
    console.log('=== DEBUG NOTIFICATIONS DASHBOARD ===');
    console.log('Notifications initialisées:', this.notificationInitialized);
    console.log('Notifications actuelles:', this.notifications);
    console.log('Compteur non lu local:', this.unreadNotificationCount);
    console.log('Service connecté:', this.notificationService.isSocketConnected());
    console.log('Utilisateur courant:', this.authService.getCurrentUser());
    console.log('Erreur notifications:', this.notificationError);
    console.log('=====================================');
    
    // Debug du service aussi
    this.notificationService.debugService();
  }

  getTaskDueText(dueStart: string): string {
    return this.dashboardService.formatTaskDueDate(dueStart);
  }

  getProjectDateText(project: RecentProject): string {
    return this.dashboardService.formatProjectDates(project.startDate, project.endDate);
  }

  getAssigneeNames(task: RecentTask): string {
    if (!task.assignees || task.assignees.length === 0) {
      return 'Non assigné';
    }
    
    return task.assignees.map(assignee => 
      `${assignee.member.user.firstname} ${assignee.member.user.lastname}`
    ).join(', ');
  }

  getProjectProgress(project: RecentProject): number {
    return project.progress || 0;
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diff = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days === 1) return 'Hier';
    return `il y a ${days} jours`;
  }

  getNotificationTypeLabel(type: string): string {
    const typeLabels: { [key: string]: string } = {
      'task_assigned': 'Assignation',
      'task_completed': 'Tâche terminée',
      'task_comment': 'Commentaire',
      'task_reminder': 'Rappel',
      'deadline_reminder': 'Échéance',
      'project_update': 'Projet',
      'general': 'Général'
    };
    
    return typeLabels[type] || type;
  }

  getWeekProgressHeight(dayIndex: number): number {
    if (!this.dashboardStats?.weeklyProgress) return 0;
    const maxValue = Math.max(...this.dashboardStats.weeklyProgress);
    return maxValue === 0 ? 0 : (this.dashboardStats.weeklyProgress[dayIndex] / maxValue) * 100;
  }

  getPriorityChartBackground(): string {
    if (!this.dashboardStats?.priorityDistribution) {
      return 'conic-gradient(#10B981 0deg 120deg, #F59E0B 120deg 240deg, #EF4444 240deg 360deg)';
    }

    const { high, medium, low } = this.dashboardStats.priorityDistribution;
    const total = high + medium + low;
    
    if (total === 0) {
      return 'conic-gradient(#E5E7EB 0deg 360deg)';
    }

    const lowPercent = (low / total) * 360;
    const mediumPercent = (medium / total) * 360;

    return `conic-gradient(
      #10B981 0deg ${lowPercent}deg,
      #F59E0B ${lowPercent}deg ${lowPercent + mediumPercent}deg,
      #EF4444 ${lowPercent + mediumPercent}deg 360deg
    )`;
  }

  getProjectColorClass(projectName: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
    ];
    
    const hash = this.hashString(projectName);
    return colors[hash % colors.length];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getPriorityColor(priority: string): string {
    return {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    }[priority] || 'bg-gray-100 text-gray-800';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.userMenuOpen = !this.userMenuOpen;
    this.notificationsOpen = false;
  }

  trackNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  trackTask(index: number, task: RecentTask): string {
    return task.id;
  }

  trackProject(index: number, project: RecentProject): string {
    return project.id;
  }

  logout(): void {
    this.isLoading = true;
   
    this.authService.logout().subscribe({
      next: () => {
        this.userMenuOpen = false;
        this.notificationService.reset();
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 500);
      },
      error: (err: any) => {
        console.error('Erreur lors de la déconnexion:', err);
        this.authService.logout();
        this.notificationService.reset();
        setTimeout(() => {
          this.isLoading = false;
          this.router.navigate(['/login']);
        }, 500);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (this.userMenuOpen && !target.closest('.user-menu-container')) {
      this.userMenuOpen = false;
    }
    
    if (this.notificationsOpen && !target.closest('.notifications-container')) {
      this.notificationsOpen = false;
    }
  }

  // Ajoutez ces méthodes à votre classe DashboardComponent

getUserInitials(): string {
  const user = this.authService.getCurrentUser();
  if (!user) return 'U';
  
  const firstInitial = user.firstname?.charAt(0)?.toUpperCase() || '';
  const lastInitial = user.lastname?.charAt(0)?.toUpperCase() || '';
  
  return firstInitial + lastInitial || user.email?.charAt(0)?.toUpperCase() || 'U';
}

getUserFullName(): string {
  const user = this.authService.getCurrentUser();
  if (!user) return 'Utilisateur';
  
  const firstName = user.firstname || '';
  const lastName = user.lastname || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  return user.email?.split('@')[0] || 'Utilisateur';
}
}