import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './Layout';
import { MODES, ROUTES } from './routes';
import HomePage from '../features/home/HomePage';
import ModePage from '../features/home/ModePage';
import { PageHeader } from '../components/ui';

function NotFound() {
  return (
    <PageHeader
      eyebrow="Error 404"
      title="Page not found"
      lede={
        <>
          There is no page at this address. <Link to="/">Go to the home page.</Link>
        </>
      }
    />
  );
}

/** Sends an old flat room path (`/intervals?root=C`) to its mode path (`/theory/intervals?root=C`), keeping the query string. */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          {MODES.map((m) => (
            <Route key={m.id} path={m.path.slice(1)} element={<ModePage mode={m} />} />
          ))}
          {ROUTES.map((r) => (
            <Route key={r.path} path={r.path.slice(1)} element={<r.component />} />
          ))}
          {ROUTES.map((r) => (
            <Route key={`legacy${r.slug}`} path={r.slug.slice(1)} element={<LegacyRedirect to={r.path} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
