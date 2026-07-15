import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft,
  DollarSign, PiggyBank, RefreshCw, Calendar, Download,
  PieChart, FileText, Users
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from "recharts";
import { supabase } from "./supabaseClient";

// Quantos meses de previsão mostrar à frente
const MESES_PREVISAO = 3;
// Quantos meses de histórico usar como base pra calcular a tendência
const JANELA_REGRESSAO = 6;

// Cores para o gráfico de pizza
const CORES_RECEITAS = ['#4E7A44', '#6B9E5A', '#8FC07A', '#B3D9A8'];
const CORES_DESPESAS = ['#A83E2C', '#C95A45', '#E07A64', '#EAA58C'];

function formatarMoeda(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeMes(dataISO) {
  if (!dataISO) return '';
  const d = new Date(dataISO + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function mesCompleto(dataISO) {
  if (!dataISO) return '';
  const d = new Date(dataISO + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Regressão linear simples
function regressaoLinear(valores) {
  const n = valores.length;
  if (n < 2) return { slope: 0, intercept: valores[0] || 0 };
  const somaX = valores.reduce((s, _, i) => s + i, 0);
  const somaY = valores.reduce((s, v) => s + v, 0);
  const somaXY = valores.reduce((s, v, i) => s + i * v, 0);
  const somaX2 = valores.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX || 1);
  const intercept = (somaY - slope * somaX) / n;
  return { slope, intercept };
}

export default function FinanceiroDashboard({ onVoltar }) {
  // ===== ESTADOS =====
  const [fluxo, setFluxo] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [periodoMeses, setPeriodoMeses] = useState(12); // 6, 12, 24
  const [abaDetalhe, setAbaDetalhe] = useState('fluxo'); // 'fluxo' ou 'composicao'

  // ===== FUNÇÃO DE CARREGAMENTO =====
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [fluxoRes, saldoRes] = await Promise.all([
        supabase.from("fluxo_caixa_mensal").select("*").order("mes", { ascending: true }),
        supabase.from("saldo_previsto").select("*").single(),
      ]);

      if (fluxoRes.error) throw new Error(fluxoRes.error.message);
      if (saldoRes.error) throw new Error(saldoRes.error.message);

      // Filtrar pelo período selecionado
      const dataAtual = new Date();
      const dataCorte = new Date(dataAtual);
      dataCorte.setMonth(dataCorte.getMonth() - periodoMeses);

      const fluxoFiltrado = (fluxoRes.data || []).filter(item => {
        const dataItem = new Date(item.mes + "T00:00:00");
        return dataItem >= dataCorte;
      });

      setFluxo(fluxoFiltrado);
      setSaldo(saldoRes.data || { a_receber: 0, a_pagar: 0, saldo_realizado: 0 });
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      setErro(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }, [periodoMeses]);

  useEffect(() => {
    carregar();
  }, [carregar, periodoMeses]);

  // ===== CÁLCULO DOS DADOS DO GRÁFICO =====
  const dadosGrafico = useMemo(() => {
    if (fluxo.length === 0) return [];

    const historico = fluxo.map((f) => ({
      mes: nomeMes(f.mes),
      mesCompleto: mesCompleto(f.mes),
      entradas: Number(f.entradas) || 0,
      saidas: Number(f.saidas) || 0,
      saldo: Number(f.saldo_mes) || 0,
    }));

    // Calcular regressão
    const janela = fluxo.slice(-JANELA_REGRESSAO);
    const entradasHist = janela.map((f) => Number(f.entradas) || 0);
    const saidasHist = janela.map((f) => Number(f.saidas) || 0);

    const regEntradas = regressaoLinear(entradasHist);
    const regSaidas = regressaoLinear(saidasHist);

    const ultimoMes = fluxo.length > 0 ? new Date(fluxo[fluxo.length - 1].mes + "T00:00:00") : new Date();
    const futuro = [];
    for (let i = 1; i <= MESES_PREVISAO; i++) {
      const idx = janela.length - 1 + i;
      const entradasProj = Math.max(0, regEntradas.slope * idx + regEntradas.intercept);
      const saidasProj = Math.max(0, regSaidas.slope * idx + regSaidas.intercept);
      const dataFutura = new Date(ultimoMes);
      dataFutura.setMonth(dataFutura.getMonth() + i);
      futuro.push({
        mes: nomeMes(dataFutura.toISOString().slice(0, 10)),
        mesCompleto: mesCompleto(dataFutura.toISOString().slice(0, 10)),
        entradasPrevistas: Math.round(entradasProj * 100) / 100,
        saidasPrevistas: Math.round(saidasProj * 100) / 100,
        saldoPrevisto: Math.round((entradasProj - saidasProj) * 100) / 100,
      });
    }

    if (historico.length > 0) {
      historico[historico.length - 1].saldoPrevisto = historico[historico.length - 1].saldo;
    }

    return [...historico, ...futuro];
  }, [fluxo]);

  // ===== DADOS PARA COMPOSIÇÃO (último mês) =====
  const dadosComposicao = useMemo(() => {
    if (fluxo.length === 0) return { receitas: [], despesas: [] };

    const ultimo = fluxo[fluxo.length - 1];
    // Aqui você pode buscar categorias reais se tiver na tabela contas_pagar/receber
    // Por enquanto, usamos dados simulados baseados no total
    const totalEntradas = Number(ultimo.entradas) || 0;
    const totalSaidas = Number(ultimo.saidas) || 0;

    // Simulando categorias (substituir por dados reais)
    const receitas = [
      { name: 'Vendas', value: totalEntradas * 0.7 },
      { name: 'Serviços', value: totalEntradas * 0.2 },
      { name: 'Outras', value: totalEntradas * 0.1 },
    ];

    const despesas = [
      { name: 'Pessoal', value: totalSaidas * 0.35 },
      { name: 'Operacional', value: totalSaidas * 0.25 },
      { name: 'Impostos', value: totalSaidas * 0.2 },
      { name: 'Outras', value: totalSaidas * 0.2 },
    ];

    return { receitas, despesas };
  }, [fluxo]);

  // ===== TENDÊNCIA =====
  const tendenciaSaldo = useMemo(() => {
    if (fluxo.length < 2) return null;
    const ultimos = fluxo.slice(-2);
    const anterior = Number(ultimos[0].saldo_mes) || 0;
    const atual = Number(ultimos[1].saldo_mes) || 0;
    return atual - anterior;
  }, [fluxo]);

  // ===== SALDO PROJETADO =====
  const saldoProjetado = useMemo(() => {
    if (!saldo) return 0;
    return Number(saldo.saldo_realizado) + Number(saldo.a_receber) - Number(saldo.a_pagar);
  }, [saldo]);

  // ===== HANDLER DE EXPORTAÇÃO =====
  const exportarCSV = () => {
    if (fluxo.length === 0) return;
    const headers = ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)'];
    const rows = fluxo.map(f => [
      f.mes,
      Number(f.entradas).toFixed(2).replace('.', ','),
      Number(f.saidas).toFixed(2).replace('.', ','),
      Number(f.saldo_mes).toFixed(2).replace('.', ',')
    ]);
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo_caixa_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // ===== RENDER =====
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl shadow-green-900/30 border border-green-600/30">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {onVoltar && (
                <button
                  onClick={onVoltar}
                  className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl border border-white/20 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Wallet size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Painel Financeiro</h1>
                <p className="text-sm text-green-100">Fluxo de caixa, previsões e indicadores</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={carregar}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <RefreshCw size={16} /> Atualizar
              </button>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 px-3 py-2 rounded-xl text-sm font-medium transition-all"
              >
                <Download size={16} /> Exportar CSV
              </button>
            </div>
          </div>
        </header>

        {/* ERRO */}
        {erro && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={22} />
            <div className="flex-1">
              <p className="font-semibold text-red-700">{erro}</p>
              <button
                onClick={carregar}
                className="mt-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* FILTRO DE PERÍODO */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setPeriodoMeses(6)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodoMeses === 6 ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Últimos 6 meses
            </button>
            <button
              onClick={() => setPeriodoMeses(12)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodoMeses === 12 ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Últimos 12 meses
            </button>
            <button
              onClick={() => setPeriodoMeses(24)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodoMeses === 24 ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Últimos 24 meses
            </button>
          </div>
          <span className="text-xs text-gray-500">
            Exibindo <strong>{fluxo.length}</strong> meses
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
              <PiggyBank size={16} /> Saldo realizado
            </div>
            <p className={`text-xl font-bold ${saldo?.saldo_realizado >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatarMoeda(saldo?.saldo_realizado)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
              <TrendingUp size={16} /> A receber
            </div>
            <p className="text-xl font-bold text-green-600">{formatarMoeda(saldo?.a_receber)}</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase mb-1">
              <TrendingDown size={16} /> A pagar
            </div>
            <p className="text-xl font-bold text-red-600">{formatarMoeda(saldo?.a_pagar)}</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-green-300 shadow-md p-5">
            <div className="flex items-center gap-2 text-green-700 text-xs font-semibold uppercase mb-1">
              <DollarSign size={16} /> Saldo projetado
            </div>
            <p className={`text-xl font-bold ${saldoProjetado >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatarMoeda(saldoProjetado)}
            </p>
          </div>
        </div>

        {/* GRÁFICO PRINCIPAL */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-bold text-gray-800">📊 Fluxo de caixa mensal</h2>
            <span className="text-xs text-gray-400">
              Linha pontilhada = previsão (regressão linear)
            </span>
          </div>

          {dadosGrafico.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Ainda não há lançamentos suficientes (contas pagas/recebidas) para gerar o fluxo de caixa.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatarMoeda(v)} labelFormatter={(label) => `Mês: ${label}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="#4E7A44" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#A83E2C" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="saldo" name="Saldo (realizado)" stroke="#2F4A34" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line
                  type="monotone"
                  dataKey="saldoPrevisto"
                  name="Saldo (previsto)"
                  stroke="#B9791E"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ABAS DE DETALHAMENTO */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAbaDetalhe('fluxo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              abaDetalhe === 'fluxo'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText size={16} />
            Detalhamento Mensal
          </button>
          <button
            onClick={() => setAbaDetalhe('composicao')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              abaDetalhe === 'composicao'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <PieChart size={16} />
            Composição (último mês)
          </button>
          <button
            onClick={() => setAbaDetalhe('vendedores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              abaDetalhe === 'vendedores'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Users size={16} />
            Vendedores
          </button>
        </div>

        {/* ABA: DETALHAMENTO MENSAL */}
        {abaDetalhe === 'fluxo' && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mês</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entradas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saídas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fluxo.slice().reverse().map((f, idx) => {
                    const entradas = Number(f.entradas) || 0;
                    const saidas = Number(f.saidas) || 0;
                    const saldo = Number(f.saldo_mes) || 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {mesCompleto(f.mes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatarMoeda(entradas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatarMoeda(saidas)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${saldo >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {formatarMoeda(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: COMPOSIÇÃO (PIZZA) */}
        {abaDetalhe === 'composicao' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-3 text-center">📈 Receitas</h3>
              {dadosComposicao.receitas.every(r => r.value === 0) ? (
                <div className="text-center py-8 text-gray-400">Sem dados de receitas neste mês</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={dadosComposicao.receitas}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosComposicao.receitas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_RECEITAS[index % CORES_RECEITAS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatarMoeda(v)} />
                  </RePieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-3 text-center">📉 Despesas</h3>
              {dadosComposicao.despesas.every(d => d.value === 0) ? (
                <div className="text-center py-8 text-gray-400">Sem dados de despesas neste mês</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={dadosComposicao.despesas}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosComposicao.despesas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_DESPESAS[index % CORES_DESPESAS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatarMoeda(v)} />
                  </RePieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ABA: VENDEDORES (link para o VendedoresDashboard) */}
        {abaDetalhe === 'vendedores' && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md p-5 mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-3">📊 Indicadores de Vendedores</h3>
            <p className="text-sm text-gray-500 mb-4">
              Acesse o dashboard completo de vendedores na aba "Vendedores" do módulo financeiro.
            </p>
            <button
              onClick={() => window.location.href = '#vendedores'}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
            >
              Ir para Vendedores
            </button>
          </div>
        )}

        {/* TENDÊNCIA */}
        {tendenciaSaldo !== null && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
            tendenciaSaldo >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
          }`}>
            {tendenciaSaldo >= 0 ? "📈" : "📉"} O saldo mensal {tendenciaSaldo >= 0 ? "melhorou" : "piorou"} em{" "}
            {formatarMoeda(Math.abs(tendenciaSaldo))} em relação ao mês anterior.
          </div>
        )}
      </div>
    </div>
  );
}