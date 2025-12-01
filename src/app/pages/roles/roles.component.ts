import { Component, OnInit } from '@angular/core';
import { RolesService, Role, CreateRoleDto, UpdateRoleDto, Permission } from '../../auth/services/roles.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class RolesComponent implements OnInit {
  roles$: Observable<Role[]>;
  roles: Role[] = [];

  readonly Math = Math;
  
  // États de l'interface
  isLoading = false;
  isCreateModalOpen = false;
  isEditModalOpen = false;
  isPermissionsModalOpen = false;
  isSubmitting = false;
  
  // Formulaires
  createForm: CreateRoleDto = { name: '', description: '', hasAllPermissions: false };
  editForm: UpdateRoleDto = { name: '', description: '' };
  selectedRole: Role | null = null;
  
  // Modal des permissions
  selectedRoleForPermissions: Role | null = null;
  allPermissions: Permission[] = [];
  isLoadingPermissions = false;
  
  // Recherche et pagination
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 25, 50];

  constructor(private rolesService: RolesService) {
    this.roles$ = this.rolesService.roles$;
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadAllPermissions();
  }

  loadAllPermissions(): void {
    this.rolesService.getAllPermissions().subscribe({
      next: (permissions: Permission[]) => {
        this.allPermissions = permissions;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des permissions:', error);
      }
    });
  }

  loadRoles(): void {
    this.isLoading = true;
    this.rolesService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.isLoading = false;
        this.currentPage = 1; // Reset à la première page après chargement
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors du chargement des rôles',
          confirmButtonColor: '#3B82F6'
        });
        this.isLoading = false;
      }
    });
  }

  // Gestion du modal de création
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.resetCreateForm();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.createForm = { name: '', description: '', hasAllPermissions: false };
  }

  // Gestion du modal d'édition
  openEditModal(role: Role): void {
    this.selectedRole = role;
    this.editForm = {
      name: role.name,
      description: role.description || '',
      hasAllPermissions: role.hasAllPermissions
    };
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedRole = null;
  }

  // Gestion du modal de suppression avec SweetAlert
  openDeleteModal(role: Role): void {
    Swal.fire({
      title: 'Confirmer la suppression',
      text: `Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.rolesService.deleteRole(role.id).toPromise()
          .then(() => {
            return { success: true };
          })
          .catch((error) => {
            Swal.showValidationMessage(`Erreur: ${error.message || 'Erreur lors de la suppression'}`);
            return { success: false };
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Supprimé !',
          text: 'Le rôle a été supprimé avec succès.',
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        });
        this.loadRoles();
      }
    });
  }

  // Gestion du modal des permissions
  openPermissionsModal(role: Role): void {
    this.isLoadingPermissions = true;
    // Recharger les détails du rôle avec ses permissions
    this.rolesService.getRoleById(role.id).subscribe({
      next: (roleDetails) => {
        this.selectedRoleForPermissions = roleDetails;
        this.isPermissionsModalOpen = true;
        this.isLoadingPermissions = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors du chargement des permissions',
          confirmButtonColor: '#3B82F6'
        });
        this.isLoadingPermissions = false;
      }
    });
  }

  closePermissionsModal(): void {
    this.isPermissionsModalOpen = false;
    this.selectedRoleForPermissions = null;
  }

  // Actions CRUD
  createRole(): void {
    if (this.createForm.name.trim()) {
      this.isSubmitting = true;
      this.rolesService.createRole(this.createForm).subscribe({
        next: (role) => {
          Swal.fire({
            icon: 'success',
            title: 'Rôle créé !',
            text: 'Le rôle a été créé avec succès.',
            confirmButtonColor: '#3B82F6',
            timer: 2000,
            timerProgressBar: true
          });
          this.closeCreateModal();
          this.loadRoles();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Erreur lors de la création du rôle',
            confirmButtonColor: '#3B82F6'
          });
          console.error('Erreur:', error);
        },
        complete: () => this.isSubmitting = false
      });
    }
  }

  updateRole(): void {
    if (this.selectedRole && this.editForm.name?.trim()) {
      this.isSubmitting = true;
      this.rolesService.updateRole(this.selectedRole.id, this.editForm).subscribe({
        next: (role) => {
          Swal.fire({
            icon: 'success',
            title: 'Rôle modifié !',
            text: 'Le rôle a été mis à jour avec succès.',
            confirmButtonColor: '#3B82F6',
            timer: 2000,
            timerProgressBar: true
          });
          this.closeEditModal();
          this.loadRoles();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Erreur lors de la mise à jour du rôle',
            confirmButtonColor: '#3B82F6'
          });
          console.error('Erreur:', error);
        },
        complete: () => this.isSubmitting = false
      });
    }
  }

  // Gestion des permissions avec confirmation
  toggleAllPermissions(role: Role): void {
    const newValue = !role.hasAllPermissions;
    const actionText = newValue ? 'accorder toutes les permissions' : 'retirer toutes les permissions';
    
    Swal.fire({
      title: 'Modifier les permissions',
      text: `Êtes-vous sûr de vouloir ${actionText} à ce rôle ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, continuer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Optimistic UI update
        const originalValue = role.hasAllPermissions;
        role.hasAllPermissions = newValue;

        return this.rolesService.setHasAllPermissions(role.id, newValue).toPromise()
          .then((updatedRole) => {
            // Mettre à jour le rôle dans la liste
            const index = this.roles.findIndex(r => r.id === role.id);
            if (index !== -1) {
              this.roles[index] = { ...this.roles[index], ...updatedRole };
            }
            return { success: true };
          })
          .catch((error) => {
            // Revert on error
            role.hasAllPermissions = originalValue;
            
            // Si c'est une erreur 403, rediriger ou rafraîchir
            if (error.originalError?.status === 403) {
              this.loadRoles();
            }
            
            Swal.showValidationMessage(`Erreur: ${error.message || 'Erreur de mise à jour des permissions'}`);
            return { success: false };
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Permissions mises à jour !',
          text: 'Les permissions ont été modifiées avec succès.',
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        });
      }
    });
  }

  // Utilitaires
  get filteredRoles(): Role[] {
    if (!this.searchTerm) {
      return this.roles;
    }
    return this.roles.filter(role =>
      role.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }

  get paginatedRoles(): Role[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredRoles.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRoles.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changePageSize(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1; // Reset à la première page
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

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPermissionCount(role: Role): number {
    if (role.hasAllPermissions) {
      return 0; // Ou retourner le nombre total de permissions disponibles dans le système
    }
    return role.permissions?.length || 0;
  }

  getPermissionCountDisplay(role: Role): string {
    if (role.hasAllPermissions) {
      return 'Toutes les permissions';
    }
    const count = role.permissions?.length || 0;
    return `${count} permission${count > 1 ? 's' : ''}`;
  }

  get isAnyModalOpen(): boolean {
    return this.isCreateModalOpen || this.isEditModalOpen || this.isPermissionsModalOpen;
  }

  // Méthode helper pour la gestion sécurisée des permissions
  hasPermissions(role: Role | null): boolean {
    return role?.permissions?.length ? role.permissions.length > 0 : false;
  }

  getPermissionsArray(role: Role | null): any[] {
    return role?.permissions || [];
  }

  // Vérifier si une permission est assignée au rôle - CORRIGÉ
  isPermissionAssigned(permissionId: string): boolean {
    if (!this.selectedRoleForPermissions?.permissions) {
      return false;
    }
    return this.selectedRoleForPermissions.permissions.some(
      rolePermission => rolePermission.permission.id === permissionId
    );
  }

  // Toggle d'une permission individuelle
  togglePermission(permission: Permission): void {
    if (!this.selectedRoleForPermissions) return;

    const isAssigned = this.isPermissionAssigned(permission.id);
    const action = isAssigned ? 'retirer' : 'assigner';
    
    Swal.fire({
      title: `${isAssigned ? 'Retirer' : 'Assigner'} la permission`,
      text: `Voulez-vous ${action} la permission "${permission.name}" à ce rôle ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, continuer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        if (isAssigned) {
          // Retirer la permission
          return this.rolesService.removePermissionFromRole(this.selectedRoleForPermissions!.id, permission.id).toPromise()
            .then((updatedRole) => {
              this.selectedRoleForPermissions = updatedRole || null;
              return { success: true, action: 'removed' };
            })
            .catch((error) => {
              Swal.showValidationMessage(`Erreur: ${error.message || 'Erreur lors de la suppression de la permission'}`);
              return { success: false };
            });
        } else {
          // Ajouter la permission
          return this.rolesService.addPermissionToRole(this.selectedRoleForPermissions!.id, permission.id).toPromise()
            .then((updatedRole) => {
              this.selectedRoleForPermissions = updatedRole || null;
              return { success: true, action: 'added' };
            })
            .catch((error) => {
              Swal.showValidationMessage(`Erreur: ${error.message || 'Erreur lors de l\'ajout de la permission'}`);
              return { success: false };
            });
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value?.success) {
        const actionText = result.value.action === 'added' ? 'ajoutée' : 'supprimée';
        Swal.fire({
          icon: 'success',
          title: 'Permission mise à jour !',
          text: `La permission a été ${actionText} avec succès.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        });
        // Mettre à jour la liste des rôles
        this.loadRoles();
      }
    });
  }

  // Toggle toutes les permissions dans le modal
  toggleAllPermissionsInModal(): void {
    if (!this.selectedRoleForPermissions) return;

    const newValue = !this.selectedRoleForPermissions.hasAllPermissions;
    const actionText = newValue ? 'accorder toutes les permissions' : 'retirer toutes les permissions';
    
    Swal.fire({
      title: 'Modifier les permissions',
      text: `Êtes-vous sûr de vouloir ${actionText} à ce rôle ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, continuer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.rolesService.setHasAllPermissions(this.selectedRoleForPermissions!.id, newValue).toPromise()
          .then((updatedRole) => {
            this.selectedRoleForPermissions = updatedRole || null;
            return { success: true };
          })
          .catch((error) => {
            Swal.showValidationMessage(`Erreur: ${error.message || 'Erreur de mise à jour des permissions'}`);
            return { success: false };
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed && result.value?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Permissions mises à jour !',
          text: 'Les permissions ont été modifiées avec succès.',
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        });
        // Mettre à jour la liste des rôles
        this.loadRoles();
      }
    });
  }
}