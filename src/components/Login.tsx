
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/Login.css";
import cachorroCafe from "../assets/cachorro_cafe_loop.gif";

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

  return (
    <main className="login-container">

      <section className="login-illustration">
        <img
          src={cachorroCafe}
          alt="Cachorro enchendo um copo de café"
        />

        <div className="illustration-text">
          <h2>Pequenos passos.</h2>
          <h2>Grandes conquistas.</h2>
          <p>
            Organize suas metas e evolua um pouco todos os dias.
          </p>
        </div>
      </section>

      <section className="login-content">
        <div className="login-card">

          <div className="login-header">
            <h1>Bem-vindo!</h1>
            <p>Entre na sua conta para continuar.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fazerLogin();
            }}
          >
            <div className="login-input">
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

            <div className="login-input">
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

            <button className="login-button" type="submit">
              Entrar
            </button>
          </form>

          <div className="login-register">
            <span>Não tem conta?</span>
            <Link to="/cadastro">Cadastre-se</Link>
          </div>

          <p className="login-footer">
            Cada dia é uma nova oportunidade de melhorar.
          </p>

        </div>
      </section>

    </main>
  );
}
