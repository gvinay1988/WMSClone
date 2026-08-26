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
    path: 'server-error',
    loadComponent: () =>
      import('../Common/serverrpage/serverrpage')
        .then(m => m.Serverrpage)
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
        path: 'master',
        children: [

          {
            path: 'supplier',
            loadComponent: () =>
              import('./Features/Master/supplier-master/supplier-master')
                .then(m => m.SupplierMaster)
          }

        ]
      }

    ]
  },

  {
    path: '**',
    redirectTo: '/server-error'
  }

];