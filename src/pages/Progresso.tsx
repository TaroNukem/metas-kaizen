
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../styles/Progresso.css";
import Header from "../components/Header";

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

function adicionarDias(data: Date, quantidade: number) {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + quantidade);
    return novaData;
}

function calcularSequencia(dias: Set<string>) {
    if (dias.size === 0) return 0;

    const hoje = obterDataISO(new Date());
    const ontem = obterDataISO(adicionarDias(new Date(), -1));

    let dataAtual = dias.has(hoje)
        ? hoje
        : dias.has(ontem)
            ? ontem
            : null;

    if (!dataAtual) return 0;

    let sequencia = 0;

    while (dias.has(dataAtual)) {
        sequencia++;

        const [ano, mes, dia] = dataAtual.split("-").map(Number);

        dataAtual = obterDataISO(
            adicionarDias(new Date(ano, mes - 1, dia), -1)
        );
    }

    return sequencia;
}

function calcularMaiorSequencia(dias: Set<string>) {
    const datas = Array.from(dias).sort();

    let maior = 0;
    let atual = 0;
    let dataAnterior = "";

    for (const data of datas) {
        if (dataAnterior) {
            const [ano, mes, dia] = dataAnterior.split("-").map(Number);
            const proximoDia = obterDataISO(
                adicionarDias(new Date(ano, mes - 1, dia), 1)
            );

            atual = data === proximoDia ? atual + 1 : 1;
        } else {
            atual = 1;
        }

        maior = Math.max(maior, atual);
        dataAnterior = data;
    }

    return maior;
}

export default function Progresso() {
    const navigate = useNavigate();

    const [metas, setMetas] = useState<Meta[]>([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        async function buscarDados() {
            const { data: usuarioData, error: erroUsuario } =
                await supabase.auth.getUser();

            if (erroUsuario || !usuarioData.user) {
                navigate("/login");
                return;
            }

            const { data, error } = await supabase
                .from("metas")
                .select("id, titulo, data, concluida")
                .eq("user_id", usuarioData.user.id)
                .order("data", { ascending: true });

            if (error) {
                alert("Erro ao carregar progresso: " + error.message);
                setCarregando(false);
                return;
            }

            setMetas(data || []);
            setCarregando(false);
        }

        buscarDados();
    }, [navigate]);

    const estatisticas = useMemo(() => {
        const hoje = obterDataISO(new Date());

        const metasConcluidas = metas.filter(
            (meta) => meta.concluida
        );

        const metasAteHoje = metas.filter(
            (meta) => meta.data <= hoje
        );

        const taxaConclusao = metasAteHoje.length > 0
            ? Math.round(
                (metasConcluidas.length / metasAteHoje.length) * 100
            )
            : 0;

        const diasConcluidos = new Set(
            metasConcluidas.map((meta) => meta.data)
        );

        return {
            totalConcluidas: metasConcluidas.length,
            taxaConclusao,
            diasAtivos: diasConcluidos.size,
            sequenciaAtual: calcularSequencia(diasConcluidos),
            maiorSequencia: calcularMaiorSequencia(diasConcluidos),
            diasConcluidos
        };
    }, [metas]);

    const ultimosSeteDias = useMemo(() => {
        const hoje = new Date();

        return Array.from({ length: 7 }, (_, index) => {
            const data = adicionarDias(hoje, index - 6);
            const dataISO = obterDataISO(data);

            const total = metas.filter(
                (meta) => meta.data === dataISO
            ).length;

            const concluidas = metas.filter(
                (meta) => meta.data === dataISO && meta.concluida
            ).length;

            return {
                data: dataISO,
                dia: data.toLocaleDateString("pt-BR", {
                    weekday: "short"
                }).replace(".", ""),
                total,
                concluidas
            };
        });
    }, [metas]);

    const diasDoMes = useMemo(() => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();

        const primeiroDia = new Date(ano, mes, 1);
        const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

        const diasVazios = primeiroDia.getDay();

        return [
            ...Array.from({ length: diasVazios }, () => null),
            ...Array.from({ length: quantidadeDias }, (_, index) => {
                const data = new Date(ano, mes, index + 1);
                const dataISO = obterDataISO(data);

                const total = metas.filter(
                    (meta) => meta.data === dataISO
                ).length;

                const concluidas = metas.filter(
                    (meta) => meta.data === dataISO && meta.concluida
                ).length;

                return {
                    numero: index + 1,
                    data: dataISO,
                    total,
                    concluidas,
                    ativo: estatisticas.diasConcluidos.has(dataISO)
                };
            })
        ];
    }, [metas, estatisticas.diasConcluidos]);

    const nomeMes = new Date().toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    const maiorValorGrafico = Math.max(
        1,
        ...ultimosSeteDias.map((dia) => dia.concluidas)
    );

    if (carregando) {
        return (
            <main className="progresso-container">
                <p className="progresso-loading">Carregando seu progresso...</p>
            </main>
        );
    }

    return (
        <main className="progresso-container">
            <Header />

            <section className="estatisticas-grid">
                <article className="estatistica-card">
                    <span className="estatistica-icon">✓</span>
                    <strong>{estatisticas.totalConcluidas}</strong>
                    <span>Metas concluídas</span>
                </article>

                <article className="estatistica-card">
                    <span className="estatistica-icon">🔥</span>
                    <strong>{estatisticas.maiorSequencia}</strong>
                    <span>Maior sequência</span>
                </article>

                <article className="estatistica-card">
                    <span className="estatistica-icon">%</span>
                    <strong>{estatisticas.taxaConclusao}%</strong>
                    <span>Taxa de conclusão</span>
                </article>

                <article className="estatistica-card">
                    <span className="estatistica-icon">📅</span>
                    <strong>{estatisticas.diasAtivos}</strong>
                    <span>Dias ativos</span>
                </article>
            </section>

            <section className="progresso-content">
                <article className="progresso-card grafico-card">
                    <div className="progresso-card-header">
                        <div>
                            <span className="progresso-label">
                                CONSISTÊNCIA
                            </span>
                            <h2>Últimos sete dias</h2>
                        </div>
                        <span className="grafico-periodo">Esta semana</span>
                    </div>

                    <div className="grafico">
                        {ultimosSeteDias.map((dia) => (
                            <div className="grafico-coluna" key={dia.data}>
                                <strong>{dia.concluidas}</strong>

                                <div className="grafico-barra-fundo">
                                    <div
                                        className="grafico-barra"
                                        style={{
                                            height: `${(dia.concluidas / maiorValorGrafico) * 100}%`
                                        }}
                                    />
                                </div>

                                <span>{dia.dia}</span>
                            </div>
                        ))}
                    </div>

                    <p className="grafico-legenda">
                        Quantidade de metas concluídas por dia.
                    </p>
                </article>

                <article className="progresso-card calendario-progresso">
                    <div className="progresso-card-header">
                        <div>
                            <span className="progresso-label">
                                SEU HISTÓRICO
                            </span>
                            <h2>Calendário de consistência</h2>
                        </div>
                    </div>

                    <p className="mes-atual">{nomeMes}</p>

                    <div className="heatmap">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                            (dia) => (
                                <span className="heatmap-dia-semana" key={dia}>
                                    {dia}
                                </span>
                            )
                        )}

                        {diasDoMes.map((dia, index) => {
                            if (!dia) {
                                return (
                                    <span
                                        className="heatmap-vazio"
                                        key={`vazio-${index}`}
                                    />
                                );
                            }

                            return (
                                <div
                                    key={dia.data}
                                    className={[
                                        "heatmap-dia",
                                        dia.ativo ? "ativo" : "",
                                        dia.total > 0 && !dia.ativo
                                            ? "planejado"
                                            : ""
                                    ].join(" ")}
                                    title={`${dia.numero}: ${dia.concluidas} de ${dia.total} metas concluídas`}
                                >
                                    {dia.numero}
                                </div>
                            );
                        })}
                    </div>

                    <div className="heatmap-legenda">
                        <span><i className="heatmap-inativo" /> Sem conclusão</span>
                        <span><i className="heatmap-ativo" /> Meta concluída</span>
                    </div>
                </article>
            </section>

            <section className="resumo-sequencia">
                <span className="sequencia-icon">✦</span>
                <div>
                    <h2>Continue no seu ritmo.</h2>
                    <p>
                        Sua sequência atual é de{" "}
                        <strong>{estatisticas.sequenciaAtual}{" "}
                        {estatisticas.sequenciaAtual === 1 ? "dia" : "dias"}</strong>.
                        Cada pequeno passo conta.
                    </p>
                </div>
            </section>
        </main>
    );
}
