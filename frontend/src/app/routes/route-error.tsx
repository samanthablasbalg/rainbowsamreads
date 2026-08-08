import { isRouteErrorResponse, useRouteError } from 'react-router';

// Renders in place of `<Outlet />` when a screen inside AuthenticatedShell throws,
// so the shell -- nav included -- survives instead of the whole document swapping
// for react-router's unstyled default. isRouteErrorResponse distinguishes a thrown
// Response (a loader's 404, say) from an actual JS error.
export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <section>
        <h1>
          {error.status} {error.statusText}
        </h1>
      </section>
    );
  }

  return (
    <section>
      <h1>Something went wrong</h1>
    </section>
  );
}
