import { Link } from 'react-router';

export function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/home">Go to the app</Link>
    </section>
  );
}
