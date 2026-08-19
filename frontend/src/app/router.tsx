import { createBrowserRouter, redirect } from 'react-router';
import { Pending } from '@/components/common/pending';
import { AppRoot } from './routes/app-root';
import { Landing } from './routes/landing';
import { Library } from './routes/library';
import { NotFound } from './routes/not-found';
import { ContentBoundary } from './routes/content-boundary';
import { RouteError } from './routes/route-error';
import { RequireAuth, RequireGuest } from './require-auth';

export const routes = [
  { Component: RequireGuest, children: [{ path: '/', Component: Landing }] },
  {
    Component: RequireAuth,
    ErrorBoundary: RouteError,
    children: [
      {
        Component: AppRoot,
        ErrorBoundary: RouteError,
        children: [
          {
            Component: ContentBoundary,
            HydrateFallback: Pending,
            children: [
              {
                path: '/home',
                lazy: async () => ({ Component: (await import('./routes/home')).Home }),
                HydrateFallback: Pending,
              },
              {
                path: '/library',
                Component: Library,
                children: [
                  // Catalog, not the first shelf: To Read is still a stub.
                  { index: true, loader: () => redirect('/library/catalog') },
                  {
                    Component: ContentBoundary,
                    HydrateFallback: Pending,
                    children: [
                      {
                        path: 'tbr',
                        lazy: async () => ({ Component: (await import('./routes/tbr')).ToRead }),
                        HydrateFallback: Pending,
                      },
                      {
                        path: 'finished',
                        lazy: async () => ({
                          Component: (await import('./routes/finished')).Finished,
                        }),
                        HydrateFallback: Pending,
                      },
                      {
                        path: 'dnf',
                        lazy: async () => ({ Component: (await import('./routes/dnf')).Dnf }),
                        HydrateFallback: Pending,
                      },
                      {
                        path: 'catalog',
                        lazy: async () => ({
                          Component: (await import('./routes/catalog')).Catalog,
                        }),
                        HydrateFallback: Pending,
                      },
                    ],
                  },
                ],
              },
              {
                path: '/books/:bookId',
                lazy: async () => ({ Component: (await import('./routes/book')).Book }),
                HydrateFallback: Pending,
              },
              {
                // One read, reached from a book's row rather than from the nav -- so it
                // is a top-level leaf, not a child of /library, whose layout would put
                // the shelf nav above it.
                path: '/reads/:engagementId',
                lazy: async () => ({ Component: (await import('./routes/read')).Read }),
                HydrateFallback: Pending,
              },
              {
                path: '/insights',
                lazy: async () => ({ Component: (await import('./routes/insights')).Insights }),
                HydrateFallback: Pending,
              },
              {
                path: '/challenges',
                lazy: async () => ({ Component: (await import('./routes/challenges')).Challenges }),
                HydrateFallback: Pending,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', Component: NotFound },
];

export const router = createBrowserRouter(routes);
