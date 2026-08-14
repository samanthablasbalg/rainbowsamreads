import { useParams } from 'react-router';
import { BookDetail } from '@/features/books/components/book-detail';

export function Book() {
  const { bookId } = useParams();

  return <BookDetail bookId={bookId!} />;
}
