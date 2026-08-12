import type { QueryClient } from '@tanstack/react-query';
import {
  getEngagementsGetEngagementQueryKey,
  getEngagementsListProgressLogsQueryKey,
} from '@/api/generated/engagements/engagements';

// Three caches move when an entry is edited or deleted, and none of them is a prefix of
// another -- the keys are single strings that differ at their first element, so one
// invalidation cannot stand in for the rest:
//
//   - this read's entries, which is what the list renders;
//   - the read itself, whose completion_pct and resume_from_* the backend recomputes from
//     the logs (deleting the newest entry walks both backwards);
//   - the engagement lists, so Currently Reading is not still showing the old bar when you
//     press back. That one is the easiest to forget and the most visible when it is wrong.
export function invalidateRead(queryClient: QueryClient, engagementId: string) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getEngagementsListProgressLogsQueryKey(engagementId),
    }),
    queryClient.invalidateQueries({ queryKey: getEngagementsGetEngagementQueryKey(engagementId) }),
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] }),
  ]);
}
