import { ComingSoon } from '@/components/common/coming-soon';

// The route exists ahead of the screen on purpose: the backend has no to-read list yet.
// `ComingSoon` rather than an empty state, which would say "you have no books here" --
// false, and the reason is the feature, not the data.
export function ToRead() {
  return <ComingSoon title="To Read" />;
}
