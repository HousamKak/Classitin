import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-gray-500">Page not found</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-500">
          Go home
        </Link>
      </div>
    </div>
  );
}
