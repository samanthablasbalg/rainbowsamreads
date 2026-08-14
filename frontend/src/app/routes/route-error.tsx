import { useRouteError } from 'react-router';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';

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
