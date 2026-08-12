import { useParams } from 'react-router';
import { ReadHistory } from '@/features/reads/components/read-history';

// `engagementId` is non-null whenever this renders -- the router only matches this
// component for a URL that filled the segment -- but the param type can't know that,
// hence the assertion rather than a runtime guard for a case that cannot happen.
export function Read() {
  const { engagementId } = useParams();

  return <ReadHistory engagementId={engagementId!} />;
}
