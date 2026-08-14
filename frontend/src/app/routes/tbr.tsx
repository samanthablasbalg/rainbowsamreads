import { ComingSoon } from '@/components/common/coming-soon';

// The backend has no to-read list yet, so this is not an empty shelf.
export function ToRead() {
  return <ComingSoon title="To Read" />;
}
