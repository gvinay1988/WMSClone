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
          },
          {
            path: 'productMaster',
            loadComponent: () =>
              import('./Features/Master/product-master/product-master')
                .then(m => m.ProductMaster)
          },
          {
            path: 'productCategoryGroup',
            loadComponent: () =>
              import('./Features/Master/product-category-group/product-category-group')
                .then(m => m.ProductCategoryGroup)
          },
          {
            path: 'statemaster',
            loadComponent: () =>
              import('./Features/Master/state-master/state-master')
                .then(m => m.StateMaster)
          }

        ]
      },
        {
        path: 'configuration',
        children: [

          {
            path: 'parameter',
            loadComponent: () =>
              import('./configuration/parameter/parameter')
                .then(m => m.Parameter)
          },
          {
            path: 'userConfiguration',
            loadComponent: () =>
              import('./configuration/user-configuration/user-configuration')
                .then(m => m.UserConfiguration)
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