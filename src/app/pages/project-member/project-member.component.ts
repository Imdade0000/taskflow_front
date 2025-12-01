// components/project-member/project-member.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectMemberService } from '../../auth/services/project-member.service';
import { ProjectRoleService } from '../../auth/services/project-role.service';
import { 
  ProjectMember, 
  CreateProjectMemberDto, 
  UpdateProjectMemberRoleDto,
  ProjectRole,
  User
} from '../../auth/models/project-member.model';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../auth/services/user.service';

@Component({
  selector: 'app-project-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-member.component.html',
  styleUrls: ['./project-member.component.css']
})
export class ProjectMemberComponent implements OnInit {
  @Input() projectId?: string;

  members: ProjectMember[] = [];
  projectRoles: ProjectRole[] = [];
  availableUsers: User[] = [];
  loading = false;
  showAddModal = false;
  showEditModal = false;
  selectedMember: ProjectMember | null = null;
  
  // Nouveau: mode de sélection de projet
  showProjectSelection = false;
  availableProjects: any[] = []; // Vous devrez typer ceci selon votre modèle de projet

  // Formulaires
  addMemberForm = {
    userId: '',
    projectRoleId: ''
  };

  editMemberForm = {
    projectRoleId: ''
  };

  constructor(
    private memberService: ProjectMemberService,
    private roleService: ProjectRoleService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('ProjectMemberComponent initialized');
    console.log('Input projectId:', this.projectId);
    
    // Essayer de récupérer l'ID du projet depuis l'Input ou la route
    this.initializeProjectId();
  }

  private initializeProjectId() {
    // Si projectId est passé en Input, l'utiliser
    if (this.projectId && this.projectId !== 'undefined') {
      console.log('Using projectId from Input:', this.projectId);
      this.loadData();
      return;
    }

    // Sinon, essayer de le récupérer depuis les paramètres de route
    this.route.params.subscribe(params => {
      console.log('Route params:', params);
      
      if (params['projectId'] && params['projectId'] !== 'undefined') {
        this.projectId = params['projectId'];
        console.log('Using projectId from route params:', this.projectId);
        this.loadData();
      } else if (params['id'] && params['id'] !== 'undefined') {
        this.projectId = params['id'];
        console.log('Using projectId from route id:', this.projectId);
        this.loadData();
      } else {
        // Si aucun projectId n'est trouvé, activer le mode sélection
        console.warn('⚠️ Aucun projectId spécifique trouvé. Mode sélection de projet activé.');
        this.showProjectSelectionMode();
      }
    });

    // Essayer aussi les query params
    this.route.queryParams.subscribe(queryParams => {
      console.log('Query params:', queryParams);
      if (queryParams['projectId'] && !this.projectId) {
        this.projectId = queryParams['projectId'];
        console.log('Using projectId from query params:', this.projectId);
        this.loadData();
      }
    });
  }

  // Nouvelle méthode pour gérer le mode sans projectId spécifique
  private showProjectSelectionMode() {
    this.showProjectSelection = true;
    this.loadProjectRoles();
    this.loadAvailableUsers();
     // Charger les rôles même sans projet spécifique
    // TODO: Charger la liste des projets disponibles
    // this.loadAvailableProjects();
    
    console.log('Mode sélection de projet activé');
  }

  // Nouvelle méthode pour sélectionner un projet
  selectProject(projectId: string) {
    this.projectId = projectId;
    this.showProjectSelection = false;
    console.log('Projet sélectionné:', projectId);
    this.loadData();
  }

  // Nouvelle méthode pour revenir au mode sélection
  backToProjectSelection() {
    this.projectId = undefined;
    this.members = [];
    this.showProjectSelection = true;
    this.closeAddModal();
    this.closeEditModal();
  }

  private loadData() {
    if (!this.projectId || this.projectId === 'undefined') {
      console.error('❌ Tentative de chargement avec projectId invalide:', this.projectId);
      return;
    }

    console.log('🔄 Chargement des données pour le projet:', this.projectId);
    this.loadMembers();
    this.loadProjectRoles();
    this.loadAvailableUsers();
    // TODO: Charger les utilisateurs disponibles
  }

  loadMembers() {
    if (!this.projectId || this.projectId === 'undefined') {
      console.error('❌ loadMembers: projectId invalide:', this.projectId);
      return;
    }

    console.log('🔄 Chargement des membres pour le projet:', this.projectId);
    this.loading = true;
    
    this.memberService.listMembers(this.projectId).subscribe({
      next: (members) => {
        console.log('✅ Membres chargés:', members);
        this.members = members;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des membres:', error);
        console.error('URL appelée:', `/api/projects/${this.projectId}/members`);
        this.loading = false;
        
        let errorMessage = 'Impossible de charger la liste des membres';
        if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour voir les membres de ce projet';
        } else if (error.status === 404) {
          errorMessage = 'Projet non trouvé';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage
        });
      }
    });
  }

  loadProjectRoles() {
    console.log('🔄 Chargement des rôles de projet');
    
    this.roleService.findAll().subscribe({
      next: (roles) => {
        console.log('✅ Rôles chargés:', roles);
        this.projectRoles = roles;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des rôles:', error);
        
        let errorMessage = 'Impossible de charger les rôles';
        if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour voir les rôles';
        }
        
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: errorMessage
        });
      }
    });
  }

   loadAvailableUsers() {
    console.log('🔄 Chargement des utilisateurs disponibles');
    
    // Utiliser la méthode getUsers avec pagination (récupérer tous les utilisateurs)
    this.userService.getUsers(1, 1000).subscribe({
      next: (response) => {
        console.log('✅ Réponse utilisateurs:', response);
        // Votre UserService retourne une PaginatedResponse<User>
        this.availableUsers = response.data || response.data || [];
        console.log('✅ Utilisateurs disponibles:', this.availableUsers);
        console.log('📊 Nombre d\'utilisateurs chargés:', this.availableUsers.length);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        console.error('📄 Détails de l\'erreur:', error.message);
        console.error('🔢 Status code:', error.status);
        
        let errorMessage = 'Impossible de charger les utilisateurs';
        if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour voir les utilisateurs';
        } else if (error.status === 404) {
          errorMessage = 'Endpoint utilisateurs non trouvé';
        }
        
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: errorMessage
        });
        
        // Fallback: tableau vide
        this.availableUsers = [];
      }
    });
  }


  loadAvailableUsersFiltered() {
    console.log('🔄 Chargement des utilisateurs disponibles (filtrés)');
    
    this.userService.getUsers(1, 1000).subscribe({
      next: (response) => {
        const allUsers = response.data || response.data || [];
        
        // Filtrer les utilisateurs qui ne sont pas déjà membres du projet
        if (this.members && this.members.length > 0) {
          const memberUserIds = this.members.map(member => member.userId);
          this.availableUsers = allUsers.filter(user => !memberUserIds.includes(user.id));
          console.log('✅ Utilisateurs filtrés (non-membres):', this.availableUsers.length);
        } else {
          this.availableUsers = allUsers;
          console.log('✅ Tous les utilisateurs disponibles:', this.availableUsers.length);
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs filtrés:', error);
        this.availableUsers = [];
      }
    });
  }


  openAddModal() {
  if (!this.projectId || this.projectId === 'undefined') {
    console.warn('⚠️ openAddModal: Aucun projet sélectionné');
    Swal.fire({
      icon: 'warning',
      title: 'Aucun projet sélectionné',
      text: 'Veuillez d\'abord sélectionner un projet pour ajouter des membres.',
      showCancelButton: true,
      confirmButtonText: 'Aller aux projets',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirection vers la liste des projets
        this.router.navigate(['/dashboard/projects']);
      }
    });
    return;
  }
  
  this.loadAvailableUsersFiltered();

  this.addMemberForm = { userId: '', projectRoleId: '' };
  this.showAddModal = true;
}

  closeAddModal() {
    this.showAddModal = false;
  }

 openEditModal(member: ProjectMember) {
  if (!this.projectId || this.projectId === 'undefined') {
    console.warn('⚠️ openEditModal: Aucun projet sélectionné');
    Swal.fire({
      icon: 'warning',
      title: 'Aucun projet sélectionné',
      text: 'Veuillez d\'abord sélectionner un projet.',
      showCancelButton: true,
      confirmButtonText: 'Aller aux projets',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/dashboard/projects']);
      }
    });
    return;
  }
  
  this.selectedMember = member;
  this.editMemberForm.projectRoleId = member.projectRoleId;
  this.showEditModal = true;
}

  closeEditModal() {
    this.showEditModal = false;
    this.selectedMember = null;
  }

  addMember() {
    if (!this.projectId || this.projectId === 'undefined') {
      console.error('❌ addMember: projectId invalide');
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Aucun projet sélectionné'
      });
      return;
    }

    if (!this.addMemberForm.userId || !this.addMemberForm.projectRoleId) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez remplir tous les champs requis'
      });
      return;
    }

    const dto: CreateProjectMemberDto = {
      userId: this.addMemberForm.userId,
      projectRoleId: this.addMemberForm.projectRoleId
    };

    console.log('➕ Ajout d\'un membre:', dto, 'au projet:', this.projectId);

    this.memberService.addMember(this.projectId, dto).subscribe({
      next: (member) => {
        console.log('✅ Membre ajouté:', member);
        this.members.push(member);
        this.closeAddModal();

        this.loadAvailableUsersFiltered();

        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Membre ajouté avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'ajout du membre:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Impossible d\'ajouter le membre'
        });
      }
    });
  }

  updateMemberRole() {
    if (!this.projectId || this.projectId === 'undefined') {
      console.error('❌ updateMemberRole: projectId invalide');
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Aucun projet sélectionné'
      });
      return;
    }

    if (!this.selectedMember || !this.editMemberForm.projectRoleId) {
      return;
    }

    const dto: UpdateProjectMemberRoleDto = {
      projectRoleId: this.editMemberForm.projectRoleId
    };

    console.log('🔄 Mise à jour du rôle du membre:', this.selectedMember.userId, 'dans le projet:', this.projectId);

    this.memberService.updateMemberRole(
      this.projectId, 
      this.selectedMember.userId, 
      dto
    ).subscribe({
      next: (updatedMember) => {
        console.log('✅ Rôle du membre mis à jour:', updatedMember);
        const index = this.members.findIndex(m => m.userId === this.selectedMember!.userId);
        if (index !== -1) {
          this.members[index] = updatedMember;
        }
        this.closeEditModal();
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Rôle du membre mis à jour avec succès',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du rôle:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de mettre à jour le rôle du membre'
        });
      }
    });
  }

  toggleMemberStatus(member: ProjectMember) {
  if (!this.projectId || this.projectId === 'undefined') {
    console.error('❌ toggleMemberStatus: projectId invalide');
    Swal.fire({
      icon: 'error',
      title: 'Aucun projet sélectionné',
      text: 'Veuillez d\'abord sélectionner un projet.',
      confirmButtonText: 'Aller aux projets'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/dashboard/projects']);
      }
    });
    return;
  }

    const action = member.isActive ? 'désactiver' : 'activer';
    
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} le membre`,
      text: `Êtes-vous sûr de vouloir ${action} ${member.user.username} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: member.isActive ? '#dc2626' : '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Oui, ${action}`,
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        const serviceCall = member.isActive 
          ? this.memberService.deactivateMember(this.projectId!, member.userId)
          : this.memberService.activateMember(this.projectId!, member.userId);

        serviceCall.subscribe({
          next: (updatedMember) => {
            console.log(`✅ Membre ${action}é:`, updatedMember);
            const index = this.members.findIndex(m => m.userId === member.userId);
            if (index !== -1) {
              this.members[index] = updatedMember;
            }

            if (!updatedMember.isActive) {
              this.loadAvailableUsersFiltered();
            }
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: `Membre ${action}é avec succès`,
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error(`❌ Erreur lors de l'${action}ation:`, error);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: `Impossible de ${action} le membre`
            });
          }
        });
      }
    });
  }

  removeMember(member: ProjectMember) {
  if (!this.projectId || this.projectId === 'undefined') {
    console.error('❌ removeMember: projectId invalide');
    Swal.fire({
      icon: 'error',
      title: 'Aucun projet sélectionné',
      text: 'Veuillez d\'abord sélectionner un projet.',
      confirmButtonText: 'Aller aux projets'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/dashboard/projects']);
      }
    });
    return;
  }

    Swal.fire({
      title: 'Supprimer le membre',
      text: `Êtes-vous sûr de vouloir retirer ${member.user.username} du projet ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('🗑️ Suppression du membre:', member.userId, 'du projet:', this.projectId);
        
        this.memberService.removeMember(this.projectId!, member.userId).subscribe({
          next: () => {
            console.log('✅ Membre supprimé avec succès');
            this.members = this.members.filter(m => m.userId !== member.userId);

            this.loadAvailableUsersFiltered();
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: 'Membre retiré du projet avec succès',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression:', error);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: error.error?.message || 'Impossible de retirer le membre du projet'
            });
          }
        });
      }
    });
  }

  getRoleName(roleId: string): string {
    const role = this.projectRoles.find(r => r.id === roleId);
    return role ? role.name : 'Rôle inconnu';
  }

  getUserName(userId: string): string {
    const user = this.availableUsers.find(u => u.id === userId);
    return user ? `${user.username} (${user.email})` : 'Utilisateur inconnu';
  }

  // Méthode pour naviguer vers les projets
  goToProjects() {
    this.router.navigate(['/dashboard/projects']);
  }

  // Méthodes utilitaires pour le debug
  debugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('ProjectId:', this.projectId);
    console.log('Members:', this.members);
    console.log('Project Roles:', this.projectRoles);
    console.log('Available Users:', this.availableUsers);
    console.log('Show Project Selection:', this.showProjectSelection);
    console.log('Route params:', this.route.snapshot.params);
    console.log('Query params:', this.route.snapshot.queryParams);
  }

  // Rafraîchir les données
  refresh() {
    console.log('🔄 Rafraîchissement des données...');
    if (this.projectId && this.projectId !== 'undefined') {
      this.loadData();
    } else {
      this.showProjectSelectionMode();
    }
  }

  // Vérifier si le composant est dans un état valide pour les opérations
  isValidState(): boolean {
    return !!(this.projectId && this.projectId !== 'undefined');
  }

  // Obtenir le message d'état actuel
  getStatusMessage(): string {
    if (!this.projectId || this.projectId === 'undefined') {
      return 'Aucun projet sélectionné';
    }
    if (this.loading) {
      return 'Chargement en cours...';
    }
    if (this.members.length === 0) {
      return 'Aucun membre trouvé pour ce projet';
    }
    return `${this.members.length} membre(s) trouvé(s)`;
  }
}