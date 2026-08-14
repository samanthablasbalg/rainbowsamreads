import type { QueryClient } from '@tanstack/react-query';
import {
  getEngagementsGetEngagementQueryKey,
  getEngagementsListEngagementsQueryKey,
  getEngagementsListProgressLogsQueryKey,
} from '@/api/generated/engagements/engagements';

// None of the three keys is a prefix of another -- they differ at their first element --
// so one invalidation cannot stand in for the rest.
export function invalidateRead(queryClient: QueryClient, engagementId: string) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getEngagementsListProgressLogsQueryKey(engagementId),
    }),
    queryClient.invalidateQueries({ queryKey: getEngagementsGetEngagementQueryKey(engagementId) }),
    queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
  ]);
}
