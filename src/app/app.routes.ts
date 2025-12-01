import { Routes } from '@angular/router';
import { Verify2faComponent } from './auth/components/verify-2fa/verify-2fa.component';
import { LoginComponent } from './auth/components/login/login.component';
import { RegisterComponent } from './auth/components/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { TwoFactorGuard } from './guards/two-factor.guard';
import { ForgotPasswordComponent } from './auth/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/components/reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'verify-2fa',
    component: Verify2faComponent,
    canActivate: [TwoFactorGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/dashboard/project/project-list.component')
            .then(m => m.ProjectListComponent)
      },
      // Route pour les membres d'un projet spécifique
      {
        path: 'projects/:projectId/members',
        loadComponent: () =>
          import('./pages/project-member/project-member.component')
            .then(m => m.ProjectMemberComponent)
      },
      // Autres routes
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/roles/roles.component')
          .then(m => m.RolesComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/user.component')
          .then(m => m.UserComponent)
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./pages/tasks/task.component')
          .then(m => m.TaskComponent)
      },
      // Routes avec noms corrects (sans espaces)
      {
        path: 'project-members',
        loadComponent: () =>
          import('./pages/project-member/project-member.component')
            .then(m => m.ProjectMemberComponent)
      },
      {
        path: 'project-permissions',
        loadComponent: () =>
          import('./pages/project-permission/project-permission.component')
            .then(m => m.ProjectPermissionComponent)
      },
      {
        path: 'project-roles',
        loadComponent: () =>
          import('./pages/project-role/project-role.component')
            .then(m => m.ProjectRoleComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];