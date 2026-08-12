import { Link } from 'react-router';

// Catch-all. Sits outside the shell: a URL we do not recognise should not be dressed
// up as a page of the app.
export function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/home">Go to the app</Link>
    </section>
  );
}
