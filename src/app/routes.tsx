import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { StudyGroup } from "./pages/StudyGroup";
import { PrivateMessages } from "./pages/PrivateMessages";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/study-group/:id",
    element: (
      <ProtectedRoute>
        <StudyGroup />
      </ProtectedRoute>
    ),
  },
  {
    path: "/private-messages",
    element: (
      <ProtectedRoute>
        <PrivateMessages />
      </ProtectedRoute>
    ),
  },
]);