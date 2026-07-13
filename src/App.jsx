import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, PackageX, PackageMinus,
  Plus, Trash2, Pencil, X, Check, Package, Search, History,
  LayoutDashboard, Clock, Layers, Home
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un"];
const vazio = { nome: "", lote: "", validade: "", quantidade: "", unidade: "L", minimo: "" };

function diasAte(dataStr) {
  if (!dataStr) return null;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const alvo = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

function formatarDataBR(str) {
  if (!str) return "-";
  const [ano, mes, dia] = str.split("-");
  return `${dia}/${mes}/${ano}`;
}

function corProgresso(pct) {
  if (pct <= 25) return "bg-red-500";
  if (pct <= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function App() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [itemRetirar, setItemRetirar] = useState(null);
  const [qtdRetirar, setQtdRetirar] = useState("");
  const [motivoRetirar, setMotivoRetirar] = useState("");

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  useEffect(() => { carregarItens(); }, []);

  async function carregarItens() {
    setCarregando(true);
    const { data, error } = await supabase.from("itens").select("*").order("validade", { ascending: true });
    if (error) setErro("Erro ao carregar itens.");
    else setItens(data || []);
    setCarregando(false);
  }

  function abrirNovo() { setForm(vazio); setEditandoId(null); setMostrarForm(true); }

  function abrirEdicao(item) {
    setForm({
      nome: item.nome, lote: item.lote, validade: item.validade,
      quantidade: String(item.quantidade), unidade: item.unidade, minimo: String(item.minimo),
    });
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() { setMostrarForm(false); setForm(vazio); setEditandoId(null); }

  async function salvarForm() {
    if (!form.nome.trim() || !form.lote.trim() || !form.validade || form.quantidade === "" || form.minimo === "") {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    const dados = {
      nome: form.nome.trim(), lote: form.lote.trim(), validade: form.validade,
      quantidade: parseFloat(form.quantidade), unidade: form.unidade, minimo: parseFloat(form.minimo),
    };
    const { error } = editandoId
      ? await supabase.from("itens").update(dados).eq("id", editandoId)
      : await supabase.from("itens").insert(dados);
    if (error) setErro("Erro ao salvar.");
    else { await carregarItens(); fecharForm(); }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este item do depósito?")) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) setErro("Erro ao excluir.");
    else carregarItens();
  }

  function abrirRetirar(item) {
    setItemRetirar(item);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMostrarRetirar(true);
  }

  function fecharRetirar() {
    setMostrarRetirar(false);
    setItemRetirar(null);
    setQtdRetirar("");
    setMotivoRetirar("");
  }

  async function confirmarRetirada() {
    const qtd = parseFloat(qtdRetirar);
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida para retirar.");
      return;
    }
    if (qtd > itemRetirar.quantidade) {
      setErro(`Só há ${itemRetirar.quantidade} ${itemRetirar.unidade} em estoque.`);
      return;
    }
    setSalvando(true);
    setErro("");
    const novaQuantidade = itemRetirar.quantidade - qtd;

    const { error: erroUpdate } = await supabase
      .from("itens")
      .update({ quantidade: novaQuantidade })
      .eq("id", itemRetirar.id);

    if (erroUpdate) {
      setErro("Erro ao dar baixa no estoque.");
      setSalvando(false);
      return;
    }

    await supabase.from("movimentacoes").insert({
      item_id: itemRetirar.id,
      item_nome: itemRetirar.nome,
      quantidade: qtd,
      unidade: itemRetirar.unidade,
      motivo: motivoRetirar.trim() || null,
    });

    await carregarItens();
    setSalvando(false);
    fecharRetirar();
  }

  async function abrirHistorico() {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50);
    if (!error) setHistorico(data || []);
    setCarregandoHistorico(false);
  }

  function formatarDataHoraBR(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const itensComStatus = useMemo(() => itens.map((it) => {
    const dias = diasAte(it.validade);
    const vencido = dias !== null && dias < 0;
    const proximoVencimento = !vencido && dias !== null && dias <= DIAS_ALERTA_VENCIMENTO;
    const estoqueBaixo = it.quantidade <= it.minimo;
    return { ...it, dias, vencido, proximoVencimento, estoqueBaixo };
  }), [itens]);

  const alertas = useMemo(() => ({
    vencidos: itensComStatus.filter((i) => i.vencido).length,
    proximos: itensComStatus.filter((i) => i.proximoVencimento).length,
    baixos: itensComStatus.filter((i) => i.estoqueBaixo).length,
  }), [itensComStatus]);

  const listaFiltrada = useMemo(() => {
    let lista = itensComStatus;
    if (filtroAlerta === "vencidos") lista = lista.filter((i) => i.vencido);
    if (filtroAlerta === "proximos") lista = lista.filter((i) => i.proximoVencimento);
    if (filtroAlerta === "baixos") lista = lista.filter((i) => i.estoqueBaixo);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter((i) => i.nome.toLowerCase().includes(b) || i.lote.toLowerCase().includes(b));
    }
    return [...lista].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  }, [itensComStatus, filtroAlerta, busca]);

  // ---------- JSX com novo design ----------
  return (
    <div className="min-h-screen bg-slate-50/80 flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200/80 shadow-sm sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-200">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Estoque</h1>
              <p className="text-xs text-slate-500">Defensivos agrícolas</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setFiltroAlerta("todos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filtroAlerta === "todos" ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <LayoutDashboard size={18} /> Todos os itens
          </button>
          <button
            onClick={() => setFiltroAlerta(filtroAlerta === "vencidos" ? "todos" : "vencidos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filtroAlerta === "vencidos" ? "bg-red-50 text-red-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <PackageX size={18} /> Vencidos <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{alertas.vencidos}</span>
          </button>
          <button
            onClick={() => setFiltroAlerta(filtroAlerta === "proximos" ? "todos" : "proximos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filtroAlerta === "proximos" ? "bg-amber-50 text-amber-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <AlertTriangle size={18} /> Vencendo em 90d <span className="ml-auto bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{alertas.proximos}</span>
          </button>
          <button
            onClick={() => setFiltroAlerta(filtroAlerta === "baixos" ? "todos" : "baixos")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filtroAlerta === "baixos" ? "bg-orange-50 text-orange-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <AlertOctagon size={18} /> Estoque baixo <span className="ml-auto bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{alertas.baixos}</span>
          </button>
          <hr className="my-4 border-slate-100" />
          <button
            onClick={abrirNovo}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
          >
            <Plus size={18} /> Novo item
          </button>
          <button
            onClick={abrirHistorico}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            <History size={18} /> Histórico
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
          {itens.length} itens cadastrados
        </div>
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Cabeçalho mobile (visível apenas em telas pequenas) */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg text-white"><Package size={20} /></div>
            <div><h1 className="text-lg font-bold text-slate-800">Estoque</h1><p className="text-xs text-slate-500">Defensivos</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={abrirNovo} className="bg-emerald-600 p-2 rounded-xl text-white shadow-md"><Plus size={20} /></button>
            <button onClick={abrirHistorico} className="bg-slate-100 p-2 rounded-xl text-slate-600"><History size={20} /></button>
          </div>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} /> {erro}
          </div>
        )}

        {/* Barra de busca */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou lote..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow"
          />
        </div>

        {/* Cards de estatísticas (mobile) */}
        <div className="grid grid-cols-3 gap-3 mb-6 md:hidden">
          <StatCard label="Vencidos" count={alertas.vencidos} icon={<PackageX size={18} />} color="red" />
          <StatCard label="Próximos" count={alertas.proximos} icon={<AlertTriangle size={18} />} color="amber" />
          <StatCard label="Baixos" count={alertas.baixos} icon={<AlertOctagon size={18} />} color="orange" />
        </div>

        {/* Lista de produtos */}
        <div className="space-y-3">
          {carregando ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-sm">Carregando...</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-sm">
              {itens.length === 0 ? "Nenhum item cadastrado. Clique em 'Novo item'." : "Nenhum item corresponde ao filtro."}
            </div>
          ) : (
            listaFiltrada.map((it) => {
              const pct = it.minimo > 0 ? Math.min(100, Math.round((it.quantidade / (it.minimo * 2)) * 100)) : 100;
              return (
                <div key={it.id} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-base truncate">{it.nome}</p>
                        {it.vencido && <Badge color="red" icon={<PackageX size={12} />}>Vencido</Badge>}
                        {it.proximoVencimento && <Badge color="amber" icon={<AlertTriangle size={12} />}>Vence em {it.dias}d</Badge>}
                        {it.estoqueBaixo && <Badge color="orange" icon={<AlertOctagon size={12} />}>Estoque baixo</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>Lote {it.lote} · Validade {formatarDataBR(it.validade)}</p>
                        <p>
                          <span className="font-medium text-slate-700">{it.quantidade} {it.unidade}</span>
                          <span className="mx-1">·</span>
                          mínimo {it.minimo} {it.unidade}
                        </p>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full max-w-xs bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${corProgresso(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => abrirRetirar(it)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors" title="Retirar"><PackageMinus size={18} /></button>
                      <button onClick={() => abrirEdicao(it)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Editar"><Pencil size={18} /></button>
                      <button onClick={() => excluir(it.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ===== MODAL DE FORMULÁRIO ===== */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-emerald-600 to-teal-700">
              <h2 className="font-semibold text-white text-lg">{editandoId ? "Editar item" : "Novo item"}</h2>
              <button onClick={fecharForm} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome do produto *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: Glifosato 480" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Lote *</label>
                  <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: L2024-08" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Validade *</label>
                  <input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Quantidade *</label>
                  <input type="number" step="any" min="0" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Unidade</label>
                  <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Mínimo *</label>
                  <input type="number" step="any" min="0" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={fecharForm} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={salvarForm} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE RETIRADA ===== */}
      {mostrarRetirar && itemRetirar && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gradient-to-br from-teal-600 to-cyan-700">
              <h2 className="font-semibold text-white">Retirar do estoque</h2>
              <p className="text-sm text-teal-50/80">{itemRetirar.nome} · {itemRetirar.quantidade} {itemRetirar.unidade} disponível</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Quantidade a retirar *</label>
                <input type="number" step="any" min="0" value={qtdRetirar} onChange={(e) => setQtdRetirar(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Ex: 5" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Motivo (opcional)</label>
                <input value={motivoRetirar} onChange={(e) => setMotivoRetirar(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Ex: Uso em campo" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={fecharRetirar} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={confirmarRetirada} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Processando..." : "Confirmar retirada"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE HISTÓRICO ===== */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-slate-700 to-slate-800">
              <h2 className="font-semibold text-white flex items-center gap-2"><History size={20} /> Histórico de movimentações</h2>
              <button onClick={() => setMostrarHistorico(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {carregandoHistorico ? (
                <p className="text-center text-slate-400 text-sm py-6">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">{mov.item_nome}</p>
                        <p className="text-xs text-slate-400">{formatarDataHoraBR(mov.criado_em)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm text-teal-600">-{mov.quantidade} {mov.unidade}</p>
                        {mov.motivo && <p className="text-xs text-slate-400">{mov.motivo}</p>}
                      </div>
                    </div>
                  ))}
                  {historico.length === 50 && <p className="text-xs text-slate-400 text-center pt-2">Mostrando as últimas 50 movimentações.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Componentes auxiliares ----
function Badge({ color, icon, children }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${colors[color] || colors.slate}`}>
      {icon} {children}
    </span>
  );
}

function StatCard({ label, count, icon, color }) {
  const colors = {
    red: "bg-red-50 border-red-100 text-red-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
  };
  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${colors[color]}`}>
      {icon}
      <span className="text-lg font-bold">{count}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}
