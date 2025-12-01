import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../auth/services/project.service';
import { CreateProjectDto, Project, UpdateProjectDto } from '../../../auth/models/project.model';
import Swal from 'sweetalert2';

interface FormData {
  name: string;
  description: string;
  startDate: string;
  dueStart: string;
  dueEnd: string;
  endDate: string;
  projectStatusId: string;
}

@Component({
  selector: 'app-project-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-form-modal.component.html',
  styles: [`
    .error-message {
      color: #ef4444;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #fef2f2;
      border-radius: 0.375rem;
      border: 1px solid #fecaca;
    }
    .warning-message {
      color: #f59e0b;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background-color: #fffbeb;
      border-radius: 0.375rem;
      border: 1px solid #fed7aa;
    }
  `]
})
export class ProjectFormModalComponent implements OnInit {
  @Input() userId: string = '';
  @Input() projectToEdit?: Project;
  @Input() isEditMode: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() projectCreated = new EventEmitter<Project>();
  @Output() projectUpdated = new EventEmitter<Project>();

  formData: FormData = {
    name: '',
    description: '',
    startDate: this.formatDateForInput(new Date()),
    dueStart: this.formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    dueEnd: this.formatDateForInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    endDate: this.formatDateForInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    projectStatusId: 'f94389d4-36dd-41f6-a056-e456be1c04e6'
  };

  statuses = [
    { id: 'f94389d4-36dd-41f6-a056-e456be1c04e6', name: 'Actif' },
    { id: 'a0ed99ea-710b-4833-92e8-a22b2dd6afeb', name: 'En cours' },
    { id: 'df084f00-607d-4966-8d77-de1bf93dd5a7', name: 'En attente' },
    { id: '3c545daa-2cd2-4716-83a7-652c5765a9d1', name: 'Suspendu' },
    { id: '15141c76-14d3-4ec4-b5a4-6b05a45d33d8', name: 'Terminé' }
  ];

  error: string | null = null;
  warning: string | null = null;
  isLoading: boolean = false;

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    if (this.isEditMode && this.projectToEdit) {
      this.initEditForm();
    }

    if (!this.userId) {
      this.error = 'Identifiant utilisateur invalide. Veuillez vous reconnecter.';
    }

    this.checkAuthToken();
  }

  private initEditForm(): void {
  if (!this.projectToEdit) return;

  this.formData = {
    name: this.projectToEdit.name,
    description: this.projectToEdit.description || '',
    startDate: this.formatDateForInput(this.projectToEdit.startDate),
    dueStart: this.formatDateForInput(this.projectToEdit.dueStart),
    dueEnd: this.formatDateForInput(this.projectToEdit.dueEnd),
    endDate: this.formatDateForInput(this.projectToEdit.endDate),
    projectStatusId: this.projectToEdit.status.id
  };
}

  private checkAuthToken(): void {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      this.warning = 'Aucun token d\'authentification trouvé.';
    }
  }

  private formatDateForInput(date: Date | string | undefined): string {
  if (!date) return ''; // Gère les cas undefined/null/empty
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString().split('T')[0];
}
  onSubmit() {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.error = null;

    if (this.isEditMode && this.projectToEdit) {
      this.updateProject();
    } else {
      this.createProject();
    }
  }

  private validateForm(): boolean {
    if (!this.userId) {
      this.error = 'Identifiant utilisateur invalide.';
      return false;
    }
   
    if (!this.formData.name.trim()) {
      this.error = 'Le nom du projet est obligatoire';
      return false;
    }
   
    if (!this.formData.projectStatusId) {
      this.error = 'Statut de projet invalide';
      return false;
    }

    const startDate = new Date(this.formData.startDate);
    const dueDate = this.formData.dueStart ? new Date(this.formData.dueStart) : null;
    const endDate = this.formData.endDate ? new Date(this.formData.endDate) : null;

    if (dueDate && dueDate < startDate) {
      this.error = 'La date d\'échéance ne peut pas être antérieure à la date de début';
      return false;
    }

    if (endDate && endDate < startDate) {
      this.error = 'La date de fin ne peut pas être antérieure à la date de début';
      return false;
    }

    return true;
  }

  private createProject(): void {
    const apiData: CreateProjectDto = {
      name: this.formData.name,
      description: this.formData.description,
      startDate: this.formData.startDate,
      dueStart: this.formData.dueStart || undefined,
      endDate: this.formData.endDate || undefined,
      projectStatusId: this.formData.projectStatusId,
      userId: this.userId
    };

    this.projectService.createProject(apiData).subscribe({
      next: (result) => {
        this.handleSuccess(result, 'Projet créé avec succès!');
        this.projectCreated.emit(result);
      },
      error: (err) => this.handleError(err)
    });
  }

  private updateProject(): void {
    if (!this.projectToEdit) return;

    const apiData: UpdateProjectDto = {
      name: this.formData.name,
      description: this.formData.description,
      startDate: this.formData.startDate,
      dueStart: this.formData.dueStart || undefined,
      endDate: this.formData.endDate || undefined,
      projectStatusId: this.formData.projectStatusId
    };

    this.projectService.updateProject(this.projectToEdit.id, apiData).subscribe({
      next: (result) => {
        this.handleSuccess(result, 'Projet mis à jour avec succès!');
        this.projectUpdated.emit(result);
      },
      error: (err) => this.handleError(err)
    });
  }

  private handleSuccess(result: Project, message: string): void {
    this.isLoading = false;
    Swal.fire('Succès!', message, 'success');
    this.closeModal();
  }

  private handleError(error: any): void {
    this.isLoading = false;
    this.error = this.formatError(error);
    console.error('Erreur:', error);
  }

  private formatError(error: any): string {
    if (error.error?.message) {
      return Array.isArray(error.error.message) 
        ? error.error.message.join(', ') 
        : error.error.message;
    }
    
    switch (error.status) {
      case 0: return 'Impossible de contacter le serveur.';
      case 401: return 'Authentification requise.';
      case 403: return 'Accès interdit.';
      case 404: return 'Ressource non trouvée.';
      case 422: return 'Données invalides.';
      case 500: return 'Erreur serveur.';
      default: return `Erreur ${error.status || 'inconnue'}`;
    }
  }

  closeModal() {
    this.close.emit();
  }

  clearMessages() {
    this.error = null;
    this.warning = null;
  }
}