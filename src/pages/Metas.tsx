
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import frasesRaw from "../data/frases.txt?raw";
import "../styles/Metas.css";
import Header from "../components/Header";

type RecorrenciaBanco = "nenhuma" | "diaria" | "semanal" | "mensal";

type TipoRepeticao =
  | "nenhuma"
  | "diaria"
  | "dias_semana"
  | "semanal"
  | "mensal";

type Meta = {
  id: string;
  titulo: string;
  data: string;
  concluida: boolean;
  recorrencia: RecorrenciaBanco;
  recorrencia_id: string | null;
  dias_semana: number[];
  categoria?: string;
  prioridade?: string;
};

const DIAS = [
  { numero: 1, nome: "Seg", completo: "Segunda-feira" },
  { numero: 2, nome: "Ter", completo: "Terça-feira" },
  { numero: 3, nome: "Qua", completo: "Quarta-feira" },
  { numero: 4, nome: "Qui", completo: "Quinta-feira" },
  { numero: 5, nome: "Sex", completo: "Sexta-feira" },
  { numero: 6, nome: "Sáb", completo: "Sábado" },
  { numero: 0, nome: "Dom", completo: "Domingo" },
];

function obterDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterHoje(): string {
  return obterDataISO(new Date());
}

function converterDataISO(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function adicionarDias(data: Date, quantidade: number): Date {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + quantidade);
  return novaData;
}

function adicionarMeses(data: Date, quantidade: number): Date {
  const diaOriginal = data.getDate();
  const novaData = new Date(
    data.getFullYear(),
    data.getMonth() + quantidade,
    1
  );

  const ultimoDia = new Date(
    novaData.getFullYear(),
    novaData.getMonth() + 1,
    0
  ).getDate();

  novaData.setDate(Math.min(diaOriginal, ultimoDia));
  return novaData;
}

function proximaDataRecorrente(
  data: string,
  recorrencia: RecorrenciaBanco,
  diasSemana: number[]
): string {
  const atual = converterDataISO(data);

  if (recorrencia === "diaria") {
    return obterDataISO(adicionarDias(atual, 1));
  }

  if (recorrencia === "mensal") {
    return obterDataISO(adicionarMeses(atual, 1));
  }

  if (recorrencia === "semanal" && diasSemana.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const candidata = adicionarDias(atual, i);

      if (diasSemana.includes(candidata.getDay())) {
        return obterDataISO(candidata);
      }
    }
  }

  if (recorrencia === "semanal") {
    return obterDataISO(adicionarDias(atual, 7));
  }

  return data;
}

function primeiraDataSelecionada(
  dataInicial: string,
  diasSemana: number[]
): string {
  const inicio = converterDataISO(dataInicial);

  for (let i = 0; i < 7; i++) {
    const candidata = adicionarDias(inicio, i);

    if (diasSemana.includes(candidata.getDay())) {
      return obterDataISO(candidata);
    }
  }

  return dataInicial;
}

function obterTipoRepeticao(meta: Meta): TipoRepeticao {
  if (meta.recorrencia === "diaria") return "diaria";
  if (meta.recorrencia === "mensal") return "mensal";

  if (meta.recorrencia === "semanal") {
    return meta.dias_semana?.length ? "dias_semana" : "semanal";
  }

  return "nenhuma";
}

function Metas() {
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [metas, setMetas] = useState<Meta[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(obterHoje());
  const [dataVisualizada, setDataVisualizada] = useState(new Date());
  const [modoCalendario, setModoCalendario] = useState<"mes" | "semana">("mes");

  const [tipoRepeticao, setTipoRepeticao] =
    useState<TipoRepeticao>("nenhuma");
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const frases = useMemo(
    () =>
      frasesRaw
        .split(/\r?\n/)
        .map((frase) => frase.trim())
        .filter(Boolean),
    []
  );

  const fraseDoDia = useMemo(() => {
    if (!frases.length) {
      return "Um pequeno passo já é um começo.";
    }

    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 0);
    const diaAno = Math.floor(
      (hoje.getTime() - inicioAno.getTime()) / 86400000
    );

    return frases[diaAno % frases.length];
  }, [frases]);

  async function buscarMetas() {
    const { data: usuarioData, error: usuarioErro } =
      await supabase.auth.getUser();

    if (usuarioErro || !usuarioData.user) {
      navigate("/login");
      return;
    }

    const { data, error: buscaErro } = await supabase
      .from("metas")
      .select("*")
      .eq("user_id", usuarioData.user.id)
      .order("data", { ascending: true });

    if (buscaErro) {
      console.error("Erro ao buscar metas:", buscaErro);
      setErro(`Erro ao carregar metas: ${buscaErro.message}`);
      return;
    }

    setMetas(
      (data ?? []).map((meta) => ({
        ...meta,
        recorrencia: meta.recorrencia ?? "nenhuma",
        recorrencia_id: meta.recorrencia_id ?? null,
        dias_semana: meta.dias_semana ?? [],
      })) as Meta[]
    );
  }

  useEffect(() => {
    async function inicializar() {
      setCarregando(true);
      await buscarMetas();
      setCarregando(false);
    }

    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limparFormulario() {
    setTitulo("");
    setTipoRepeticao("nenhuma");
    setDiasSelecionados([]);
    setEditandoId(null);
    setErro("");
  }

  function alternarDia(numero: number) {
    setDiasSelecionados((atuais) =>
      atuais.includes(numero)
        ? atuais.filter((dia) => dia !== numero)
        : [...atuais, numero].sort()
    );
  }

  function prepararDadosRecorrencia(data: string) {
    let recorrencia: RecorrenciaBanco = "nenhuma";
    let diasSemana: number[] = [];
    let dataFinal = data;

    if (tipoRepeticao === "diaria") {
      recorrencia = "diaria";
    }

    if (tipoRepeticao === "semanal") {
      recorrencia = "semanal";
    }

    if (tipoRepeticao === "mensal") {
      recorrencia = "mensal";
    }

    if (tipoRepeticao === "dias_semana") {
      recorrencia = "semanal";
      diasSemana = [...diasSelecionados];

      if (diasSemana.length === 0) {
        throw new Error("Selecione pelo menos um dia da semana.");
      }

      dataFinal = primeiraDataSelecionada(data, diasSemana);
    }

    return {
      recorrencia,
      dias_semana: diasSemana,
      data: dataFinal,
    };
  }

  
async function adicionarOuEditarMeta(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const tituloLimpo = titulo.trim();

  if (!tituloLimpo) {
    setErro("Digite um título para sua meta.");
    return;
  }

  if (dataSelecionada < obterHoje()) {
    setErro("Não é possível criar metas em datas passadas.");
    return;
  }

  setSalvando(true);
  setErro("");

  try {
    const { data: usuarioData, error: usuarioErro } =
      await supabase.auth.getUser();

    if (usuarioErro || !usuarioData.user) {
      navigate("/login");
      return;
    }

    const userId = usuarioData.user.id;
    const dadosRecorrencia = prepararDadosRecorrencia(dataSelecionada);

    if (editandoId) {
      const { error: atualizarErro } = await supabase
        .from("metas")
        .update({
          titulo: tituloLimpo,
          data: dadosRecorrencia.data,
          recorrencia: dadosRecorrencia.recorrencia,
          dias_semana: dadosRecorrencia.dias_semana,
        })
        .eq("id", editandoId)
        .eq("user_id", userId);

      if (atualizarErro) {
        throw atualizarErro;
      }
    } else {
      const recorrenciaId =
        dadosRecorrencia.recorrencia !== "nenhuma"
          ? crypto.randomUUID()
          : null;

      const dadosBase = {
        titulo: tituloLimpo,
        concluida: false,
        user_id: userId,
        categoria: "Outros",
        prioridade: "media",
        recorrencia: dadosRecorrencia.recorrencia,
        recorrencia_id: recorrenciaId,
        dias_semana: dadosRecorrencia.dias_semana,
      };

      // Quando selecionar dias específicos da semana,
      // cria todas as ocorrências dos próximos 90 dias.
      if (
        tipoRepeticao === "dias_semana" &&
        recorrenciaId
      ) {
        const ocorrencias = [];
        const dataInicial = converterDataISO(dadosRecorrencia.data);

        for (let i = 0; i < 90; i++) {
          const dataAtual = adicionarDias(dataInicial, i);

          if (diasSelecionados.includes(dataAtual.getDay())) {
            ocorrencias.push({
              ...dadosBase,
              data: obterDataISO(dataAtual),
            });
          }
        }

        if (ocorrencias.length === 0) {
          throw new Error("Não foi possível gerar as datas da recorrência.");
        }

        const { error: inserirErro } = await supabase
          .from("metas")
          .insert(ocorrencias);

        if (inserirErro) {
          throw inserirErro;
        }
      } else {
        // Para as outras recorrências, cria a primeira ocorrência.
        const { error: inserirErro } = await supabase
          .from("metas")
          .insert({
            ...dadosBase,
            data: dadosRecorrencia.data,
          });

        if (inserirErro) {
          throw inserirErro;
        }
      }
    }

    limparFormulario();
    await buscarMetas();
  } catch (error: unknown) {
    console.error("Erro ao adicionar/editar meta:", error);

    if (error instanceof Error) {
      setErro(error.message);
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error
    ) {
      setErro(String(error.message));
    } else {
      setErro("Não foi possível salvar sua meta. Verifique o console.");
    }
  } finally {
    setSalvando(false);
  }
}


  function iniciarEdicao(meta: Meta) {
    setEditandoId(meta.id);
    setTitulo(meta.titulo);
    setDataSelecionada(meta.data);
    setTipoRepeticao(obterTipoRepeticao(meta));
    setDiasSelecionados(meta.dias_semana ?? []);
    setErro("");

    document
      .querySelector(".add-goal-section")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function concluirMeta(id: string, concluida: boolean) {
    const meta = metas.find((item) => item.id === id);
    if (!meta) return;

    const { data: usuarioData, error: usuarioErro } =
      await supabase.auth.getUser();

    if (usuarioErro || !usuarioData.user) {
      navigate("/login");
      return;
    }

    const userId = usuarioData.user.id;

    const { error: atualizarErro } = await supabase
      .from("metas")
      .update({ concluida })
      .eq("id", id)
      .eq("user_id", userId);

    if (atualizarErro) {
      console.error("Erro ao concluir meta:", atualizarErro);
      setErro(`Não foi possível atualizar a meta: ${atualizarErro.message}`);
      return;
    }

    if (concluida && meta.recorrencia !== "nenhuma") {
      const proximaData = proximaDataRecorrente(
        meta.data,
        meta.recorrencia,
        meta.dias_semana ?? []
      );

      const recorrenciaId =
        meta.recorrencia_id ?? crypto.randomUUID();

      // Garante que a ocorrência atual tenha o identificador da série.
      if (!meta.recorrencia_id) {
        const { error: atualizarSerieErro } = await supabase
          .from("metas")
          .update({ recorrencia_id: recorrenciaId })
          .eq("id", meta.id)
          .eq("user_id", userId);

        if (atualizarSerieErro) {
          console.error("Erro ao atualizar série:", atualizarSerieErro);
          setErro(
            `Meta concluída, mas houve erro na série: ${atualizarSerieErro.message}`
          );
          await buscarMetas();
          return;
        }
      }

      // Verifica se a próxima ocorrência já existe.
      const { data: existente, error: buscaErro } = await supabase
        .from("metas")
        .select("id")
        .eq("user_id", userId)
        .eq("recorrencia_id", recorrenciaId)
        .eq("data", proximaData)
        .maybeSingle();

      if (buscaErro) {
        console.error("Erro ao verificar recorrência:", buscaErro);
        setErro(`Erro ao verificar próxima ocorrência: ${buscaErro.message}`);
      } else if (!existente) {
        const { error: inserirErro } = await supabase
          .from("metas")
          .insert({
            titulo: meta.titulo,
            data: proximaData,
            concluida: false,
            user_id: userId,
            categoria: meta.categoria ?? "Outros",
            prioridade: meta.prioridade ?? "media",
            recorrencia: meta.recorrencia,
            recorrencia_id: recorrenciaId,
            dias_semana: meta.dias_semana ?? [],
          });

        if (inserirErro) {
          console.error("Erro ao criar próxima ocorrência:", inserirErro);
          setErro(
            `Meta concluída, mas não foi possível criar a próxima: ${inserirErro.message}`
          );
        }
      }
    }

    await buscarMetas();
  }

  
async function excluirMeta(id: string) {
  const meta = metas.find((item) => item.id === id);
  if (!meta) return;

  const { data: usuarioData, error: usuarioErro } =
    await supabase.auth.getUser();

  if (usuarioErro || !usuarioData.user) {
    navigate("/login");
    return;
  }

  const userId = usuarioData.user.id;

  let excluirTodaSerie = false;

  if (meta.recorrencia !== "nenhuma" && meta.recorrencia_id) {
    excluirTodaSerie = window.confirm(
      "Deseja excluir TODAS as ocorrências desta meta?\n\n" +
      "Clique em OK para excluir toda a repetição.\n" +
      "Clique em Cancelar para excluir somente esta ocorrência."
    );
  } else {
    if (!window.confirm("Tem certeza de que deseja excluir esta meta?")) {
      return;
    }
  }

  let query = supabase.from("metas").delete().eq("user_id", userId);

  if (excluirTodaSerie && meta.recorrencia_id) {
    query = query.eq("recorrencia_id", meta.recorrencia_id);
  } else {
    query = query.eq("id", id);
  }

  const { error: excluirErro } = await query;

  if (excluirErro) {
    console.error("Erro ao excluir meta:", excluirErro);
    setErro(`Não foi possível excluir a meta: ${excluirErro.message}`);
    return;
  }

  if (editandoId === id) {
    limparFormulario();
  }

  await buscarMetas();
}


  function formatarData(data: string): string {
    if (data === obterHoje()) return "Hoje";

    const amanha = obterDataISO(adicionarDias(new Date(), 1));
    const ontem = obterDataISO(adicionarDias(new Date(), -1));

    if (data === amanha) return "Amanhã";
    if (data === ontem) return "Ontem";

    return converterDataISO(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const metasAgrupadas = useMemo(() => {
    return metas.reduce<Record<string, Meta[]>>((grupos, meta) => {
      if (!grupos[meta.data]) grupos[meta.data] = [];
      grupos[meta.data].push(meta);
      return grupos;
    }, {});
  }, [metas]);

  const metasSelecionadas = metasAgrupadas[dataSelecionada] ?? [];
  const totalConcluidas = metas.filter((meta) => meta.concluida).length;
  const totalMetas = metas.length;

  const percentualConcluido =
    totalMetas > 0
      ? Math.round((totalConcluidas / totalMetas) * 100)
      : 0;

  const ofensiva = useMemo(() => {
    const diasConcluidos = new Set(
      metas
        .filter((meta) => meta.concluida)
        .map((meta) => meta.data)
    );

    let dataAtual = converterDataISO(obterHoje());

    if (!diasConcluidos.has(obterDataISO(dataAtual))) {
      dataAtual = adicionarDias(dataAtual, -1);
    }

    let contador = 0;

    while (diasConcluidos.has(obterDataISO(dataAtual))) {
      contador++;
      dataAtual = adicionarDias(dataAtual, -1);
    }

    return contador;
  }, [metas]);

  const nomeMes = dataVisualizada.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const diasSemanaCalendario = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function gerarDiasCalendario(): Date[] {
    if (modoCalendario === "semana") {
      const primeiroDia = new Date(dataVisualizada);
      primeiroDia.setDate(primeiroDia.getDate() - primeiroDia.getDay());

      return Array.from({ length: 7 }, (_, indice) =>
        adicionarDias(primeiroDia, indice)
      );
    }

    const primeiroDiaMes = new Date(
      dataVisualizada.getFullYear(),
      dataVisualizada.getMonth(),
      1
    );

    const ultimoDiaMes = new Date(
      dataVisualizada.getFullYear(),
      dataVisualizada.getMonth() + 1,
      0
    );

    const inicio = adicionarDias(
      primeiroDiaMes,
      -primeiroDiaMes.getDay()
    );

    const fim = adicionarDias(
      ultimoDiaMes,
      6 - ultimoDiaMes.getDay()
    );

    const dias: Date[] = [];
    let atual = new Date(inicio);

    while (atual <= fim) {
      dias.push(new Date(atual));
      atual = adicionarDias(atual, 1);
    }

    return dias;
  }

  function mudarPeriodo(direcao: number) {
    const novaData = new Date(dataVisualizada);

    if (modoCalendario === "mes") {
      novaData.setMonth(novaData.getMonth() + direcao);
    } else {
      novaData.setDate(novaData.getDate() + direcao * 7);
    }

    setDataVisualizada(novaData);
  }

  function obterTituloPeriodo(): string {
    if (modoCalendario === "mes") return nomeMes;

    const dias = gerarDiasCalendario();
    const primeiro = dias[0];
    const ultimo = dias[dias.length - 1];

    const inicio = primeiro.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });

    const fim = ultimo.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });

    return `${inicio} – ${fim}`;
  }

  const diasCalendario = gerarDiasCalendario();
  const dataSelecionadaLegivel = formatarData(dataSelecionada);

  function obterRecorrenciaLabel(meta: Meta): string {
    if (meta.recorrencia === "diaria") return "Todo dia";
    if (meta.recorrencia === "mensal") return "Todo mês";

    if (meta.recorrencia === "semanal" && meta.dias_semana?.length) {
      return "Dias selecionados";
    }

    if (meta.recorrencia === "semanal") return "Toda semana";

    return "";
  }

  return (
    <main className="metas-container">
      <Header />

      <section className="motivation-card">
        <span className="motivation-label">UM PASSO DE CADA VEZ</span>
        <p className="motivation-quote">“{fraseDoDia}”</p>
      </section>

      <section className="progress-summary">
        <article className="summary-card">
          <span className="summary-icon">🔥</span>
          <div>
            <strong>{ofensiva}</strong>
            <span>dias de ofensiva</span>
          </div>
        </article>

        <article className="summary-card">
          <span className="summary-icon">✓</span>
          <div>
            <strong>{totalConcluidas}</strong>
            <span>metas concluídas</span>
          </div>
        </article>

        <article className="summary-card">
          <span className="summary-icon">◎</span>
          <div>
            <strong>{percentualConcluido}%</strong>
            <span>conclusão geral</span>
          </div>
        </article>
      </section>

      {erro && (
        <div className="metas-error" role="alert">
          <span>{erro}</span>
          <button type="button" onClick={() => setErro("")}>×</button>
        </div>
      )}

      <section className="metas-layout">
        <div className="left-column">
          <section className="calendar-card">
            <div className="calendar-header">
              <div>
                <span className="calendar-label">ORGANIZE SUA ROTINA</span>
                <h1>{obterTituloPeriodo()}</h1>
              </div>

              <div className="calendar-actions">
                <button
                  type="button"
                  className="today-button"
                  onClick={() => {
                    const hoje = new Date();
                    setDataVisualizada(hoje);
                    setDataSelecionada(obterDataISO(hoje));
                  }}
                >
                  Hoje
                </button>

                <div className="calendar-navigation">
                  <button
                    type="button"
                    aria-label="Período anterior"
                    onClick={() => mudarPeriodo(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo período"
                    onClick={() => mudarPeriodo(1)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            <div className="calendar-toggle">
              <button
                type="button"
                className={modoCalendario === "mes" ? "active" : ""}
                onClick={() => setModoCalendario("mes")}
              >
                Mês
              </button>
              <button
                type="button"
                className={modoCalendario === "semana" ? "active" : ""}
                onClick={() => setModoCalendario("semana")}
              >
                Semana
              </button>
            </div>

            <div className="calendar-grid">
              {diasSemanaCalendario.map((dia) => (
                <div className="calendar-weekday" key={dia}>{dia}</div>
              ))}

              {diasCalendario.map((dia) => {
                const dataISO = obterDataISO(dia);
                const metasDoDia = metasAgrupadas[dataISO] ?? [];
                const concluidas = metasDoDia.filter((meta) => meta.concluida).length;
                const percentual = metasDoDia.length
                  ? (concluidas / metasDoDia.length) * 100
                  : 0;

                const mesmoMes = dia.getMonth() === dataVisualizada.getMonth();
                const selecionado = dataISO === dataSelecionada;
                const hoje = dataISO === obterHoje();

                return (
                  <button
                    type="button"
                    key={dataISO}
                    className={[
                      "calendar-day",
                      !mesmoMes && modoCalendario === "mes" ? "other-month" : "",
                      selecionado ? "selected" : "",
                      hoje ? "today" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setDataSelecionada(dataISO)}
                  >
                    <span className="day-number">{dia.getDate()}</span>

                    {metasDoDia.length > 0 && (
                      <>
                        <div className="day-goals">
                          {metasDoDia.slice(0, 2).map((meta) => (
                            <span
                              key={meta.id}
                              className={`mini-goal ${meta.concluida ? "completed" : ""}`}
                              title={meta.titulo}
                            >
                              {meta.titulo}
                            </span>
                          ))}

                          {metasDoDia.length > 2 && (
                            <span className="more-goals">
                              +{metasDoDia.length - 2}
                            </span>
                          )}
                        </div>

                        <div className="day-progress">
                          <div
                            className="progress-fill"
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="calendar-legend">
              <span><i className="legend-dot legend-today" /> Hoje</span>
              <span><i className="legend-dot legend-selected" /> Selecionado</span>
              <span><i className="legend-dot legend-completed" /> Meta concluída</span>
            </div>
          </section>
        </div>

        <aside className="day-panel">
          <div className="day-panel-header">
            <span className="calendar-label">SEU PLANEJAMENTO</span>
            <h2>{dataSelecionadaLegivel}</h2>
            <p>
              {metasSelecionadas.length === 0
                ? "Um dia em branco também é uma oportunidade."
                : `${metasSelecionadas.filter((meta) => meta.concluida).length} de ${metasSelecionadas.length} metas concluídas`}
            </p>
          </div>

          {metasSelecionadas.length > 0 && (
            <div className="day-summary">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      (metasSelecionadas.filter((meta) => meta.concluida).length /
                        metasSelecionadas.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="day-goals-section">
            <h3>Minhas metas</h3>

            {carregando ? (
              <div className="empty-goals">Carregando suas metas...</div>
            ) : metasSelecionadas.length === 0 ? (
              <div className="empty-goals">
                <span className="empty-icon">✎</span>
                <strong>Nenhuma meta por aqui</strong>
                <p>Que tal adicionar uma pequena conquista para esse dia?</p>
              </div>
            ) : (
              <ul className="full-goals-list">
                {metasSelecionadas.map((meta) => (
                  <li
                    className={`goal-item ${meta.concluida ? "goal-completed" : ""}`}
                    key={meta.id}
                  >
                    <label className="goal-checkbox">
                      <input
                        type="checkbox"
                        checked={meta.concluida}
                        onChange={(event) =>
                          concluirMeta(meta.id, event.target.checked)
                        }
                      />
                      <span className="custom-checkbox" />
                      <span className="goal-title">{meta.titulo}</span>
                    </label>

                    <div className="goal-actions">
                      {meta.recorrencia !== "nenhuma" && (
                        <span className="recurrence-tag">
                          ↻ {obterRecorrenciaLabel(meta)}
                        </span>
                      )}

                      <button
                        type="button"
                        className="edit-goal"
                        title="Editar meta"
                        onClick={() => iniciarEdicao(meta)}
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        className="delete-goal"
                        title="Excluir meta"
                        onClick={() => excluirMeta(meta.id)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="add-goal-section" onSubmit={adicionarOuEditarMeta}>
            <div className="form-heading">
              <h3>{editandoId ? "Editar meta" : "Adicionar meta"}</h3>

              {editandoId && (
                <button
                  type="button"
                  className="cancel-edit"
                  onClick={limparFormulario}
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <label htmlFor="goal-title">O que você deseja realizar?</label>
            <input
              id="goal-title"
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex.: estudar por 30 minutos"
              maxLength={120}
            />

            <label htmlFor="goal-date">Data inicial</label>
            <input
              id="goal-date"
              type="date"
              value={dataSelecionada}
              min={obterHoje()}
              onChange={(event) => setDataSelecionada(event.target.value)}
            />

            <label htmlFor="goal-recurrence">Repetir meta</label>
            <select
              id="goal-recurrence"
              value={tipoRepeticao}
              onChange={(event) => {
                setTipoRepeticao(event.target.value as TipoRepeticao);
                setDiasSelecionados([]);
              }}
            >
              <option value="nenhuma">Não repetir</option>
              <option value="diaria">Todo dia</option>
              <option value="dias_semana">Dias da semana</option>
              <option value="semanal">Uma vez por semana</option>
              <option value="mensal">Uma vez por mês</option>
            </select>

            {tipoRepeticao === "dias_semana" && (
              <div className="weekday-picker">
                <span className="weekday-picker-title">
                  Em quais dias você quer repetir?
                </span>

                <div className="weekday-options">
                  {DIAS.map((dia) => (
                    <button
                      type="button"
                      key={dia.numero}
                      className={
                        diasSelecionados.includes(dia.numero) ? "active" : ""
                      }
                      aria-pressed={diasSelecionados.includes(dia.numero)}
                      title={dia.completo}
                      onClick={() => alternarDia(dia.numero)}
                    >
                      {dia.nome}
                    </button>
                  ))}
                </div>

                <p className="recurrence-help">
                  Selecione um ou mais dias. A primeira ocorrência será no
                  próximo dia escolhido a partir da data inicial.
                </p>
              </div>
            )}

            {tipoRepeticao !== "dias_semana" && (
              <p className="recurrence-help">
                {tipoRepeticao === "nenhuma" &&
                  "A meta será criada somente uma vez."}
                {tipoRepeticao === "diaria" &&
                  "A próxima ocorrência será criada para o dia seguinte quando você concluir a meta."}
                {tipoRepeticao === "semanal" &&
                  "A próxima ocorrência será criada sete dias depois da conclusão."}
                {tipoRepeticao === "mensal" &&
                  "A próxima ocorrência será criada no mesmo dia do mês seguinte."}
              </p>
            )}

            <button
              type="submit"
              className="add-goal-button"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editandoId
                  ? "Salvar alterações"
                  : "Adicionar meta"}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

export default Metas;
