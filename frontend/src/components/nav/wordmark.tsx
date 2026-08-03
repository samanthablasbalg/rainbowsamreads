import { Link } from 'react-router';

// The app's name, and the way back to Home from anywhere. A component only so the
// three nav layouts share one copy of the string rather than each hardcoding it.
export function Wordmark() {
  return (
    <Link to="/home" className="font-heading text-lg font-semibold tracking-tight">
      Rainbow Sam Reads
    </Link>
  );
}
