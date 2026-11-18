
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/Cadastro.css";
import gifCadastro from "../assets/cachorro_cafe_loop.gif";

export default function Cadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  async function cadastrarUsuario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      alert("Erro ao realizar cadastro: " + error.message);
      return;
    }

    alert(
      data.session
        ? "Cadastro realizado com sucesso!"
        : "Cadastro realizado! Verifique seu e-mail para confirmar sua conta."
    );

    navigate(data.session ? "/" : "/login");
  }

  return (
    <main className="cadastro-container">
      <section className="cadastro-illustration">
        <img
          src={gifCadastro}
          alt="Ilustração de cadastro"
        />

        <div className="cadastro-illustration-text">
          <h2>Todo dia é uma nova chance.</h2>
          <h2>Comece hoje!</h2>

          <p>
            Crie sua conta e dê o primeiro passo
            para construir hábitos melhores.
          </p>
        </div>
      </section>

      <section className="cadastro-content">
        <div className="cadastro-card">
          <div className="cadastro-header">
            <h1>Crie sua conta!</h1>
            <p>Estamos felizes por ter você aqui.</p>
          </div>

          <form onSubmit={cadastrarUsuario}>
            <div className="cadastro-input">
              <label htmlFor="email-cadastro">E-mail</label>

              <input
                id="email-cadastro"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="cadastro-input">
              <label htmlFor="senha-cadastro">Senha</label>

              <input
                id="senha-cadastro"
                type="password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <span className="cadastro-password-hint">
                A senha deve ter pelo menos 6 caracteres.
              </span>
            </div>

            <button
              className="cadastro-button"
              type="submit"
              disabled={carregando}
            >
              {carregando ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="cadastro-login">
            <span>Já tem uma conta?</span>
            <Link to="/login">Entrar</Link>
          </div>

          <p className="cadastro-footer">
            Pequenos passos também levam longe.
          </p>
        </div>
      </section>
    </main>
  );
}
