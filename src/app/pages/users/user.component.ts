import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../auth/services/user.service';
import { User, CreateUserDto, UpdateUserDto, Role, Department } from '../../auth/models/user.models';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  departments: Department[] = [];

  Math = Math;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Search and filters
  searchQuery = '';
  isSearching = false;
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Loading states
  isLoading = false;
  isSubmitting = false;

  // Modal states
  isCreateModalOpen = false;
  isEditModalOpen = false;
  selectedUser: User | null = null;

  // Forms
  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.createForm = this.initializeCreateForm();
    this.editForm = this.initializeEditForm();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadDepartments();
  }

  private initializeCreateForm(): FormGroup {
    return this.fb.group({
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/)
      ]],
      roleId: ['', Validators.required],
      departementId: [''],
      twoFactorEnabled: [true],
      isActive: [true]
    });
  }

  private initializeEditForm(): FormGroup {
    return this.fb.group({
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/)
      ]],
      roleId: ['', Validators.required],
      departementId: [''],
      twoFactorEnabled: [true],
      isActive: [true]
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    
    // Déterminer le paramètre de statut à envoyer à l'API
    let statusParam: boolean | undefined;
    if (this.statusFilter === 'active') {
      statusParam = true;
    } else if (this.statusFilter === 'inactive') {
      statusParam = false;
    }
    // Pour 'all', on envoie undefined pour récupérer tous les utilisateurs

    this.userService.getUsers(this.currentPage, this.itemsPerPage, statusParam).subscribe({
      next: (response) => {
        this.users = response.data;
        this.totalItems = response.meta.total;
        this.totalPages = response.meta.lastPage;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.isLoading = false;
        Swal.fire('Erreur', 'Impossible de charger les utilisateurs', 'error');
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles = roles,
      error: (error) => console.error('Erreur lors du chargement des rôles:', error)
    });
  }

  loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => this.departments = departments,
      error: (error) => console.error('Erreur lors du chargement des départements:', error)
    });
  }

  searchUsers(): void {
    if (!this.searchQuery.trim() && this.statusFilter === 'all') {
      this.isSearching = false;
      this.currentPage = 1;
      this.loadUsers();
      return;
    }

    this.isSearching = true;
    this.isLoading = true;
    
    // Déterminer le paramètre de statut pour la recherche
    let statusParam: boolean | undefined;
    if (this.statusFilter === 'active') {
      statusParam = true;
    } else if (this.statusFilter === 'inactive') {
      statusParam = false;
    }

    this.userService.searchUsers(this.searchQuery.trim(), this.currentPage, this.itemsPerPage, statusParam).subscribe({
      next: (response) => {
        this.users = response.data;
        this.totalItems = response.meta.total;
        this.totalPages = response.meta.lastPage;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche:', error);
        this.isLoading = false;
        Swal.fire('Erreur', 'Erreur lors de la recherche', 'error');
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.isSearching = false;
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    if (this.searchQuery.trim()) {
      this.searchUsers();
    } else {
      this.loadUsers();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    if (this.isSearching || this.searchQuery.trim() || this.statusFilter !== 'all') {
      this.searchUsers();
    } else {
      this.loadUsers();
    }
  }

  openCreateModal(): void {
    this.createForm.reset();
    this.createForm.patchValue({
      twoFactorEnabled: true,
      isActive: true
    });
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.createForm.reset();
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.editForm.patchValue({
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      roleId: user.roleId,
      departementId: user.departementId || '',
      twoFactorEnabled: user.twoFactorEnabled,
      isActive: user.isActive
    });
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.editForm.reset();
  }

  createUser(): void {
    if (this.createForm.invalid) {
      this.markFormGroupTouched(this.createForm);
      return;
    }

    this.isSubmitting = true;
    const userData: CreateUserDto = this.createForm.value;

    this.userService.createUser(userData).subscribe({
      next: (user) => {
        this.isSubmitting = false;
        this.closeCreateModal();
        this.loadUsers();
        Swal.fire({
          title: 'Succès!',
          text: 'Utilisateur créé avec succès',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        const errorMessage = error.error?.message || 'Erreur lors de la création de l\'utilisateur';
        Swal.fire('Erreur', errorMessage, 'error');
      }
    });
  }

  updateUser(): void {
    if (this.editForm.invalid || !this.selectedUser) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    this.isSubmitting = true;
    const userData: UpdateUserDto = { ...this.editForm.value };
    
    // Supprimer le mot de passe s'il est vide
    if (!userData.password) {
      delete userData.password;
    }

    this.userService.updateUser(this.selectedUser.id, userData).subscribe({
      next: (user) => {
        this.isSubmitting = false;
        this.closeEditModal();
        this.loadUsers();
        Swal.fire({
          title: 'Succès!',
          text: 'Utilisateur modifié avec succès',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        const errorMessage = error.error?.message || 'Erreur lors de la modification de l\'utilisateur';
        Swal.fire('Erreur', errorMessage, 'error');
      }
    });
  }

  deleteUser(user: User): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous supprimer l'utilisateur ${user.firstname} ${user.lastname}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.loadUsers();
            Swal.fire({
              title: 'Supprimé!',
              text: 'L\'utilisateur a été supprimé avec succès',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            const errorMessage = error.error?.message || 'Erreur lors de la suppression';
            Swal.fire('Erreur', errorMessage, 'error');
          }
        });
      }
    });
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'désactiver' : 'activer';
    const status = user.isActive ? 'désactivé' : 'activé';

    Swal.fire({
      title: 'Confirmation',
      text: `Voulez-vous ${action} l'utilisateur ${user.firstname} ${user.lastname}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Oui, ${action}`,
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.toggleUserActive(user.id, !user.isActive).subscribe({
          next: () => {
            // Mettre à jour localement l'utilisateur
            user.isActive = !user.isActive;
            Swal.fire({
              title: 'Succès!',
              text: `L'utilisateur a été ${status} avec succès`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            const errorMessage = error.error?.message || `Erreur lors de la modification du statut`;
            Swal.fire('Erreur', errorMessage, 'error');
          }
        });
      }
    });
  }

  toggleTwoFactor(user: User): void {
    // Ne pas permettre la modification du 2FA pour les utilisateurs inactifs
    if (!user.isActive) {
      Swal.fire('Information', 'Impossible de modifier l\'authentification à deux facteurs pour un utilisateur inactif', 'info');
      return;
    }

    const action = user.twoFactorEnabled ? 'désactiver' : 'activer';
    
    Swal.fire({
      title: 'Confirmation',
      text: `Voulez-vous ${action} l'authentification à deux facteurs pour ${user.firstname} ${user.lastname}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Oui, ${action}`,
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.configureTwoFactor(user.id, !user.twoFactorEnabled).subscribe({
          next: () => {
            // Mettre à jour localement l'utilisateur
            user.twoFactorEnabled = !user.twoFactorEnabled;
            Swal.fire({
              title: 'Succès!',
              text: `L'authentification à deux facteurs a été ${user.twoFactorEnabled ? 'activée' : 'désactivée'}`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            const errorMessage = error.error?.message || 'Erreur lors de la modification du 2FA';
            Swal.fire('Erreur', errorMessage, 'error');
          }
        });
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} est requis`;
      if (field.errors['email']) return 'Format d\'email invalide';
      if (field.errors['minlength']) return `${fieldName} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `${fieldName} ne peut pas dépasser ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['pattern']) return 'Format invalide';
    }
    return '';
  }

  getRoleName(roleId: string): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.name : 'Non défini';
  }

  getDepartmentName(departmentId: string | undefined): string {
    if (!departmentId) return 'Non défini';
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.name : 'Non défini';
  }

  getStatusFilterLabel(): string {
    switch (this.statusFilter) {
      case 'active': return 'Utilisateurs actifs';
      case 'inactive': return 'Utilisateurs inactifs';
      default: return 'Tous les utilisateurs';
    }
  }

  getEmptyStateMessage(): string {
    if (this.statusFilter === 'active') {
      return 'Aucun utilisateur actif trouvé.';
    } else if (this.statusFilter === 'inactive') {
      return 'Aucun utilisateur inactif trouvé.';
    } else if (this.searchQuery.trim()) {
      return 'Aucun utilisateur ne correspond à votre recherche.';
    }
    return 'Commencez par créer un nouvel utilisateur.';
  }
}