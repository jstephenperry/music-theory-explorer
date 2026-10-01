import { HashRouter, Route, Routes } from 'react-router';
import { Layout } from './Layout';
import { ROUTES } from './routes';
import HomePage from '../features/home/HomePage';
import { PageHeader } from '../components/ui';
import { Link } from 'react-router';

function NotFound() {
  return (
    <PageHeader eyebrow="Intermission" title="This seat does not exist" lede={<>The page you asked for is not on the program. <Link to="/">Return to the foyer.</Link></>} />
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          {ROUTES.map((r) => (
            <Route key={r.path} path={r.path.slice(1)} element={<r.component />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
