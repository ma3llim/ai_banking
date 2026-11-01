import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { HOME } from '../paths';

/** Used both for unknown URLs and as the router's error screen. */
export function NotFoundPage() {
  const error = useRouteError();
  const isCrash = error !== undefined && !(isRouteErrorResponse(error) && error.status === 404);

  return (
    <div className="center">
      <div className="card login">
        <h1>{isCrash ? 'Something went wrong' : 'Page not found'}</h1>
        <p className="muted">
          {isCrash
            ? 'An unexpected error occurred while showing this page.'
            : "The page you're looking for doesn't exist."}
        </p>
        <Link className="button primary" to={HOME}>
          Go to Simulation
        </Link>
      </div>
    </div>
  );
}
