import { useParams } from 'react-router';
import { ReadHistory } from '@/features/reads/components/read-history';

export function Read() {
  const { engagementId } = useParams();

  return <ReadHistory engagementId={engagementId!} />;
}
