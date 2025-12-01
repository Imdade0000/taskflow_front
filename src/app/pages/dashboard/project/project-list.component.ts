import { Component, OnInit, HostListener } from '@angular/core';
import { ProjectService } from '../../../auth/services/project.service';
import { Project } from '../../../auth/models/project.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { ProjectFormModalComponent } from '../../../shared/components/project-form-modal/project-form-modal.component';
import { FormsModule } from '@angular/forms';
import { ProjectStatus } from '../../../auth/models/project.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectFormModalComponent, FormsModule],
  templateUrl: './project-list.component.html',
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  displayedProjects: Project[] = [];
  isLoading = true;
  error = '';
  showCreateModal = false;
  showEditModal = false;
  currentUserId: string = '';
  selectedProject?: Project;
  projectToDelete: string | null = null;
  dropdownOpen: string | null = null;
  
  // Filtres
  searchTerm = '';
  selectedStatus = '';
  isArchivedFilter: boolean | undefined = false;
  statuses: ProjectStatus[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  pageSizeOptions = [5, 10, 25, 50];

  // Exposer Math pour le template
  Math = Math;

  constructor(
    private projectService: ProjectService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadStatuses();
    this.getCurrentUserId();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.dropdownOpen = null;
    }
  }

  toggleDropdown(projectId: string): void {
    this.dropdownOpen = this.dropdownOpen === projectId ? null : projectId;
  }

  closeDropdown(): void {
    this.dropdownOpen = null;
  }

  private getCurrentUserId(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.sub) {
      this.currentUserId = currentUser.sub;
    } else if (currentUser?.id) {
      this.currentUserId = currentUser.id;
    } else {
      console.error('Aucun utilisateur connecté trouvé');
      this.error = 'Utilisateur non authentifié. Veuillez vous reconnecter.';
    }
  }

  loadStatuses(): void {
    this.projectService.getStatuses().subscribe({
      next: (statuses) => {
        this.statuses = statuses;
        if (statuses.length === 0) {
          this.statuses = this.getDefaultStatuses();
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statuts', err);
        this.statuses = this.getDefaultStatuses();
      }
    });
  }

  private getDefaultStatuses(): ProjectStatus[] {
    return [
      { id: '1', name: 'Actif', color: '#fff'},
      { id: '2', name: 'En attente', color: '#fbbf24' },
      { id: '3', name: 'En cours', color: '#3b82f6' },
      { id: '4', name: 'Terminé', color: '#10b981' },
      { id: '5', name: 'Suspendu', color: '#ef4444' }
    ];
  }

  loadProjects(): void {
    this.isLoading = true;
    const filters = {
      search: this.searchTerm || undefined,
      statusId: this.selectedStatus || undefined,
      isArchived: this.isArchivedFilter,
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    this.projectService.getProjects(filters).subscribe({
      next: (response: any) => {
        if (response.data && response.pagination) {
          this.projects = response.data;
          this.displayedProjects = response.data;
          this.totalItems = response.pagination.totalItems;
          this.totalPages = response.pagination.totalPages;
          this.currentPage = response.pagination.currentPage;
        } else {
          this.projects = response;
          this.totalItems = response.length;
          this.totalPages = Math.ceil(response.length / this.itemsPerPage);
          this.updateDisplayedProjects();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Full error:', err);
        this.error = err.status === 404 
          ? 'Endpoint non trouvé - Vérifiez la configuration du serveur' 
          : 'Erreur lors du chargement des projets';
        this.isLoading = false;
      }
    });
  }

  private updateDisplayedProjects(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedProjects = this.projects.slice(startIndex, endIndex);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadProjects();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.isArchivedFilter = false;
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.applyFilters();
  }

  openCreateModal(): void {
    if (!this.currentUserId) {
      this.error = 'Vous devez être connecté pour créer un projet.';
      return;
    }
    this.showCreateModal = true;
  }

  openEditModal(project: Project): void {
    this.selectedProject = project;
    this.showEditModal = true;
  }

  onProjectCreated(newProject: Project): void {
    this.showCreateModal = false;
    this.loadProjects();
    Swal.fire({
      title: 'Succès!',
      text: 'Le projet a été créé avec succès',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  onProjectUpdated(updatedProject: Project): void {
    this.showEditModal = false;
    this.loadProjects();
    Swal.fire({
      title: 'Succès!',
      text: 'Le projet a été modifié avec succès',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  archiveProject(projectId: string): void {
    Swal.fire({
      title: 'Archiver le projet',
      text: 'Êtes-vous sûr de vouloir archiver ce projet ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, archiver',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
          project.isArchived = true;
          this.projectService.archiveProject(projectId).subscribe({
            next: () => {
              this.loadProjects();
              Swal.fire(
                'Archivé!',
                'Le projet a été archivé.',
                'success'
              );
            },
            error: (err) => {
              if (project) project.isArchived = false;
              console.error(err);
              Swal.fire(
                'Erreur!',
                'Une erreur est survenue lors de l\'archivage.',
                'error'
              );
            }
          });
        }
      }
    });
  }

  restoreProject(projectId: string): void {
    this.projectService.restoreProject(projectId).subscribe({
      next: () => {
        this.loadProjects();
        Swal.fire(
          'Restauré!',
          'Le projet a été restauré.',
          'success'
        );
      },
      error: (err) => {
        console.error(err);
        Swal.fire(
          'Erreur!',
          'Une erreur est survenue lors de la restauration.',
          'error'
        );
      }
    });
  }

  confirmDelete(projectId: string): void {
    Swal.fire({
      title: 'Supprimer le projet',
      text: 'Êtes-vous sûr de vouloir supprimer définitivement ce projet ? Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.projectService.deleteProject(projectId).subscribe({
          next: () => {
            this.loadProjects();
            Swal.fire(
              'Supprimé!',
              'Le projet a été supprimé.',
              'success'
            );
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              'Erreur!',
              'Une erreur est survenue lors de la suppression.',
              'error'
            );
          }
        });
      }
    });
  }

  // Méthodes de pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProjects();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProjects();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProjects();
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.loadProjects();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}