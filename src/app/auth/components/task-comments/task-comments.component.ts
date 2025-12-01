// components/task-comments/task-comments.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { TaskComment } from '../../models/task.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Définition des types pour clarifier le code
interface TaskAssignee {
  memberId?: string;
  member?: { id: string };
}

interface Task {
  id: string;
  title: string;
  assignees: TaskAssignee[];
}

@Component({
  selector: 'app-task-comments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-comments.component.html',
})
export class TaskCommentsComponent implements OnInit {
  @Input() taskId!: string;
  @Input() taskTitle!: string;
  
  
  comments: TaskComment[] = [];
  commentForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;

  constructor(
    private taskService: TaskService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadComments();
  }

  private initForm(): void {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]]
    });
  }

  loadComments(): void {
    this.isLoading = true;
    this.taskService.getTaskComments(this.taskId).subscribe({
      next: (comments: TaskComment[]) => {
        this.comments = comments.sort(
          (a: TaskComment, b: TaskComment) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Erreur chargement commentaires:', error);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.commentForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const content: string = this.commentForm.get('content')?.value;

    this.taskService.createTaskComment(this.taskId, content).subscribe({
      next: (newComment: TaskComment) => {
        this.comments.unshift(newComment);
        this.commentForm.reset();
        this.isSubmitting = false;
        
        
      },
      error: (error: unknown) => {
        console.error('Erreur création commentaire:', error);
        this.isSubmitting = false;
      }
    });
  }

  private sendCommentNotification(commentContent: string): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.id) {
      console.warn('Impossible d\'envoyer la notification - utilisateur non connecté');
      return;
    }

    this.taskService.getTaskById(this.taskId).subscribe({
      next: (task: Task) => {
        if (task && task.assignees && task.assignees.length > 0) {
          const assigneeIds: string[] = task.assignees
            .map((a: TaskAssignee) => a.memberId || a.member?.id)
            .filter((id: string | undefined): id is string => id !== undefined);

          this.notificationService.createTaskCommentNotification(
            this.taskId,
            this.taskTitle,
            commentContent,
            currentUser.id,
            assigneeIds
          ).subscribe({
            next: (response: unknown) => {
              console.log('Notification commentaire envoyée:', response);
            },
            error: (error: unknown) => {
              console.warn('Erreur envoi notification:', error);
            }
          });
        }
      },
      error: (error: unknown) => {
        console.warn('Erreur récupération tâche pour notification:', error);
      }
    });
  }

  deleteComment(commentId: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return;
    }

    this.taskService.deleteTaskComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(comment => comment.id !== commentId);
      },
      error: (error: unknown) => {
        console.error('Erreur suppression commentaire:', error);
      }
    });
  }

  canDeleteComment(comment: TaskComment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === comment.authorId;
  }

getAuthorName(comment: any): string {
    console.log('Structure du commentaire pour debug:', comment);
    
    // Vérifier plusieurs structures possibles
    if (comment.user) {
      const user = comment.user;
      if (user.firstname && user.lastname) {
        return `${user.firstname} ${user.lastname}`;
      }
      return user.username || 'Utilisateur';
    }
    
    if (comment.author) {
      const author = comment.author;
      if (author.firstname && author.lastname) {
        return `${author.firstname} ${author.lastname}`;
      }
      return author.username || 'Utilisateur';
    }
    
    if (comment.createdBy) {
      const createdBy = comment.createdBy;
      if (createdBy.firstname && createdBy.lastname) {
        return `${createdBy.firstname} ${createdBy.lastname}`;
      }
      return createdBy.username || 'Utilisateur';
    }
    
    if (comment.userId) {
      return `Utilisateur ${comment.userId.substring(0, 8)}`;
    }
    
    return 'Utilisateur';
  }

  getAuthorAvatar(comment: any): string {
    const name = this.getAuthorName(comment);
    return name.charAt(0).toUpperCase();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
