import { Link } from 'react-router';

// The public front door. Signed out, this is what `/` shows; signed in, the guest
// wrapper in § 3 will redirect away from here to /home.
export function Landing() {
  return (
    <section>
      <h1>Rainbow Sam Reads</h1>
      <p>Coming soon.</p>
      <Link to="/home">Go to the app</Link>
    </section>
  );
}
