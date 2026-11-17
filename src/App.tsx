
import { BrowserRouter, Route, Routes, Link, Navigate, useNavigate } from "react-router-dom";
import { useContext } from "react";

import Cadastro from "./components/Cadastro";
import Login from "./components/Login";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Metas from "./pages/Metas";
import ProtectedRoute from "./components/ProtectedRoute";
import { supabase } from "./lib/supabase";

function Rotas() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  if (!auth) {
    throw new Error("Rotas precisa estar dentro de AuthProvider");
  }

  async function fazerLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Erro ao sair da conta: " + error.message);
      return;
    }

    alert("Logout realizado com sucesso!");
    navigate("/login");
  }

  return (
    <>
      <nav>
        {auth.carregando ? (
          <p>Carregando...</p>
        ) : auth.usuario ? (
          <div>
            <span>{auth.usuario.email}</span>
            <button onClick={fazerLogout}>Sair</button>
          </div>
        ) : (
          <>
            <Link to="/cadastro">Cadastro</Link>
            <Link to="/login">Login</Link>
          </>
        )}
      </nav>

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
    </>
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
