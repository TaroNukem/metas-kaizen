
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();

  async function fazerLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha,
    });

    if (error) {
      alert("Erro ao fazer login: " + error.message);
      return;
    }

    alert("Login realizado com sucesso!");
    navigate("/metas");
  }

  async function verificarSessao() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      alert("Erro ao verificar sessão: " + error.message);
      return;
    }

    if (data.session) {
      alert("Sessão ativa!\nUsuário: " + data.session.user.email);
    } else {
      alert("Nenhuma sessão ativa.");
    }
  }

  return (
    <div>
      <h1>Fazer login</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          fazerLogin();
        }}
      >
        <div>
          <label htmlFor="email-login">E-mail</label>
          <input
            id="email-login"
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="senha-login">Senha</label>
          <input
            id="senha-login"
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button type="submit">Entrar</button>
      </form>

      <button onClick={verificarSessao}>Verificar sessão</button>
    </div>
  );
}
