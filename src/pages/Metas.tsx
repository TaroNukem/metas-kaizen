import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import frasesRaw from "../data/frases.txt?raw";
import "../styles/Metas.css";

type Meta = {
    id: string;
    titulo: string;
    data: string;
    concluida: boolean;
};

function obterDataISO(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function obterHoje() {
    return obterDataISO(new Date());
}

function adicionarDias(data: Date, quantidade: number) {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + quantidade);
    return novaData;
}

export default function Metas() {
    const navigate = useNavigate();

    const [titulo, setTitulo] = useState("");
    const [metas, setMetas] = useState<Meta[]>([]);
    const [email, setEmail] = useState("");

    const hoje = obterHoje();

    const [dataSelecionada, setDataSelecionada] = useState(hoje);

    const [dataVisualizada, setDataVisualizada] = useState(() => {
        const data = new Date();
        return new Date(data.getFullYear(), data.getMonth(), data.getDate());
    });

    const [modoCalendario, setModoCalendario] = useState<"semana" | "mes">("semana");

    const frases = useMemo(() => {
        return frasesRaw
            .split(/\r?\n/)
            .map((frase) => frase.trim())
            .filter((frase) => frase.length > 0);
    }, []);

    const fraseDoDia = useMemo(() => {
        if (frases.length === 0) return "Um pequeno passo já é um começo.";

        const agora = new Date();
        const inicioAno = new Date(agora.getFullYear(), 0, 0);
        const diaDoAno = Math.floor(
            (agora.getTime() - inicioAno.getTime()) / 86400000
        );

        return frases[(diaDoAno - 1) % frases.length];
    }, [frases]);

    async function buscarMetas() {
        const { data: usuarioData } = await supabase.auth.getUser();

        if (!usuarioData.user) {
            alert("Você precisa estar logado!");
            navigate("/login");
            return;
        }

        const { data, error } = await supabase
            .from("metas")
            .select("*")
            .eq("user_id", usuarioData.user.id)
            .order("data", { ascending: true });

        if (error) {
            alert("Erro ao buscar metas: " + error.message);
            return;
        }

        setMetas(data || []);
    }

    async function carregarUsuario() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            navigate("/login");
            return;
        }

        setEmail(data.user.email || "");
    }

    async function fazerLogout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Erro ao sair da conta: " + error.message);
            return;
        }

        navigate("/login");
    }

    async function adicionarMetas(e: FormEvent) {
        e.preventDefault();

        if (!titulo.trim()) return;

        if (dataSelecionada < hoje) {
            alert("Não é possível criar metas em datas passadas!");
            return;
        }

        const { data: usuarioData } = await supabase.auth.getUser();

        if (!usuarioData.user) {
            alert("Você precisa estar logado!");
            return;
        }

        const { error } = await supabase.from("metas").insert({
            titulo: titulo.trim(),
            data: dataSelecionada,
            user_id: usuarioData.user.id
        });

        if (error) {
            alert("Erro ao adicionar meta: " + error.message);
            return;
        }

        alert("Meta adicionada com sucesso!");

        setTitulo("");
        await buscarMetas();
    }

    async function concluirMeta(id: string, concluida: boolean) {
        const { data: usuarioData } = await supabase.auth.getUser();

        if (!usuarioData.user) {
            alert("Você precisa estar logado!");
            return;
        }

        const { error } = await supabase
            .from("metas")
            .update({ concluida })
            .eq("id", id)
            .eq("user_id", usuarioData.user.id);

        if (error) {
            alert("Erro ao atualizar meta: " + error.message);
            return;
        }

        await buscarMetas();
    }

    async function excluirMeta(id: string) {
        const confirmar = window.confirm(
            "Tem certeza que deseja excluir esta meta?"
        );

        if (!confirmar) return;

        const { data: usuarioData } = await supabase.auth.getUser();

        if (!usuarioData.user) {
            alert("Você precisa estar logado!");
            return;
        }

        const { error } = await supabase
            .from("metas")
            .delete()
            .eq("id", id)
            .eq("user_id", usuarioData.user.id);

        if (error) {
            alert("Erro ao excluir meta: " + error.message);
            return;
        }

        alert("Meta excluída com sucesso!");

        await buscarMetas();
    }

    function formatarData(data: string) {
        const [ano, mes, dia] = data.split("-").map(Number);

        const dataMeta = Date.UTC(ano, mes - 1, dia);
        const agora = new Date();

        const dataHoje = Date.UTC(
            agora.getFullYear(),
            agora.getMonth(),
            agora.getDate()
        );

        const diferenca =
            (dataMeta - dataHoje) / 86400000;

        if (diferenca === 0) return "Hoje";
        if (diferenca === 1) return "Amanhã";
        if (diferenca === -1) return "Ontem";

        return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    function agruparMetas() {
        return metas.reduce((grupos, meta) => {
            if (!grupos[meta.data]) {
                grupos[meta.data] = [];
            }

            grupos[meta.data].push(meta);

            return grupos;
        }, {} as Record<string, Meta[]>);
    }

    useEffect(() => {
        carregarUsuario();
        buscarMetas();
    }, []);

    const metasAgrupadas = agruparMetas();

    const metasSelecionadas =
        metasAgrupadas[dataSelecionada] || [];

    const totalConcluidas = metas.filter(
        (meta) => meta.concluida
    ).length;

    const ofensiva = useMemo(() => {
        const diasConcluidos = new Set(
            metas
                .filter((meta) => meta.concluida)
                .map((meta) => meta.data)
        );

        const dataHoje = new Date();
        const ontem = obterDataISO(adicionarDias(dataHoje, -1));

        let dataVerificada = diasConcluidos.has(hoje)
            ? hoje
            : diasConcluidos.has(ontem)
                ? ontem
                : null;

        if (!dataVerificada) return 0;

        let quantidade = 0;

        while (diasConcluidos.has(dataVerificada)) {
            quantidade++;

            const [ano, mes, dia] = dataVerificada
                .split("-")
                .map(Number);

            dataVerificada = obterDataISO(
                adicionarDias(new Date(ano, mes - 1, dia), -1)
            );
        }

        return quantidade;
    }, [metas, hoje]);

    const nomeMes = dataVisualizada.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const data = new Date(2024, 0, 7 + i);

        return data.toLocaleDateString("pt-BR", {
            weekday: "short"
        });
    });

    function gerarDiasCalendario() {
        const ano = dataVisualizada.getFullYear();
        const mes = dataVisualizada.getMonth();

        if (modoCalendario === "semana") {
            const inicioSemana = new Date(dataVisualizada);
            inicioSemana.setDate(
                inicioSemana.getDate() - inicioSemana.getDay()
            );

            return Array.from({ length: 7 }, (_, i) =>
                adicionarDias(inicioSemana, i)
            );
        }

        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);

        const diaInicial = primeiroDia.getDay();
        const totalDias = ultimoDia.getDate();

        const quantidadeCelulas =
            Math.ceil((diaInicial + totalDias) / 7) * 7;

        return Array.from({ length: quantidadeCelulas }, (_, i) =>
            new Date(ano, mes, i - diaInicial + 1)
        );
    }

    function mudarPeriodo(direcao: number) {
        if (modoCalendario === "semana") {
            setDataVisualizada((atual) =>
                adicionarDias(atual, direcao * 7)
            );
        } else {
            setDataVisualizada((atual) =>
                new Date(
                    atual.getFullYear(),
                    atual.getMonth() + direcao,
                    1
                )
            );
        }
    }

    function alternarModo() {
        if (modoCalendario === "semana") {
            setModoCalendario("mes");
            setDataVisualizada((atual) =>
                new Date(atual.getFullYear(), atual.getMonth(), 1)
            );
        } else {
            setModoCalendario("semana");

            const [ano, mes, dia] = dataSelecionada
                .split("-")
                .map(Number);

            setDataVisualizada(new Date(ano, mes - 1, dia));
        }
    }

    function obterTituloPeriodo() {
        if (modoCalendario === "mes") {
            return nomeMes;
        }

        const dias = gerarDiasCalendario();
        const inicio = dias[0];
        const fim = dias[6];

        const mesmoMes =
            inicio.getMonth() === fim.getMonth();

        if (mesmoMes) {
            return `${inicio.getDate()} a ${fim.getDate()} de ${fim.toLocaleDateString(
                "pt-BR",
                { month: "long" }
            )}`;
        }

        return `${inicio.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short"
        })} a ${fim.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short"
        })}`;
    }

    const diasCalendario = gerarDiasCalendario();

    const dataSelecionadaLegivel = new Date(
        dataSelecionada + "T00:00:00"
    ).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return (
        <main className="metas-container">

            <header className="metas-header">
                <div className="user-header">
                    <span className="user-email">{email}</span>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={fazerLogout}
                    >
                        Sair
                    </button>
                </div>

                <div className="motivation-card">
                    <span className="motivation-quote">“</span>
                    <p>{fraseDoDia}</p>
                    <span className="motivation-quote closing">”</span>
                </div>
            </header>

            <div className="metas-layout">

                <div className="left-column">

            <section className="progress-summary">

                <div className="summary-card">
                    <span className="summary-icon">🔥</span>
                    <div>
                        <strong>{ofensiva}</strong>
                        <span>Ofensiva</span>
                    </div>
                    <small>
                        {ofensiva === 1 ? "dia seguido" : "dias seguidos"}
                    </small>
                </div>

                <div className="summary-card">
                    <span className="summary-icon">✓</span>
                    <div>
                        <strong>{totalConcluidas}</strong>
                        <span>Concluídas</span>
                    </div>
                    <small>metas realizadas</small>
                </div>

            </section>

                <section className="calendar-card">

                    <div className="calendar-header">

                        <div>
                            <span className="calendar-label">
                                SEU PLANEJAMENTO
                            </span>

                            <h2>{obterTituloPeriodo()}</h2>
                        </div>

                        <div className="calendar-actions">

                            <div className="calendar-navigation">
                                <button
                                    type="button"
                                    onClick={() => mudarPeriodo(-1)}
                                    aria-label="Período anterior"
                                >
                                    &#8592;
                                </button>

                                <button
                                    type="button"
                                    onClick={() => mudarPeriodo(1)}
                                    aria-label="Próximo período"
                                >
                                    &#8594;
                                </button>
                            </div>

                            <button
                                type="button"
                                className="calendar-toggle"
                                onClick={alternarModo}
                            >
                                {modoCalendario === "semana"
                                    ? "Expandir ↓"
                                    : "Recolher ↑"}
                            </button>

                        </div>

                    </div>

                    <div className={`calendar-grid ${modoCalendario === "semana" ? "week-view" : "month-view"}`}>

                        {diasSemana.map((dia, index) => (
                            <div
                                className="calendar-weekday"
                                key={index}
                            >
                                {dia}
                            </div>
                        ))}

                        {diasCalendario.map((dia) => {
                            const dataISO = obterDataISO(dia);

                            const mesmoMes =
                                dia.getMonth() === dataVisualizada.getMonth();

                            const ehHoje = dataISO === hoje;

                            const selecionado =
                                dataISO === dataSelecionada;

                            const metasDoDia =
                                metasAgrupadas[dataISO] || [];

                            const totalMetas = metasDoDia.length;

                            const concluidas = metasDoDia.filter(
                                (meta) => meta.concluida
                            ).length;

                            const progresso = totalMetas > 0
                                ? (concluidas / totalMetas) * 100
                                : 0;

                            const diaVisivel =
                                modoCalendario === "semana" || mesmoMes;

                            return (
                                <div
                                    key={dataISO}
                                    className={[
                                        "calendar-day",
                                        !diaVisivel ? "other-month" : "",
                                        ehHoje ? "today" : "",
                                        selecionado ? "selected" : "",
                                        totalMetas === 0 && dataISO < hoje
                                            ? "empty-past"
                                            : "",
                                        totalMetas === 0 && dataISO > hoje
                                            ? "empty-future"
                                            : ""
                                    ].join(" ")}

                                    onClick={() => {
                                        if (diaVisivel) {
                                            setDataSelecionada(dataISO);
                                        }
                                    }}

                                    role={diaVisivel ? "button" : undefined}
                                    tabIndex={diaVisivel ? 0 : -1}

                                    onKeyDown={(e) => {
                                        if (
                                            diaVisivel &&
                                            (e.key === "Enter" || e.key === " ")
                                        ) {
                                            e.preventDefault();
                                            setDataSelecionada(dataISO);
                                        }
                                    }}
                                >

                                    <span className="day-number">
                                        {dia.getDate()}
                                    </span>

                                    {diaVisivel && (
                                        <>
                                            <div className="day-goals">

                                                {metasDoDia
                                                    .slice(0, 2)
                                                    .map((meta) => (
                                                        <label
                                                            className={[
                                                                "mini-goal",
                                                                meta.concluida
                                                                    ? "completed"
                                                                    : ""
                                                            ].join(" ")}
                                                            key={meta.id}
                                                            title={meta.titulo}
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={meta.concluida}
                                                                onChange={(e) =>
                                                                    concluirMeta(
                                                                        meta.id,
                                                                        e.target.checked
                                                                    )
                                                                }
                                                            />

                                                            <span>{meta.titulo}</span>
                                                        </label>
                                                    ))}

                                                {totalMetas > 2 && (
                                                    <small className="more-goals">
                                                        + {totalMetas - 2} mais
                                                    </small>
                                                )}

                                            </div>

                                            {totalMetas > 0 && (
                                                <div className="day-progress">
                                                    <div className="progress-track">
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: `${progresso}%`
                                                            }}
                                                        />
                                                    </div>

                                                    <small>
                                                        {concluidas}/{totalMetas}
                                                    </small>
                                                </div>
                                            )}
                                        </>
                                    )}

                                </div>
                            );
                        })}

                    </div>

                    <div className="calendar-legend">
                        <span>
                            <i className="legend-today" />
                            Hoje
                        </span>

                        <span>
                            <i className="legend-progress" />
                            Progresso diário
                        </span>
                    </div>

                </section>

                </div>

                <aside className="day-panel">

                    <div className="day-panel-header">

                        <span className="calendar-label">SEU DIA</span>

                        <h2>{formatarData(dataSelecionada)}</h2>

                        <p>{dataSelecionadaLegivel}</p>

                        <div className="day-summary">

                            <div>
                                <strong>{metasSelecionadas.length}</strong>
                                <span>Metas</span>
                            </div>

                            <div>
                                <strong>
                                    {metasSelecionadas.filter(
                                        (meta) => meta.concluida
                                    ).length}
                                </strong>
                                <span>Concluídas</span>
                            </div>

                        </div>

                    </div>

                    <div className="day-goals-section">

                        <h3>Suas metas</h3>

                        {metasSelecionadas.length === 0 ? (

                            <div className="empty-goals">
                                <span className="empty-icon">+</span>

                                <p>Nenhuma meta por aqui ainda.</p>

                                <small>
                                    Que tal começar com um pequeno passo?
                                </small>
                            </div>

                        ) : (

                            <ul className="full-goals-list">

                                {metasSelecionadas.map((meta) => (
                                    <li
                                        key={meta.id}
                                        className={
                                            meta.concluida ? "completed" : ""
                                        }
                                    >

                                        <label className="goal-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={meta.concluida}
                                                onChange={(e) =>
                                                    concluirMeta(
                                                        meta.id,
                                                        e.target.checked
                                                    )
                                                }
                                            />

                                            <span>{meta.titulo}</span>
                                        </label>

                                        <button
                                            type="button"
                                            className="delete-goal"
                                            onClick={() => excluirMeta(meta.id)}
                                            aria-label="Excluir meta"
                                        >
                                            &#215;
                                        </button>

                                    </li>
                                ))}

                            </ul>

                        )}

                    </div>

                    <div className="add-goal-section">

                        <h3>Adicionar meta</h3>

                        {dataSelecionada < hoje ? (

                            <p className="past-date-message">
                                Não é possível adicionar metas em dias passados.
                            </p>

                        ) : (

                            <form onSubmit={adicionarMetas}>

                                <label htmlFor="titulo-meta">
                                    O que você deseja realizar?
                                </label>

                                <input
                                    type="text"
                                    id="titulo-meta"
                                    placeholder="Ex: Estudar programação"
                                    value={titulo}
                                    onChange={(e) =>
                                        setTitulo(e.target.value)
                                    }
                                    required
                                />

                                <label htmlFor="data-meta">
                                    Data da meta
                                </label>

                                <input
                                    type="date"
                                    id="data-meta"
                                    value={dataSelecionada}
                                    min={hoje}
                                    onChange={(e) => {
                                        if (!e.target.value) return;

                                        const novaData = e.target.value;
                                        setDataSelecionada(novaData);

                                        const [ano, mes, dia] =
                                            novaData.split("-").map(Number);

                                        setDataVisualizada(
                                            new Date(ano, mes - 1, dia)
                                        );
                                    }}
                                    required
                                />

                                <button
                                    type="submit"
                                    className="add-goal-button"
                                    disabled={!titulo.trim()}
                                >
                                    + Adicionar meta
                                </button>

                            </form>

                        )}

                    </div>

                </aside>

            </div>
        </main>
    );
}
