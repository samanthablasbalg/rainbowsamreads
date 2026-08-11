import { useRouteError } from 'react-router';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';

// The router's error boundary. What it replaces depends entirely on which route it is
// attached to -- a boundary renders in place of its own route's component, so the two
// placements in router.tsx are what decide whether the shell survives.
//
// Reload rather than `useRevalidator`: the failure that lands here most often is a
// screen chunk whose import() rejected, and re-running loaders will not re-fetch a
// module. Reloading is the one action that fixes both that and a stale deploy.
export function RouteError() {
  const error = useRouteError();

  return (
    <ErrorState
      error={error}
      action={
        <Button variant="outline" onClick={() => location.reload()}>
          Reload page
        </Button>
      }
    />
  );
}
