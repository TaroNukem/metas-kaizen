import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useContext } from "react";
import Progresso from "./pages/Progresso";
import Cadastro from "./components/Cadastro";
import Login from "./components/Login";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Metas from "./pages/Metas";
import ProtectedRoute from "./components/ProtectedRoute";

function Rotas() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("Rotas precisa estar dentro de AuthProvider");
  }

  return (
    <Routes>
      <Route
        path="/cadastro"
        element={
          auth.carregando ? (
            <p>Carregando...</p>
          ) : auth.usuario ? (
            <Navigate to="/" replace />
          ) : (
            <Cadastro />
          )
        }
      />

      <Route
    path="/progresso"
    element={
        <ProtectedRoute>
            <Progresso />
        </ProtectedRoute>
    }
/>

      <Route
        path="/login"
        element={
          auth.carregando ? (
            <p>Carregando...</p>
          ) : auth.usuario ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Metas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/metas"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
