import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, AlertOctagon, PackageX, PackageMinus, ArrowLeftRight, Plus, Trash2, Pencil, X, Check, Package, Search, History, MapPin } from "lucide-react";
import { supabase } from "./supabaseClient";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un"];
const LOCAIS = [
  "Casa de Adubo - Depósito",
  "Casa de Adubo - Balcão",
  "Porteira - Depósito",
  "Porteira - Balcão",
  "Sérgio - Depósito",
  "Luciano - Depósito",
];
const vazio = { nome: "", lote: "", validade: "", quantidade: "", unidade: "L", minimo: "", local: LOCAIS[2] };

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

function formatarDataHoraBR(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  const [filtroLocal, setFiltroLocal] = useState("todos");

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [itemRetirar, setItemRetirar] = useState(null);
  const [qtdRetirar, setQtdRetirar] = useState("");
  const [motivoRetirar, setMotivoRetirar] = useState("");

  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [itemTransferir, setItemTransferir] = useState(null);
  const [localDestino, setLocalDestino] = useState("");
  const [qtdTransferir, setQtdTransferir] = useState("");
  const [motivoTransferir, setMotivoTransferir] = useState("");

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
      local: item.local || LOCAIS[2],
    });
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() { setMostrarForm(false); setForm(vazio); setEditandoId(null); }

  async function salvarForm() {
    if (!form.nome.trim() || !form.lote.trim() || !form.validade || form.quantidade === "" || form.minimo === "" || !form.local) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    const dados = {
      nome: form.nome.trim(), lote: form.lote.trim(), validade: form.validade,
      quantidade: parseFloat(form.quantidade), unidade: form.unidade, minimo: parseFloat(form.minimo),
      local: form.local,
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
    setErro("");
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
    if (!qtd || qtd <= 0) { setErro("Informe uma quantidade válida para retirar."); return; }
    if (qtd > itemRetirar.quantidade) { setErro(`Só há ${itemRetirar.quantidade} ${itemRetirar.unidade} em estoque.`); return; }

    setSalvando(true);
    setErro("");
    const { error: erroUpdate } = await supabase
      .from("itens")
      .update({ quantidade: itemRetirar.quantidade - qtd })
      .eq("id", itemRetirar.id);

    if (erroUpdate) { setErro("Erro ao dar baixa no estoque."); setSalvando(false); return; }

    await supabase.from("movimentacoes").insert({
      item_id: itemRetirar.id,
      item_nome: itemRetirar.nome,
      tipo: "saida",
      quantidade: qtd,
      unidade: itemRetirar.unidade,
      local_origem: itemRetirar.local,
      local_destino: null,
      motivo: motivoRetirar.trim() || null,
    });

    await carregarItens();
    setSalvando(false);
    fecharRetirar();
  }

  function abrirTransferir(item) {
    setItemTransferir(item);
    setLocalDestino(LOCAIS.find((l) => l !== item.local) || "");
    setQtdTransferir("");
    setMotivoTransferir("");
    setErro("");
    setMostrarTransferir(true);
  }

  function fecharTransferir() {
    setMostrarTransferir(false);
    setItemTransferir(null);
    setLocalDestino("");
    setQtdTransferir("");
    setMotivoTransferir("");
  }

  async function confirmarTransferencia() {
    const qtd = parseFloat(qtdTransferir);
    if (!qtd || qtd <= 0) { setErro("Informe uma quantidade válida para transferir."); return; }
    if (qtd > itemTransferir.quantidade) { setErro(`Só há ${itemTransferir.quantidade} ${itemTransferir.unidade} disponível.`); return; }
    if (!localDestino || localDestino === itemTransferir.local) { setErro("Escolha um local de destino diferente do atual."); return; }

    setSalvando(true);
    setErro("");

    const { error: erroOrigem } = await supabase
      .from("itens")
      .update({ quantidade: itemTransferir.quantidade - qtd })
      .eq("id", itemTransferir.id);

    if (erroOrigem) { setErro("Erro ao atualizar o local de origem."); setSalvando(false); return; }

    const { data: existente } = await supabase
      .from("itens")
      .select("*")
      .eq("nome", itemTransferir.nome)
      .eq("lote", itemTransferir.lote)
      .eq("local", localDestino)
      .maybeSingle();

    let erroDestino = null;
    if (existente) {
      const r = await supabase.from("itens").update({ quantidade: existente.quantidade + qtd }).eq("id", existente.id);
      erroDestino = r.error;
    } else {
      const r = await supabase.from("itens").insert({
        nome: itemTransferir.nome,
        lote: itemTransferir.lote,
        validade: itemTransferir.validade,
        quantidade: qtd,
        unidade: itemTransferir.unidade,
        minimo: itemTransferir.minimo,
        local: localDestino,
      });
      erroDestino = r.error;
    }

    if (erroDestino) { setErro("Erro ao criar/atualizar item no destino."); setSalvando(false); return; }

    await supabase.from("movimentacoes").insert({
      item_id: itemTransferir.id,
      item_nome: itemTransferir.nome,
      tipo: "transferencia",
      quantidade: qtd,
      unidade: itemTransferir.unidade,
      local_origem: itemTransferir.local,
      local_destino: localDestino,
      motivo: motivoTransferir.trim() || null,
    });

    await carregarItens();
    setSalvando(false);
    fecharTransferir();
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
    if (filtroLocal !== "todos") lista = lista.filter((i) => i.local === filtroLocal);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter((i) => i.nome.toLowerCase().includes(b) || i.lote.toLowerCase().includes(b));
    }
    return [...lista].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  }, [itensComStatus, filtroAlerta, filtroLocal, busca]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 mb-8 shadow-lg shadow-emerald-900/10">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -right-4 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Package size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Controle de Depósito</h1>
                <p className="text-sm text-emerald-50/90">Defensivos agrícolas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={abrirHistorico}
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/20 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all">
                <History size={18} /> Histórico
              </button>
              <button onClick={abrirNovo}
                className="flex items-center gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
                <Plus size={18} /> Novo item
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button onClick={() => setFiltroAlerta(filtroAlerta === "vencidos" ? "todos" : "vencidos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-lg hover:-translate-y-0.5 ${alertas.vencidos > 0 ? "border-red-100 shadow-sm shadow-red-100" : "border-slate-100"} ${filtroAlerta === "vencidos" ? "ring-2 ring-red-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.vencidos > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <PackageX className={alertas.vencidos > 0 ? "text-red-600" : "text-slate-300"} size={22} />
            </div>
            <div><p className="text-2xl font-bold text-slate-800">{alertas.vencidos}</p><p className="text-xs text-slate-500 font-medium">Produtos vencidos</p></div>
          </button>
          <button onClick={() => setFiltroAlerta(filtroAlerta === "proximos" ? "todos" : "proximos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-lg hover:-translate-y-0.5 ${alertas.proximos > 0 ? "border-amber-100 shadow-sm shadow-amber-100" : "border-slate-100"} ${filtroAlerta === "proximos" ? "ring-2 ring-amber-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.proximos > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
              <AlertTriangle className={alertas.proximos > 0 ? "text-amber-600" : "text-slate-300"} size={22} />
            </div>
            <div><p className="text-2xl font-bold text-slate-800">{alertas.proximos}</p><p className="text-xs text-slate-500 font-medium">Vencendo em {DIAS_ALERTA_VENCIMENTO} dias</p></div>
          </button>
          <button onClick={() => setFiltroAlerta(filtroAlerta === "baixos" ? "todos" : "baixos")}
            className={`group flex items-center gap-4 p-5 rounded-2xl border text-left bg-white transition-all hover:shadow-lg hover:-translate-y-0.5 ${alertas.baixos > 0 ? "border-orange-100 shadow-sm shadow-orange-100" : "border-slate-100"} ${filtroAlerta === "baixos" ? "ring-2 ring-orange-400" : ""}`}>
            <div className={`p-3 rounded-xl ${alertas.baixos > 0 ? "bg-orange-50" : "bg-slate-50"}`}>
              <AlertOctagon className={alertas.baixos > 0 ? "text-orange-600" : "text-slate-300"} size={22} />
            </div>
            <div><p className="text-2xl font-bold text-slate-800">{alertas.baixos}</p><p className="text-xs text-slate-500 font-medium">Estoque baixo</p></div>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou lote..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow" />
          </div>
          <div className="relative sm:w-64">
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none">
              <option value="todos">Todos os locais</option>
              {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {erro && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{erro}</div>}

        <div className="space-y-3">
          {carregando ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-sm">Carregando itens...</div>
          ) : listaFiltrada.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-400 text-sm">{itens.length === 0 ? "Nenhum item cadastrado ainda." : "Nenhum item corresponde ao filtro."}</div>
          ) : (
            listaFiltrada.map((it) => {
              const pct = it.minimo > 0 ? Math.min(100, Math.round((it.quantidade / (it.minimo * 2)) * 100)) : 100;
              return (
                <div key={it.id} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 truncate">{it.nome}</p>
                        <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium"><MapPin size={12}/> {it.local}</span>
                        {it.vencido && <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium"><PackageX size={12}/> Vencido</span>}
                        {it.proximoVencimento && <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium"><AlertTriangle size={12}/> Vence em {it.dias}d</span>}
                        {it.estoqueBaixo && <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium"><AlertOctagon size={12}/> Estoque baixo</span>}
                      </div>
                      <p className="text-xs text-slate-500">Lote {it.lote} · Validade {formatarDataBR(it.validade)} · {it.quantidade} {it.unidade} (mín. {it.minimo} {it.unidade})</p>
                      <div className="mt-2.5 h-1.5 w-full max-w-xs bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${corProgresso(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => abrirTransferir(it)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Transferir"><ArrowLeftRight size={16} /></button>
                      <button onClick={() => abrirRetirar(it)} className="p-2.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors" title="Dar baixa / retirar"><PackageMinus size={16} /></button>
                      <button onClick={() => abrirEdicao(it)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => excluir(it.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-emerald-600 to-teal-700">
              <h2 className="font-semibold text-white text-lg">{editandoId ? "Editar item" : "Novo item"}</h2>
              <button onClick={fecharForm} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome do produto *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: Glifosato 480" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Local de armazenamento *</label>
                <select value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {LOCAIS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Lote *</label>
                  <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Ex: L2024-08" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Validade *</label>
                  <input type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Quantidade *</label>
                  <input type="number" step="any" min="0" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Unidade</label>
                  <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Mínimo *</label>
                  <input type="number" step="any" min="0" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharForm} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={salvarForm} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarRetirar && itemRetirar && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-teal-600 to-emerald-700">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><PackageMinus size={20}/> Dar baixa no estoque</h2>
              <button onClick={fecharRetirar} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="font-medium text-slate-800">{itemRetirar.nome}</p>
                <p className="text-xs text-slate-500">{itemRetirar.local} · Lote {itemRetirar.lote} · Disponível: {itemRetirar.quantidade} {itemRetirar.unidade}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Quantidade a retirar *</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" step="any" min="0" max={itemRetirar.quantidade} value={qtdRetirar}
                    onChange={(e) => setQtdRetirar(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <span className="text-sm text-slate-500 shrink-0">{itemRetirar.unidade}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Motivo / aplicação (opcional)</label>
                <input value={motivoRetirar} onChange={(e) => setMotivoRetirar(e.target.value)}
                  placeholder="Ex: Aplicação talhão 3"
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharRetirar} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={confirmarRetirada} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Salvando..." : "Confirmar baixa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarTransferir && itemTransferir && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-indigo-600 to-violet-700">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><ArrowLeftRight size={20}/> Transferir entre locais</h2>
              <button onClick={fecharTransferir} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="font-medium text-slate-800">{itemTransferir.nome}</p>
                <p className="text-xs text-slate-500">Lote {itemTransferir.lote} · Disponível: {itemTransferir.quantidade} {itemTransferir.unidade}</p>
                <p className="text-xs text-slate-500 mt-1">De: <span className="font-medium text-slate-700">{itemTransferir.local}</span></p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Transferir para *</label>
                <select value={localDestino} onChange={(e) => setLocalDestino(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {LOCAIS.filter((l) => l !== itemTransferir.local).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Quantidade a transferir *</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" step="any" min="0" max={itemTransferir.quantidade} value={qtdTransferir}
                    onChange={(e) => setQtdTransferir(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <span className="text-sm text-slate-500 shrink-0">{itemTransferir.unidade}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Observação (opcional)</label>
                <input value={motivoTransferir} onChange={(e) => setMotivoTransferir(e.target.value)}
                  placeholder="Ex: Reposição de balcão"
                  className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{erro}</div>}
              <div className="flex gap-2 pt-1">
                <button onClick={fecharTransferir} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={confirmarTransferencia} disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60">
                  <Check size={16} /> {salvando ? "Transferindo..." : "Confirmar transferência"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-emerald-600 to-teal-700 shrink-0">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2"><History size={20}/> Histórico de movimentações</h2>
              <button onClick={() => setMostrarHistorico(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              {carregandoHistorico ? (
                <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma movimentação registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{h.item_nome}</p>
                        <p className="text-xs text-slate-500">
                          {formatarDataHoraBR(h.criado_em)}
                          {h.tipo === "transferencia" ? ` · ${h.local_origem} → ${h.local_destino}` : ` · ${h.local_origem || ""}`}
                          {h.motivo ? ` · ${h.motivo}` : ""}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${h.tipo === "transferencia" ? "text-indigo-700" : "text-teal-700"}`}>
                        {h.tipo === "transferencia" ? "" : "-"}{h.quantidade} {h.unidade}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
