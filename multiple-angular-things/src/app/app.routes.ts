import { Routes } from '@angular/router';
import { Layout } from './Core/layout/layout/layout';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadChildren: () =>
      import('./Features/Auth/auth.routes')
        .then(m => m.routes)
  },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [

      {
        path: 'dashboard',
        loadChildren: () =>
          import('./Features/dashboard/dashboard.routes')
            .then(m => m.routes)
      },

      {
        path: 'employees',
        loadChildren: () =>
          import('./Features/Employees/employee.routes')
            .then(m => m.routes)
      },

      {
        path: 'createuser',
        loadChildren: () =>
          import('./Features/create-user/createuser.routes')
            .then(m => m.routes)
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];