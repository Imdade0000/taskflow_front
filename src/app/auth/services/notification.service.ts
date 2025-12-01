//notification.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of, throwError, tap, timer, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { takeUntil, catchError, retry, switchMap, delay } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environments';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'task_assigned' | 'task_completed' | 'task_comment' | 'task_reminder' | 'project_update' | 'deadline_reminder' | 'general';
  taskId?: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = environment.apiUrl;
  private socketUrl = environment.socketUrl || 'http://localhost:3000';
  
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();
  private currentUserId: string | null = null;
  private isInitialized = false;
  private isConnecting = false;
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('NotificationService initialisé avec apiUrl:', this.apiUrl);
  }

  ngOnDestroy() {
    console.log('NotificationService détruit');
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectSocket();
  }

  async initializeForUser(userId: string): Promise<void> {
    console.log('Initialisation du service de notifications pour utilisateur:', userId);
    
    // Réinitialiser si l'utilisateur change
    if (this.currentUserId !== userId) {
      this.reset();
    }
    
    this.currentUserId = userId;
    this.isInitialized = false;
    
    try {
      // Charger les notifications initiales d'abord
      await this.loadInitialNotifications();
      
      // Initialiser le socket ensuite
      await this.initializeSocket();
      
      // Configurer la reconnexion automatique
      this.setupAutoReconnect();
      
      this.isInitialized = true;
      console.log('Service de notifications initialisé avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service:', error);
      // Créer des notifications mock en cas d'échec
      this.createFallbackNotifications();
    }
  }

  private initializeSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentUserId) {
        console.warn('Impossible d\'initialiser le socket sans userId');
        reject(new Error('No user ID'));
        return;
      }

      if (this.isConnecting) {
        console.log('Déjà en cours de connexion...');
        resolve();
        return;
      }

      try {
        console.log('Initialisation du socket pour:', this.currentUserId);
        this.isConnecting = true;
        
        this.socket = io(this.socketUrl, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 10000,
          query: {
            userId: this.currentUserId
          }
        });

        let connectionTimeout: any = null;

        this.socket.on('connect', () => {
          console.log('✅ Connecté au socket de notifications');
          this.isConnecting = false;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          
          if (this.currentUserId) {
            this.joinUserNotificationRoom(this.currentUserId);
          }
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ Déconnecté du socket de notifications:', reason);
          this.isConnecting = false;
          this.tryReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.warn('⚠️ Erreur de connexion socket:', error.message);
          this.isConnecting = false;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          this.tryReconnect();
          reject(error);
        });

        // Écoute unifiée des événements de notification
        this.socket.on('notification', (data: any) => {
          console.log('🔔 Nouvelle notification générique reçue:', data);
          this.handleIncomingNotification(data);
        });

        this.socket.on('new_notification', (notification: Notification) => {
          console.log('🔔 Nouvelle notification reçue:', notification);
          this.handleIncomingNotification(notification);
        });

        this.socket.on('task_assignment', (notification: Notification) => {
          console.log('📋 Notification d\'assignation reçue:', notification);
          this.handleIncomingNotification(notification);
        });

        this.socket.on('task_completed', (notification: Notification) => {
          console.log('✅ Notification de tâche terminée reçue:', notification);
          this.handleIncomingNotification(notification);
        });

              this.socket.on('task_comment', (notification: Notification) => {
        console.log('💬 Notification de commentaire reçue:', notification);
        this.handleIncomingNotification(notification);
      });

      this.socket.on('task_reminder', (notification: Notification) => {
        console.log('⏰ Notification de rappel reçue:', notification);
        this.handleIncomingNotification(notification);
      });

        // Timeout de sécurité
        connectionTimeout = setTimeout(() => {
          console.warn('Timeout de connexion socket');
          this.isConnecting = false;
          reject(new Error('Socket connection timeout'));
        }, 5000);

      } catch (error) {
        console.error('Erreur lors de l\'initialisation du socket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private tryReconnect(): void {
    if (this.currentUserId) {
      setTimeout(() => {
        console.log('🔄 Tentative de reconnexion...');
        this.initializeSocket().catch(error => {
          console.warn('Échec de la reconnexion:', error);
        });
      }, 3000);
    }
  }

  private setupAutoReconnect(): void {
    interval(30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.currentUserId && (!this.socket || !this.socket.connected)) {
        console.log('🔄 Vérification de connexion - tentative de reconnexion');
        this.reconnectSocket();
      }
    });
  }

  private handleIncomingNotification(notification: Notification | any): void {
    // Validation et normalisation
    let normalizedNotification: Notification;
    
    if (notification.notification) {
      // Si c'est un objet encapsulé
      normalizedNotification = notification.notification;
    } else {
      normalizedNotification = notification;
    }

    // Vérifier que c'est pour l'utilisateur actuel
    if (normalizedNotification.userId !== this.currentUserId) {
      console.log('Notification ignorée - pas pour l\'utilisateur actuel:', {
        notificationUserId: normalizedNotification.userId,
        currentUserId: this.currentUserId
      });
      return;
    }

    // Ajouter la notification
    console.log('Ajout de la notification pour l\'utilisateur:', normalizedNotification);
    this.addNotification(normalizedNotification);
    this.showBrowserNotification(normalizedNotification);
  }

  private async loadInitialNotifications(): Promise<void> {
    if (!this.currentUserId) {
      console.warn('Pas d\'utilisateur pour charger les notifications');
      return;
    }

    console.log('Chargement des notifications initiales pour:', this.currentUserId);

    try {
      const notifications = await this.loadNotifications(this.currentUserId).toPromise();
      console.log('Notifications initiales chargées:', notifications?.length || 0, 'notifications');
      this.updateNotifications(notifications || []);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications initiales:', error);
      this.createFallbackNotifications();
    }
  }

  private joinUserNotificationRoom(userId: string) {
    if (this.socket && this.socket.connected) {
      console.log('🏠 Rejoindre la room de notification pour:', userId);
      this.socket.emit('join_user_room', { userId });
      
      // Confirmation que nous sommes dans la room
      this.socket.emit('confirm_room_join', { userId }, (response: any) => {
        console.log('Confirmation room join:', response);
      });
    } else {
      console.warn('Socket non connecté pour rejoindre la room');
    }
  }

  loadNotifications(userId?: string): Observable<Notification[]> {
    const targetUserId = userId || this.currentUserId;
    
    if (!targetUserId) {
      console.warn('Aucun userId fourni pour loadNotifications');
      return of([]);
    }

    const url = `${this.apiUrl}/notifications/user/${targetUserId}`;
    console.log('🔄 Chargement des notifications depuis:', url);
    
    return this.http.get<Notification[]>(url).pipe(
      retry(2),
      tap(notifications => {
        console.log(`✅ Notifications API chargées pour ${targetUserId}:`, notifications.length, 'notifications');
      }),
      catchError(error => {
        console.error('❌ Erreur API notifications:', error);
        
        if (error.status === 404) {
          console.warn('Endpoint notifications non disponible (404), utilisation de notifications simulées');
          return of(this.createMockNotificationsForUser(targetUserId));
        }
        
        if (error.status === 401 || error.status === 403) {
          console.warn('Problème d\'authentification pour les notifications');
        }
        
        return of([]);
      })
    );
  }

  createTaskAssignmentNotification(
    taskTitle: string,
    assignedUserIds: string[], 
    taskId: string
  ): Observable<any> {
    console.log('📋 Création de notification d\'assignation:', { taskTitle, assignedUserIds, taskId });
    
    const currentUserId = this.getCurrentUserIdRobust();
    
    if (!currentUserId) {
      console.warn('Impossible de créer des notifications - aucun utilisateur connecté');
      return this.createLocalNotificationsOnly(taskTitle, taskId, assignedUserIds);
    }

    const payload = {
      taskTitle,
      assignedUserIds,
      taskId,
      assignedBy: currentUserId
    };

    console.log('Payload notification assignation:', payload);

    const url = `${this.apiUrl}/notifications/task-assignment`;
    console.log('URL utilisée pour les notifications d\'assignation:', url);

    return this.http.post(url, payload).pipe(
      tap(response => {
        console.log('✅ Notification assignation créée via API:', response);
        
        // Émettre l'événement avec le bon nom
        if (this.socket && this.socket.connected) {
          console.log('📡 Émission événement socket task_assignment');
          this.socket.emit('task_assignment', payload);
        } else {
          console.warn('Socket non connecté, événement non émis');
        }
      }),
      catchError(error => {
        console.error('❌ Erreur création notification assignation:', error);
        
        // Créer des notifications locales de fallback pour chaque assigné
        assignedUserIds.forEach(userId => {
          this.createLocalTaskAssignmentNotification(taskTitle, taskId, userId);
        });
        
        return of({ 
          success: true, 
          fallback: true, 
          error: error.message,
          localNotificationsCreated: assignedUserIds.length 
        });
      })
    );
  }

  createTaskCompletedNotification(
    projectMemberIds: string[],
    taskTitle: string,
    taskId: string,
    completedByUserId?: string
  ): Observable<any> {
    console.log('✅ Création de notification de tâche terminée:', { 
      projectMemberIds, 
      taskTitle, 
      taskId, 
      completedByUserId 
    });

    const currentUserId = completedByUserId || this.getCurrentUserIdRobust();
    
    if (!currentUserId) {
      console.warn('Impossible de créer la notification de tâche terminée - aucun utilisateur');
      return of({ success: false, error: 'No user found' });
    }

    const payload = {
      projectMemberIds,
      taskTitle,
      taskId,
      completedByUserId: currentUserId
    };

    const url = `${this.apiUrl}/notifications/task-completed`;
    console.log('URL notification tâche terminée:', url);

    return this.http.post(url, payload).pipe(
      tap(response => {
        console.log('✅ Notification tâche terminée créée via API:', response);
        
        // Émettre l'événement avec le bon nom
        if (this.socket && this.socket.connected) {
          console.log('📡 Émission événement socket task_completed');
          this.socket.emit('task_completed', payload);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur création notification tâche terminée:', error);
        
        // Créer notification locale de fallback
        const localNotification: Notification = {
          id: 'local-completed-' + Date.now(),
          title: 'Tâche terminée',
          content: `La tâche "${taskTitle}" a été marquée comme terminée`,
          type: 'task_completed',
          taskId: taskId,
          userId: currentUserId,
          isRead: false,
          createdAt: new Date()
        };

        if (projectMemberIds.includes(currentUserId)) {
          this.addNotification(localNotification);
        }

        return of({ 
          success: true, 
          fallback: true, 
          error: error.message 
        });
      })
    );
  }

  addNotification(notification: Notification): void {
    if (!this.isValidNotification(notification)) {
      console.warn('Notification invalide ignorée:', notification);
      return;
    }

    const currentNotifications = this.notificationsSubject.value;
    
    // Vérifier les doublons
    const exists = currentNotifications.some(n => 
      n.id === notification.id || 
      (n.taskId === notification.taskId && n.type === notification.type && 
       Math.abs(new Date(n.createdAt).getTime() - new Date(notification.createdAt).getTime()) < 1000)
    );
    
    if (exists) {
      console.log('Notification en doublon ignorée:', notification.id);
      return;
    }

    console.log('✅ Ajout nouvelle notification:', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      userId: notification.userId
    });
    
    const updatedNotifications = [notification, ...currentNotifications];
    this.updateNotifications(updatedNotifications);
  }

  private isValidNotification(notification: any): notification is Notification {
    return notification && 
           typeof notification.id === 'string' &&
           typeof notification.title === 'string' &&
           typeof notification.content === 'string' &&
           typeof notification.type === 'string' &&
           typeof notification.userId === 'string' &&
           notification.createdAt;
  }

  private createFallbackNotifications(): void {
    if (!this.currentUserId) return;
    
    console.log('Création de notifications de fallback');
    const fallbackNotifications = this.createMockNotificationsForUser(this.currentUserId);
    this.updateNotifications(fallbackNotifications);
  }

  updateNotifications(notifications: Notification[]): void {
    console.log('🔄 Mise à jour des notifications locales:', notifications.length, 'notifications');
    
    // Filtrer et trier
    const validNotifications = notifications.filter(n => this.isValidNotification(n));
    const sortedNotifications = validNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Mettre à jour les sujets
    this.notificationsSubject.next(sortedNotifications);
    const unreadCount = sortedNotifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
    
    console.log(`📊 Notifications mises à jour: ${sortedNotifications.length} total, ${unreadCount} non lues`);
  }

  private getCurrentUserIdRobust(): string | null {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    const user = this.authService.getCurrentUser();
    
    if (user) {
      const possibleIds = [user.id, user.sub, user.userId, user.user_id];
      
      for (const id of possibleIds) {
        if (id && typeof id === 'string') {
          this.currentUserId = id;
          console.log(`🔍 ID utilisateur trouvé: ${id}`);
          return id;
        }
      }
    }

    console.warn('❌ Impossible de déterminer l\'ID utilisateur:', user);
    return null;
  }

  markAsRead(notificationId: string): Observable<Notification> {
    console.log('📖 Marquage comme lu:', notificationId);
    
    return this.http.patch<Notification>(`${this.apiUrl}/notifications/${notificationId}/read`, {}).pipe(
      tap(response => {
        console.log('✅ Notification marquée comme lue via API:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur marquage comme lu via API:', error);
        this.markNotificationAsReadLocally(notificationId);
        return of({
          id: notificationId,
          isRead: true,
          updatedAt: new Date()
        } as Notification);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    const currentUserId = this.getCurrentUserIdRobust();
    
    if (!currentUserId) {
      console.warn('Impossible de marquer comme lu - aucun utilisateur');
      this.markAllAsReadLocally();
      return of({ success: true, fallback: true });
    }

    console.log('📖 Marquage de toutes les notifications comme lues pour:', currentUserId);

    return this.http.patch(`${this.apiUrl}/notifications/user/${currentUserId}/mark-all-read`, {}).pipe(
      tap(response => {
        console.log('✅ Toutes les notifications marquées comme lues via API:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur marquage global comme lu via API:', error);
        this.markAllAsReadLocally();
        return of({ success: true, fallback: true });
      })
    );
  }

  private markNotificationAsReadLocally(notificationId: string): void {
    console.log('📖 Marquage local comme lu:', notificationId);
    
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notif =>
      notif.id === notificationId ? { ...notif, isRead: true, updatedAt: new Date() } : notif
    );
    this.updateNotifications(updatedNotifications);
  }

  private markAllAsReadLocally(): void {
    console.log('📖 Marquage local de toutes les notifications comme lues');
    
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notif => ({
      ...notif,
      isRead: true,
      updatedAt: new Date()
    }));
    this.updateNotifications(updatedNotifications);
  }

  private showBrowserNotification(notification: Notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('🔔 Affichage notification navigateur:', notification.title);
      
      const browserNotification = new Notification(notification.title, {
        body: notification.content,
        icon: '/assets/icons/notification-icon.png',
        badge: '/assets/icons/badge-icon.png',
        tag: notification.id,
        requireInteraction: false
      });

      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission().then(permission => {
        console.log('🔔 Permission de notification:', permission);
        return permission;
      });
    } else {
      console.log('❌ Notifications non supportées par ce navigateur');
      return Promise.resolve('denied' as NotificationPermission);
    }
  }

  private createMockNotificationsForUser(userId: string): Notification[] {
    console.log('🎭 Création de notifications simulées pour:', userId);
    
    return [
      {
        id: `mock-${userId}-${Date.now()}-1`,
        type: 'task_assigned',
        title: 'Tâche assignée (Test)',
        content: 'Ceci est une notification de test - tâche assignée',
        taskId: 'task-mock-1',
        userId: userId,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: `mock-${userId}-${Date.now()}-2`,
        type: 'task_completed',
        title: 'Tâche terminée (Test)',
        content: 'Ceci est une notification de test - tâche terminée',
        taskId: 'task-mock-2',
        userId: userId,
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 2)
      }
    ];
  }

  private createLocalTaskAssignmentNotification(taskTitle: string, taskId: string, userId: string) {
    const notification: Notification = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      title: 'Tâche assignée',
      content: `Vous avez été assigné à la tâche "${taskTitle}"`,
      type: 'task_assigned',
      taskId: taskId,
      userId: userId,
      isRead: false,
      createdAt: new Date()
    };

    console.log('🎭 Création notification locale assignation:', notification);

    if (userId === this.currentUserId) {
      this.addNotification(notification);
    }
  }

  private createLocalNotificationsOnly(taskTitle: string, taskId: string, assignedUserIds: string[]): Observable<any> {
    console.log('🎭 Création notifications locales uniquement pour:', assignedUserIds);
    
    let localNotificationsCount = 0;
    
    assignedUserIds.forEach(userId => {
      this.createLocalTaskAssignmentNotification(taskTitle, taskId, userId);
      localNotificationsCount++;
    });
    
    console.log(`${localNotificationsCount} notifications locales créées`);
    
    return of({ 
      success: true, 
      fallback: true, 
      message: 'Notifications créées localement uniquement',
      localNotificationsCreated: localNotificationsCount
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      console.log('🔌 Déconnexion du socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  reconnectSocket(): void {
    console.log('🔄 Reconnexion forcée du socket');
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.currentUserId) {
      setTimeout(() => {
        this.initializeSocket().then(() => {
          console.log('✅ Socket reconnecté avec succès');
        }).catch(error => {
          console.error('❌ Échec de la reconnexion du socket:', error);
        });
      }, 2000);
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  getAllNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  reset(): void {
    console.log('🔄 Réinitialisation du service de notifications');
    
    this.currentUserId = null;
    this.isInitialized = false;
    this.disconnectSocket();
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }



/**
 * Crée une notification de commentaire sur une tâche
 */
createTaskCommentNotification(
  taskId: string,
  taskTitle: string,
  commentContent: string,
  commentAuthorId: string,
  assignedProjectMemberIds: string[]
): Observable<any> {
  console.log('💬 Création de notification de commentaire:', { 
    taskId, taskTitle, commentContent, commentAuthorId, assignedProjectMemberIds 
  });

  const currentUserId = this.getCurrentUserIdRobust();
  
  if (!currentUserId) {
    console.warn('Impossible de créer des notifications de commentaire - aucun utilisateur connecté');
    return this.createLocalTaskCommentNotification(taskId, taskTitle, commentContent, assignedProjectMemberIds);
  }

  const payload = {
    taskId,
    taskTitle,
    commentContent: commentContent.length > 100 ? commentContent.substring(0, 100) + '...' : commentContent,
    commentAuthorId,
    assignedProjectMemberIds
  };

  const url = `${this.apiUrl}/notifications/task-comment`;
  console.log('URL notification commentaire:', url);

  return this.http.post(url, payload).pipe(
    tap(response => {
      console.log('✅ Notification commentaire créée via API:', response);
      
      // Émettre l'événement socket
      if (this.socket && this.socket.connected) {
        console.log('📡 Émission événement socket task_comment');
        this.socket.emit('task_comment', payload);
      }
    }),
    catchError(error => {
      console.error('❌ Erreur création notification commentaire:', error);
      
      // Retourner les notifications locales de fallback
      return this.createLocalTaskCommentNotification(taskId, taskTitle, commentContent, assignedProjectMemberIds);
    })
  );
}

/**
 * Crée une notification de rappel pour une tâche
 */
createTaskReminderNotification(
  assignedProjectMemberIds: string[],
  taskTitle: string,
  taskId: string,
  reminderType: 'DUE_SOON' | 'OVERDUE' = 'DUE_SOON'
): Observable<any> {
  console.log('⏰ Création de notification de rappel:', { 
    assignedProjectMemberIds, taskTitle, taskId, reminderType 
  });

  const currentUserId = this.getCurrentUserIdRobust();
  
  if (!currentUserId) {
    console.warn('Impossible de créer des notifications de rappel - aucun utilisateur connecté');
    return this.createLocalTaskReminderNotification(taskTitle, taskId, reminderType, assignedProjectMemberIds);
  }

  const payload = {
    assignedProjectMemberIds,
    taskTitle,
    taskId,
    reminderType
  };

  const url = `${this.apiUrl}/notifications/task-reminder`;
  console.log('URL notification rappel:', url);

  return this.http.post(url, payload).pipe(
    tap(response => {
      console.log('✅ Notification rappel créée via API:', response);
      
      // Émettre l'événement socket
      if (this.socket && this.socket.connected) {
        console.log('📡 Émission événement socket task_reminder');
        this.socket.emit('task_reminder', payload);
      }
    }),
    catchError(error => {
      console.error('❌ Erreur création notification rappel:', error);
      
      // Retourner les notifications locales de fallback
      return this.createLocalTaskReminderNotification(taskTitle, taskId, reminderType, assignedProjectMemberIds);
    })
  );
}

/**
 * Crée une notification locale de commentaire (fallback) - RETOURNE OBSERVABLE
 */
private createLocalTaskCommentNotification(
  taskId: string,
  taskTitle: string,
  commentContent: string,
  userIds: string[]
): Observable<any> {
  return new Observable(observer => {
    let localNotificationsCount = 0;
    
    userIds.forEach(userId => {
      const notification: Notification = {
        id: 'local-comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: 'Nouveau commentaire',
        content: `Nouveau commentaire sur la tâche "${taskTitle}": ${commentContent}`,
        type: 'task_comment',
        taskId: taskId,
        userId: userId,
        isRead: false,
        createdAt: new Date()
      };

      console.log('🎭 Création notification locale commentaire:', notification);

      if (userId === this.currentUserId) {
        this.addNotification(notification);
        localNotificationsCount++;
      }
    });
    
    observer.next({ 
      success: true, 
      fallback: true, 
      message: 'Notifications créées localement uniquement',
      localNotificationsCreated: localNotificationsCount
    });
    observer.complete();
  });
}

/**
 * Crée une notification locale de rappel (fallback) - RETOURNE OBSERVABLE
 */
private createLocalTaskReminderNotification(
  taskTitle: string,
  taskId: string,
  reminderType: 'DUE_SOON' | 'OVERDUE',
  userIds: string[]
): Observable<any> {
  return new Observable(observer => {
    let localNotificationsCount = 0;
    
    userIds.forEach(userId => {
      const message = reminderType === 'DUE_SOON' 
        ? `La tâche "${taskTitle}" approche de son échéance`
        : `La tâche "${taskTitle}" est en retard`;

      const notification: Notification = {
        id: 'local-reminder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: reminderType === 'DUE_SOON' ? 'Échéance proche' : 'Tâche en retard',
        content: message,
        type: 'task_reminder',
        taskId: taskId,
        userId: userId,
        isRead: false,
        createdAt: new Date()
      };

      console.log('🎭 Création notification locale rappel:', notification);

      if (userId === this.currentUserId) {
        this.addNotification(notification);
        localNotificationsCount++;
      }
    });
    
    observer.next({ 
      success: true, 
      fallback: true, 
      message: 'Notifications créées localement uniquement',
      localNotificationsCreated: localNotificationsCount
    });
    observer.complete();
  });
}
  debugService(): void {
    console.log('=== 🐛 DEBUG NOTIFICATION SERVICE ===');
    console.log('Utilisateur courant:', this.currentUserId);
    console.log('Service initialisé:', this.isInitialized);
    console.log('Socket connecté:', this.isSocketConnected());
    console.log('Notifications actuelles:', this.getAllNotifications().length);
    console.log('Notifications non lues:', this.getUnreadCount());
    console.log('Dernières notifications:');
    this.getAllNotifications().slice(0, 3).forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.type}: ${notif.title} (${notif.isRead ? 'lu' : 'NON LU'})`);
    });
    console.log('====================================');
  }
}