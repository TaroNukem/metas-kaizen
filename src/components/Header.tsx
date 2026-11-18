
import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../context/AuthContext";
import "../styles/Header.css";

function Header() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    if (!auth) {
        throw new Error("Header precisa estar dentro de AuthProvider");
    }

    async function fazerLogout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Não foi possível sair da conta.");
            return;
        }

        navigate("/login", { replace: true });
    }

    return (
        <header className="app-header">
            <div className="header-brand">
                Rotina
            </div>

            <nav className="header-nav">
                <NavLink to="/" end>
                    Meu dia
                </NavLink>

                <NavLink to="/progresso">
                    Meu progresso
                </NavLink>

                <NavLink to="/diario">
                    Diário
                </NavLink>
            </nav>

            <div className="header-account">
                <span className="header-email">
                    {auth.carregando
                        ? "Carregando..."
                        : auth.usuario?.email || "Usuário"}
                </span>

                <button
                    type="button"
                    className="header-logout"
                    onClick={fazerLogout}
                >
                    Sair
                </button>
            </div>
        </header>
    );
}

export default Header;
