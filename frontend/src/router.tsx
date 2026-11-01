import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout, type RouteHandle } from './components/AppLayout';
import { RequireAdmin, RequireAuth } from './components/RouteGuards';
import { HOME, paths } from './paths';
import { LoginPage } from './pages/LoginPage';
import { SimulationPage } from './pages/SimulationPage';
import { UsersPage } from './pages/UsersPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { NotFoundPage } from './pages/NotFoundPage';

const handle = (title: string): RouteHandle => ({ title });

export const router = createBrowserRouter([
  {
    errorElement: <NotFoundPage />,
    children: [
      { path: paths.login, element: <LoginPage />, handle: handle('Sign in') },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <Navigate to={HOME} replace /> },
              { path: paths.simulation, element: <SimulationPage />, handle: handle('Simulation') },
              {
                path: paths.users,
                element: (
                  <RequireAdmin>
                    <UsersPage />
                  </RequireAdmin>
                ),
                handle: handle('Test Users'),
              },
              { path: paths.documents, element: <DocumentsPage />, handle: handle('Documents') },
              { path: paths.chat, element: <ChatPage />, handle: handle('AI Assistant') },
              { path: '*', element: <NotFoundPage />, handle: handle('Not found') },
            ],
          },
        ],
      },
    ],
  },
]);
