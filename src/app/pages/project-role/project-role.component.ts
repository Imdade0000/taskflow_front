// components/project-role/project-role.component.ts
import { Component, OnInit } from '@angular/core';
import { ProjectRoleService, CreateProjectRoleDto, UpdateProjectRoleDto } from '../../auth/services/project-role.service';
import { ProjectPermissionService } from '../../auth/services/project-permission.service';
import { ProjectRole, ProjectPermission } from '../../auth/models/project-member.model';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-role.component.html',
  styleUrls: ['./project-role.component.css']
})
export class ProjectRoleComponent implements OnInit {
  roles: ProjectRole[] = [];
  permissions: ProjectPermission[] = [];
  loading = false;
  showAddModal = false;
  showEditModal = false;
  showPermissionsModal = false;
  selectedRole: ProjectRole | null = null;

  // Formulaires
  addRoleForm: CreateProjectRoleDto = {
    name: '',
    description: ''
  };

  editRoleForm: UpdateProjectRoleDto = {
    name: '',
    description: ''
  };

  // Permissions sélectionnées pour un rôle
  selectedPermissions: string[] = [];

  constructor(
    private roleService: ProjectRoleService,
    private permissionService: ProjectPermissionService
  ) {}

  ngOnInit() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.loading = true;
    this.roleService.findAll().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger la liste des rôles'
        });
      }
    });
  }

  loadPermissions() {
    this.permissionService.findAll().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
      }
    });
  }

  openAddModal() {
    this.addRoleForm = { name: '', description: '' };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  openEditModal(role: ProjectRole) {
    this.selectedRole = role;
    this.editRoleForm = {
      name: role.name,
      description: role.description || ''
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedRole = null;
  }

  openPermissionsModal(role: ProjectRole) {
    this.selectedRole = role;
    this.selectedPermissions = role.projectsRolePermissions?.map(rp => rp.projectPermission.id) || [];
    this.showPermissionsModal = true;
  }

  closePermissionsModal() {
    this.showPermissionsModal = false;
    this.selectedRole = null;
    this.selectedPermissions = [];
  }

  addRole() {
    if (!this.addRoleForm.name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Le nom du rôle est requis'
      });
      return;
    }

    this.roleService.create(this.addRoleForm).subscribe({
      next: (role) => {
        this.roles.push(role);
        this.closeAddModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Rôle créé avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Erreur lors de la création du rôle:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Impossible de créer le rôle'
        });
      }
    });
  }

  updateRole() {
    if (!this.selectedRole || !this.editRoleForm.name?.trim()) {
      return;
    }

    this.roleService.update(this.selectedRole.id, this.editRoleForm).subscribe({
      next: (updatedRole) => {
        const index = this.roles.findIndex(r => r.id === this.selectedRole!.id);
        if (index !== -1) {
          this.roles[index] = updatedRole;
        }
        this.closeEditModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Rôle mis à jour avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du rôle:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Impossible de mettre à jour le rôle'
        });
      }
    });
  }

  deleteRole(role: ProjectRole) {
    Swal.fire({
      title: 'Supprimer le rôle',
      text: `Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.roleService.delete(role.id).subscribe({
          next: () => {
            this.roles = this.roles.filter(r => r.id !== role.id);
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: 'Rôle supprimé avec succès',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: error.error?.message || 'Impossible de supprimer le rôle'
            });
          }
        });
      }
    });
  }

  togglePermission(permissionId: string) {
    const index = this.selectedPermissions.indexOf(permissionId);
    if (index > -1) {
      this.selectedPermissions.splice(index, 1);
    } else {
      this.selectedPermissions.push(permissionId);
    }
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.includes(permissionId);
  }

  syncPermissions() {
    if (!this.selectedRole) return;

    this.roleService.syncPermissions(this.selectedRole.id, {
      projectPermissionIds: this.selectedPermissions
    }).subscribe({
      next: () => {
        // Recharger les rôles pour avoir les permissions à jour
        this.loadRoles();
        this.closePermissionsModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Permissions mises à jour avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Erreur lors de la synchronisation des permissions:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de mettre à jour les permissions'
        });
      }
    });
  }

  getPermissionCount(role: ProjectRole): number {
    return role.projectsRolePermissions?.length || 0;
  }

  getMemberCount(role: ProjectRole): number {
    return (role as any)._count?.members || 0;
  }
}