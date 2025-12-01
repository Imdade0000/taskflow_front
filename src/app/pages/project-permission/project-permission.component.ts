// components/project-permission/project-permission.component.ts
import { Component, OnInit } from '@angular/core';
import { ProjectPermissionService, CreateProjectPermissionDto, UpdateProjectPermissionDto } from '../../auth/services/project-permission.service';
import { ProjectPermission } from '../../auth/models/project-member.model';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-permission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-permission.component.html',
  styleUrls: ['./project-permission.component.css']
})
export class ProjectPermissionComponent implements OnInit {
  permissions: ProjectPermission[] = [];
  loading = false;
  showAddModal = false;
  showEditModal = false;
  selectedPermission: ProjectPermission | null = null;

  // Formulaires
  addPermissionForm: CreateProjectPermissionDto = {
    name: '',
    slug: '',
    description: ''
  };

  editPermissionForm: UpdateProjectPermissionDto = {
    name: '',
    slug: '',
    description: ''
  };

  constructor(private permissionService: ProjectPermissionService) {}

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.loading = true;
    this.permissionService.findAll().subscribe({
      next: (permissions: any) => {
        this.permissions = permissions;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des permissions:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger la liste des permissions'
        });
      }
    });
  }

  openAddModal() {
    this.addPermissionForm = { name: '', slug: '', description: '' };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  openEditModal(permission: ProjectPermission) {
    this.selectedPermission = permission;
    this.editPermissionForm = {
      name: permission.name,
      slug: permission.slug,
      description: permission.description || ''
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedPermission = null;
  }

  // Générer automatiquement le slug basé sur le nom
  generateSlug() {
    if (this.addPermissionForm.name) {
      this.addPermissionForm.slug = this.addPermissionForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
      
      // Préfixer avec "project." si ce n'est pas déjà fait
      if (!this.addPermissionForm.slug.startsWith('project.')) {
        this.addPermissionForm.slug = 'project.' + this.addPermissionForm.slug;
      }
    }
  }

  generateSlugForEdit() {
    if (this.editPermissionForm.name) {
      this.editPermissionForm.slug = this.editPermissionForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
      
      // Préfixer avec "project." si ce n'est pas déjà fait
      if (!this.editPermissionForm.slug?.startsWith('project.')) {
        this.editPermissionForm.slug = 'project.' + this.editPermissionForm.slug;
      }
    }
  }

  addPermission() {
    if (!this.addPermissionForm.name.trim() || !this.addPermissionForm.slug.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Le nom et le slug sont requis'
      });
      return;
    }

    // Validation du format du slug
    const slugPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
    if (!slugPattern.test(this.addPermissionForm.slug)) {
      Swal.fire({
        icon: 'warning',
        title: 'Format invalide',
        text: 'Le slug doit être au format point.notation (ex: project.tasks.manage)'
      });
      return;
    }

    this.permissionService.create(this.addPermissionForm).subscribe({
      next: (permission) => {
        this.permissions.push(permission);
        this.closeAddModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Permission créée avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Erreur lors de la création de la permission:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Impossible de créer la permission'
        });
      }
    });
  }

  updatePermission() {
    if (!this.selectedPermission || !this.editPermissionForm.name?.trim() || !this.editPermissionForm.slug?.trim()) {
      return;
    }

    // Validation du format du slug
    const slugPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
    if (!slugPattern.test(this.editPermissionForm.slug)) {
      Swal.fire({
        icon: 'warning',
        title: 'Format invalide',
        text: 'Le slug doit être au format point.notation (ex: project.tasks.manage)'
      });
      return;
    }

    this.permissionService.update(this.selectedPermission.id, this.editPermissionForm).subscribe({
      next: (updatedPermission: any) => {
        const index = this.permissions.findIndex(p => p.id === this.selectedPermission!.id);
        if (index !== -1) {
          this.permissions[index] = updatedPermission;
        }
        this.closeEditModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Permission mise à jour avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error: any) => {
        console.error('Erreur lors de la mise à jour de la permission:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Impossible de mettre à jour la permission'
        });
      }
    });
  }

  deletePermission(permission: ProjectPermission) {
    Swal.fire({
      title: 'Supprimer la permission',
      text: `Êtes-vous sûr de vouloir supprimer la permission "${permission.name}" ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.permissionService.delete(permission.id).subscribe({
          next: () => {
            this.permissions = this.permissions.filter(p => p.id !== permission.id);
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: 'Permission supprimée avec succès',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error: any) => {
            console.error('Erreur lors de la suppression:', error);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: error.error?.message || 'Impossible de supprimer la permission'
            });
          }
        });
      }
    });
  }

  seedDefaultPermissions() {
    Swal.fire({
      title: 'Initialiser les permissions par défaut',
      text: 'Cette action va créer les permissions de projet standard. Continuer ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, initialiser',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.permissionService.seedDefaultPermissions().subscribe({
          next: (response: any) => {
            this.loadPermissions(); // Recharger la liste
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: `${response.count} permissions par défaut initialisées`,
              timer: 3000,
              showConfirmButton: false
            });
          },
          error: (error: any) => {
            console.error('Erreur lors de l\'initialisation:', error);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Impossible d\'initialiser les permissions par défaut'
            });
          }
        });
      }
    });
  }

  // Grouper les permissions par domaine (basé sur le slug)
  getPermissionsByDomain(): { [domain: string]: ProjectPermission[] } {
    const grouped: { [domain: string]: ProjectPermission[] } = {};
    
    this.permissions.forEach(permission => {
      const parts = permission.slug.split('.');
      const domain = parts.length > 1 ? parts[0] : 'other';
      
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(permission);
    });
    
    return grouped;
  }

  getDomains(): string[] {
    return Object.keys(this.getPermissionsByDomain()).sort();
  }
}