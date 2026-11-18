
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";
import "../styles/Diario.css";

type RegistroDiario = {
  id: string;
  user_id: string;
  data: string;
  aprendizado: string;
  realizacoes: string;
  melhorar: string;
  humor: number | null;
  created_at: string;
  updated_at: string;
};

const HUMORES = [
  { valor: 1, emoji: "😞", nome: "Muito difícil" },
  { valor: 2, emoji: "😕", nome: "Difícil" },
  { valor: 3, emoji: "😐", nome: "Normal" },
  { valor: 4, emoji: "🙂", nome: "Bom" },
  { valor: 5, emoji: "😄", nome: "Excelente" },
];

function obterDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function converterDataISO(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function adicionarMeses(data: Date, quantidade: number): Date {
  return new Date(
    data.getFullYear(),
    data.getMonth() + quantidade,
    1
  );
}

function Diario() {
  const navigate = useNavigate();

  const hoje = obterDataISO(new Date());

  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(hoje);
  const [mesVisualizado, setMesVisualizado] = useState(new Date());

  const [aprendizado, setAprendizado] = useState("");
  const [realizacoes, setRealizacoes] = useState("");
  const [melhorar, setMelhorar] = useState("");
  const [humor, setHumor] = useState<number | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const registroSelecionado = useMemo(
    () => registros.find((registro) => registro.data === dataSelecionada),
    [registros, dataSelecionada]
  );

  useEffect(() => {
    async function buscarRegistros() {
      const { data: usuarioData, error: usuarioErro } =
        await supabase.auth.getUser();

      if (usuarioErro || !usuarioData.user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("diario_evolucao")
        .select("*")
        .eq("user_id", usuarioData.user.id)
        .order("data", { ascending: false });

      if (error) {
        console.error("Erro ao buscar diário:", error);
        setErro(`Não foi possível carregar o diário: ${error.message}`);
        setCarregando(false);
        return;
      }

      setRegistros((data ?? []) as RegistroDiario[]);
      setCarregando(false);
    }

    buscarRegistros();
  }, [navigate]);

  useEffect(() => {
    setAprendizado(registroSelecionado?.aprendizado ?? "");
    setRealizacoes(registroSelecionado?.realizacoes ?? "");
    setMelhorar(registroSelecionado?.melhorar ?? "");
    setHumor(registroSelecionado?.humor ?? null);
    setErro("");
    setMensagem("");
  }, [registroSelecionado, dataSelecionada]);

  function selecionarData(data: string) {
    if (data > hoje) return;
    setDataSelecionada(data);
  }

  function mudarMes(direcao: number) {
    setMesVisualizado((atual) => adicionarMeses(atual, direcao));
  }

  const diasCalendario = useMemo(() => {
    const ano = mesVisualizado.getFullYear();
    const mes = mesVisualizado.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

    return [
      ...Array.from({ length: primeiroDia.getDay() }, (_, index) => ({
        vazio: true as const,
        id: `vazio-${index}`,
      })),
      ...Array.from({ length: quantidadeDias }, (_, index) => {
        const data = obterDataISO(new Date(ano, mes, index + 1));

        return {
          vazio: false as const,
          data,
          numero: index + 1,
        };
      }),
    ];
  }, [mesVisualizado]);

  const mesNome = mesVisualizado.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const dataLegivel = converterDataISO(dataSelecionada).toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  const totalRegistros = registros.length;

  const diasComHumor = registros.filter(
    (registro) => registro.humor !== null
  );

  const humorMedio = diasComHumor.length
    ? (
        diasComHumor.reduce(
          (soma, registro) => soma + (registro.humor ?? 0),
          0
        ) / diasComHumor.length
      ).toFixed(1)
    : "—";

  async function salvarRegistro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (dataSelecionada > hoje) {
      setErro("Não é possível registrar reflexões em datas futuras.");
      return;
    }

    if (
      !aprendizado.trim() &&
      !realizacoes.trim() &&
      !melhorar.trim() &&
      humor === null
    ) {
      setErro("Preencha pelo menos um campo ou escolha como foi seu dia.");
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const { data: usuarioData, error: usuarioErro } =
        await supabase.auth.getUser();

      if (usuarioErro || !usuarioData.user) {
        navigate("/login");
        return;
      }

      const agora = new Date().toISOString();

      const { data, error } = await supabase
        .from("diario_evolucao")
        .upsert(
          {
            user_id: usuarioData.user.id,
            data: dataSelecionada,
            aprendizado: aprendizado.trim(),
            realizacoes: realizacoes.trim(),
            melhorar: melhorar.trim(),
            humor,
            updated_at: agora,
          },
          {
            onConflict: "user_id,data",
          }
        )
        .select()
        .single();

      if (error) throw error;

      setRegistros((atuais) => {
        const outros = atuais.filter(
          (registro) => registro.data !== dataSelecionada
        );

        return [...outros, data as RegistroDiario].sort(
          (a, b) => b.data.localeCompare(a.data)
        );
      });

      setMensagem("Sua reflexão foi salva com carinho. ✨");
    } catch (error: unknown) {
      console.error("Erro ao salvar diário:", error);

      if (error instanceof Error) {
        setErro(error.message);
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        setErro(String(error.message));
      } else {
        setErro("Não foi possível salvar sua reflexão.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRegistro() {
    if (!registroSelecionado) return;

    if (!window.confirm("Deseja excluir a reflexão deste dia?")) {
      return;
    }

    const { data: usuarioData, error: usuarioErro } =
      await supabase.auth.getUser();

    if (usuarioErro || !usuarioData.user) {
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("diario_evolucao")
      .delete()
      .eq("id", registroSelecionado.id)
      .eq("user_id", usuarioData.user.id);

    if (error) {
      console.error("Erro ao excluir reflexão:", error);
      setErro(`Não foi possível excluir: ${error.message}`);
      return;
    }

    setRegistros((atuais) =>
      atuais.filter((registro) => registro.id !== registroSelecionado.id)
    );

    setMensagem("Reflexão excluída.");
  }

  return (
    <main className="diario-container">
      <Header />

      <section className="diario-intro">
        <span className="diario-eyebrow">UM MOMENTO PARA VOCÊ</span>
        <h1>Diário de evolução</h1>
        <p>
          Nem todo progresso é visível. Reserve um momento para reconhecer
          o que aconteceu no seu dia.
        </p>
      </section>

      <section className="diario-stats">
        <article className="diario-stat-card">
          <span>📖</span>
          <div>
            <strong>{totalRegistros}</strong>
            <small>Reflexões registradas</small>
          </div>
        </article>

        <article className="diario-stat-card">
          <span>☀️</span>
          <div>
            <strong>{humorMedio}</strong>
            <small>Humor médio registrado</small>
          </div>
        </article>
      </section>

      {erro && (
        <div className="diario-alerta erro" role="alert">
          {erro}
          <button type="button" onClick={() => setErro("")}>×</button>
        </div>
      )}

      {mensagem && (
        <div className="diario-alerta sucesso" role="status">
          {mensagem}
          <button type="button" onClick={() => setMensagem("")}>×</button>
        </div>
      )}

      <section className="diario-layout">
        <aside className="diario-calendario">
          <div className="diario-calendario-header">
            <div>
              <span className="diario-eyebrow">SEU HISTÓRICO</span>
              <h2>{mesNome}</h2>
            </div>

            <div className="diario-mes-acoes">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() => mudarMes(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() => mudarMes(1)}
                disabled={
                  mesVisualizado.getFullYear() === new Date().getFullYear() &&
                  mesVisualizado.getMonth() === new Date().getMonth()
                }
              >
                ›
              </button>
            </div>
          </div>

          <div className="diario-calendario-grid">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
              <span className="diario-dia-semana" key={dia}>{dia}</span>
            ))}

            {diasCalendario.map((dia) => {
              if (dia.vazio) {
                return <span key={dia.id} />;
              }

              const temRegistro = registros.some(
                (registro) => registro.data === dia.data
              );

              const selecionado = dia.data === dataSelecionada;
              const eHoje = dia.data === hoje;
              const futuro = dia.data > hoje;

              return (
                <button
                  type="button"
                  key={dia.data}
                  disabled={futuro}
                  className={[
                    "diario-dia",
                    selecionado ? "selecionado" : "",
                    eHoje ? "hoje" : "",
                    temRegistro ? "com-registro" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => selecionarData(dia.data)}
                  title={
                    temRegistro
                      ? "Este dia possui uma reflexão"
                      : "Selecionar dia"
                  }
                >
                  {dia.numero}
                  {temRegistro && <i />}
                </button>
              );
            })}
          </div>

          <div className="diario-legenda">
            <span><i className="legenda-registro" /> Dia com reflexão</span>
            <span><i className="legenda-hoje" /> Hoje</span>
          </div>

          <div className="diario-historico">
            <h3>Últimas reflexões</h3>

            {registros.length === 0 ? (
              <p className="diario-sem-historico">
                Suas reflexões aparecerão aqui.
              </p>
            ) : (
              registros.slice(0, 5).map((registro) => (
                <button
                  type="button"
                  className={
                    registro.data === dataSelecionada
                      ? "historico-item ativo"
                      : "historico-item"
                  }
                  key={registro.id}
                  onClick={() => {
                    setDataSelecionada(registro.data);
                    setMesVisualizado(converterDataISO(registro.data));
                  }}
                >
                  <span>
                    {converterDataISO(registro.data).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short" }
                    )}
                  </span>
                  <span>
                    {HUMORES.find((item) => item.valor === registro.humor)
                      ?.emoji ?? "📖"}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="diario-form-card">
          <div className="diario-form-header">
            <div>
              <span className="diario-eyebrow">SUA REFLEXÃO</span>
              <h2>{dataLegivel}</h2>
            </div>

            {registroSelecionado && (
              <span className="diario-status">Registro salvo</span>
            )}
          </div>

          {carregando ? (
            <p className="diario-carregando">Carregando seu diário...</p>
          ) : (
            <form onSubmit={salvarRegistro}>
              <div className="diario-campo">
                <label htmlFor="aprendizado">
                  <span>✦</span> O que você aprendeu hoje?
                </label>
                <textarea
                  id="aprendizado"
                  value={aprendizado}
                  onChange={(event) => setAprendizado(event.target.value)}
                  placeholder="Pode ser algo dos estudos, do trabalho ou até uma descoberta sobre você..."
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="diario-campo">
                <label htmlFor="realizacoes">
                  <span>✓</span> O que você conseguiu realizar?
                </label>
                <textarea
                  id="realizacoes"
                  value={realizacoes}
                  onChange={(event) => setRealizacoes(event.target.value)}
                  placeholder="Não precisa ser algo grandioso. Pequenas conquistas também contam..."
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="diario-campo">
                <label htmlFor="melhorar">
                  <span>↗</span> O que poderia melhorar?
                </label>
                <textarea
                  id="melhorar"
                  value={melhorar}
                  onChange={(event) => setMelhorar(event.target.value)}
                  placeholder="Pense em algo que você gostaria de tentar de outra forma amanhã..."
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="diario-campo">
                <label>Como foi seu dia?</label>
                <div className="diario-humores">
                  {HUMORES.map((item) => (
                    <button
                      type="button"
                      key={item.valor}
                      className={
                        humor === item.valor ? "humor-selecionado" : ""
                      }
                      onClick={() =>
                        setHumor((atual) =>
                          atual === item.valor ? null : item.valor
                        )
                      }
                      aria-pressed={humor === item.valor}
                      title={item.nome}
                    >
                      <span>{item.emoji}</span>
                      <small>{item.nome}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="diario-form-acoes">
                {registroSelecionado && (
                  <button
                    type="button"
                    className="diario-excluir"
                    onClick={excluirRegistro}
                    disabled={salvando}
                  >
                    Excluir reflexão
                  </button>
                )}

                <button
                  type="submit"
                  className="diario-salvar"
                  disabled={salvando || dataSelecionada > hoje}
                >
                  {salvando
                    ? "Salvando..."
                    : registroSelecionado
                      ? "Salvar alterações"
                      : "Salvar reflexão"}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

export default Diario;
