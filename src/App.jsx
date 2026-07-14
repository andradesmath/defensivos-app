import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, PackageX, PackageMinus,
  ArrowLeftRight, Plus, Trash2, Pencil, X, Check,
  Package, Search, History, MapPin, Sprout, Tractor, LogOut
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un"];

// ===== LOCAIS (prateleiras) =====
const LOCAIS = [
  "Casa de Adubo - Depósito",
  "Casa de Adubo - Balcão",
  "Porteira - Depósito",
  "Porteira - Balcão",
  "Sérgio - Depósito",
  "Luciano - Depósito",
  "Piatã - Depósito",
  "Piatã - Balcão",
];

// ===== MOTIVOS DE SAÍDA =====
const MOTIVOS_SAIDA = [
  "Aplicação",
  "Perda por Deterioração",
  "Perda por Validade",
  "Não Localizado",
  "Vendido",
  "Outro"
];

// ===== ESTADO INICIAL DO FORMULÁRIO =====
const vazio = {
  produto_id: "",
  nome: "",
  lote: "",
  validade: "",
  quantidade: "",
  unidade: "L",
  minimo: "",
  local: LOCAIS[2],
};

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
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function corProgresso(pct) {
  if (pct <= 25) return "bg-red-500";
  if (pct <= 60) return "bg-amber-500";
  return "bg-green-600";
}

function getStatusInfo(item) {
  if (item.vencido) return { label: "Vencido", class: "bg-red-100 text-red-700 border-red-300" };
  if (item.proximoVencimento) return { label: `Vence em ${item.dias}d`, class: "bg-amber-100 text-amber-700 border-amber-300" };
  if (item.estoqueBaixo) return { label: "Estoque baixo", class: "bg-orange-100 text-orange-700 border-orange-300" };
  return { label: "OK", class: "bg-green-100 text-green-700 border-green-300" };
}

export default function App() {
  // ===== SESSÃO E AUTENTICAÇÃO =====
  const [sessao, setSessao] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  // ===== DADOS =====
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [estoqueTotal, setEstoqueTotal] = useState([]);
  const [estoquePorLocal, setEstoquePorLocal] = useState([]); // para exibir no modal
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // ===== FORMULÁRIO =====
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);

  // ===== FILTROS =====
  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");
  const [filtroLocal, setFiltroLocal] = useState("todos");

  // ===== MODAIS =====
  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [itemRetirar, setItemRetirar] = useState(null);
  const [qtdRetirar, setQtdRetirar] = useState("");
  const [motivoRetirar, setMotivoRetirar] = useState("");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");

  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [itemTransferir, setItemTransferir] = useState(null);
  const [localDestino, setLocalDestino] = useState("");
  const [qtdTransferir, setQtdTransferir] = useState("");
  const [motivoTransferir, setMotivoTransferir] = useState("");

  // ===== HISTÓRICO =====
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [filtroHistorico, setFiltroHistorico] = useState('todos');

  // ===== EFETTO DE SESSÃO =====
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregandoSessao(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    if (sessao) {
      carregarProdutos();
      carregarItens();
      carregarEstoqueTotal();
    }
  }, [sessao]);

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error("Erro ao carregar produtos:", error);
    } else {
      setProdutos(data || []);
    }
  }

  async function carregarItens() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("itens")
      .select("*")
      .order("validade", { ascending: true });
    if (error) setErro("Erro ao carregar itens.");
    else setItens(data || []);
    setCarregando(false);
  }

  async function carregarEstoqueTotal() {
    const { data, error } = await supabase
      .from("estoque_total_produto")
      .select("*")
      .order("nome", { ascending: true });
    if (!error) setEstoqueTotal(data || []);
  }

  async function carregarEstoquePorProduto(produtoId) {
    if (!produtoId) return;
    const { data, error } = await supabase
      .from("estoque_por_local")
      .select("*")
      .eq("produto_id", produtoId);
    if (!error) setEstoquePorLocal(data || []);
  }

  // ===== LOGOUT =====
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ===== FUNÇÕES DO FORMULÁRIO =====
  function abrirNovo() {
    setForm({ ...vazio });
    setEditandoId(null);
    setMostrarForm(true);
  }

  function abrirEdicao(item) {
    setForm({
      produto_id: item.produto_id || "",
      nome: item.nome,
      lote: item.lote,
      validade: item.validade,
      quantidade: String(item.quantidade),
      unidade: item.unidade,
      minimo: String(item.minimo),
      local: item.local || LOCAIS[2],
    });
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setForm(vazio);
    setEditandoId(null);
  }

  function handleProdutoSelecionado(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      setForm({
        ...form,
        produto_id: produto.id,
        nome: produto.nome,
      });
    } else {
      setForm({ ...form, produto_id: "", nome: "" });
    }
  }

  async function salvarForm() {
    if (
      !form.produto_id ||
      !form.lote.trim() ||
      !form.validade ||
      form.quantidade === "" ||
      form.minimo === "" ||
      !form.local
    ) {
      setErro("Preencha todos os campos obrigatórios (produto, lote, validade, quantidade, mínimo e local).");
      return;
    }
    setSalvando(true);
    setErro("");
    const dados = {
      produto_id: form.produto_id,
      nome: form.nome.trim(),
      lote: form.lote.trim(),
      validade: form.validade,
      quantidade: parseFloat(form.quantidade),
      unidade: form.unidade,
      minimo: parseFloat(form.minimo),
      local: form.local,
      updated_by: sessao.user.id,
    };
    let error;
    if (editandoId) {
      const { error: e } = await supabase
        .from("itens")
        .update(dados)
        .eq("id", editandoId);
      error = e;
    } else {
      dados.created_by = sessao.user.id;
      const { error: e } = await supabase.from("itens").insert(dados);
      error = e;
    }
    if (error) setErro("Erro ao salvar.");
    else {
      await carregarItens();
      await carregarEstoqueTotal();
      fecharForm();
    }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este item do depósito?")) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) setErro("Erro ao excluir.");
    else {
      await carregarItens();
      await carregarEstoqueTotal();
    }
  }

  // ===== RETIRADA =====
  function abrirRetirar(item) {
    setItemRetirar(item);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMotivoPersonalizado("");
    setErro("");
    setMostrarRetirar(true);
  }

  function fecharRetirar() {
    setMostrarRetirar(false);
    setItemRetirar(null);
    setQtdRetirar("");
    setMotivoRetirar("");
    setMotivoPersonalizado("");
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

    let motivoFinal = motivoRetirar;
    if (motivoRetirar === "Outro") {
      if (!motivoPersonalizado.trim()) {
        setErro("Por favor, descreva o motivo.");
        return;
      }
      motivoFinal = motivoPersonalizado.trim();
    }

    setSalvando(true);
    setErro("");
    const { error: erroUpdate } = await supabase
      .from("itens")
      .update({
        quantidade: itemRetirar.quantidade - qtd,
        updated_by: sessao.user.id
      })
      .eq("id", itemRetirar.id);

    if (erroUpdate) {
      setErro("Erro ao dar baixa no estoque.");
      setSalvando(false);
      return;
    }

    await supabase.from("movimentacoes").insert({
      item_id: itemRetirar.id,
      item_nome: itemRetirar.nome,
      tipo: "saida",
      quantidade: qtd,
      unidade: itemRetirar.unidade,
      local_origem: itemRetirar.local,
      local_destino: null,
      motivo: motivoFinal,
      created_by: sessao.user.id,
    });

    await carregarItens();
    await carregarEstoqueTotal();
    setSalvando(false);
    fecharRetirar();
  }

  // ===== TRANSFERÊNCIA =====
  function abrirTransferir(item) {
    setItemTransferir(item);
    setLocalDestino(LOCAIS.find((l) => l !== item.local) || "");
    setQtdTransferir("");
    setMotivoTransferir("");
    setErro("");
    setMostrarTransferir(true);
    // Carregar estoque por local para este produto
    carregarEstoquePorProduto(item.produto_id);
  }

  function fecharTransferir() {
    setMostrarTransferir(false);
    setItemTransferir(null);
    setLocalDestino("");
    setQtdTransferir("");
    setMotivoTransferir("");
    setEstoquePorLocal([]);
  }

  async function confirmarTransferencia() {
    const qtd = parseFloat(qtdTransferir);
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida para transferir.");
      return;
    }
    if (qtd > itemTransferir.quantidade) {
      setErro(`Só há ${itemTransferir.quantidade} ${itemTransferir.unidade} disponível.`);
      return;
    }
    if (!localDestino || localDestino === itemTransferir.local) {
      setErro("Escolha um local de destino diferente do atual.");
      return;
    }

    setSalvando(true);
    setErro("");

    // Subtrair da origem
    const { error: erroOrigem } = await supabase
      .from("itens")
      .update({
        quantidade: itemTransferir.quantidade - qtd,
        updated_by: sessao.user.id
      })
      .eq("id", itemTransferir.id);

    if (erroOrigem) {
      setErro("Erro ao atualizar o local de origem.");
      setSalvando(false);
      return;
    }

    // Verificar se já existe item no destino (mesmo nome, lote e local)
    const { data: existente } = await supabase
      .from("itens")
      .select("*")
      .eq("nome", itemTransferir.nome)
      .eq("lote", itemTransferir.lote)
      .eq("local", localDestino)
      .maybeSingle();

    let erroDestino = null;
    if (existente) {
      // Atualizar quantidade no destino
      const r = await supabase
        .from("itens")
        .update({
          quantidade: existente.quantidade + qtd,
          updated_by: sessao.user.id
        })
        .eq("id", existente.id);
      erroDestino = r.error;
    } else {
      // Criar novo item no destino (agora com produto_id)
      const r = await supabase.from("itens").insert({
        produto_id: itemTransferir.produto_id,
        nome: itemTransferir.nome,
        lote: itemTransferir.lote,
        validade: itemTransferir.validade,
        quantidade: qtd,
        unidade: itemTransferir.unidade,
        minimo: itemTransferir.minimo,
        local: localDestino,
        created_by: sessao.user.id,
        updated_by: sessao.user.id,
      });
      erroDestino = r.error;
    }

    if (erroDestino) {
      setErro("Erro ao criar/atualizar item no destino.");
      setSalvando(false);
      return;
    }

    // Registrar movimentação
    await supabase.from("movimentacoes").insert({
      item_id: itemTransferir.id,
      item_nome: itemTransferir.nome,
      tipo: "transferencia",
      quantidade: qtd,
      unidade: itemTransferir.unidade,
      local_origem: itemTransferir.local,
      local_destino: localDestino,
      motivo: motivoTransferir.trim() || null,
      created_by: sessao.user.id,
      produto_id: itemTransferir.produto_id,
    });

    await carregarItens();
    await carregarEstoqueTotal();
    setSalvando(false);
    fecharTransferir();
  }

  // ===== HISTÓRICO =====
  async function abrirHistorico(filtro = 'todos') {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);

    let query = supabase
      .from("movimentacoes")
      .select(`
        *,
        profiles!created_by (nome)
      `)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (filtro !== 'todos') {
      query = query.eq('tipo', filtro);
    }

    const { data, error } = await query;
    if (!error) setHistorico(data || []);
    setCarregandoHistorico(false);
  }

  // ===== CÁLCULOS =====
  const itensComStatus = useMemo(
    () =>
      itens.map((it) => {
        const dias = diasAte(it.validade);
        const vencido = dias !== null && dias < 0;
        const proximoVencimento = !vencido && dias !== null && dias <= DIAS_ALERTA_VENCIMENTO;
        const estoqueBaixo = it.quantidade <= it.minimo;
        return { ...it, dias, vencido, proximoVencimento, estoqueBaixo };
      }),
    [itens]
  );

  const alertas = useMemo(
    () => ({
      vencidos: itensComStatus.filter((i) => i.vencido).length,
      proximos: itensComStatus.filter((i) => i.proximoVencimento).length,
      baixos: itensComStatus.filter((i) => i.estoqueBaixo).length,
    }),
    [itensComStatus]
  );

  const listaFiltrada = useMemo(() => {
    let lista = itensComStatus;
    if (filtroAlerta === "vencidos") lista = lista.filter((i) => i.vencido);
    if (filtroAlerta === "proximos") lista = lista.filter((i) => i.proximoVencimento);
    if (filtroAlerta === "baixos") lista = lista.filter((i) => i.estoqueBaixo);
    if (filtroLocal !== "todos") lista = lista.filter((i) => i.local === filtroLocal);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter(
        (i) => i.nome.toLowerCase().includes(b) || i.lote.toLowerCase().includes(b)
      );
    }
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itensComStatus, filtroAlerta, filtroLocal, busca]);

  // ===== RENDER =====
  if (carregandoSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!sessao) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER - igual ao anterior */}
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl shadow-green-900/30 border border-green-600/30">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Sprout size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Depósito Agrícola
                  <Tractor size={20} className="text-amber-300" />
                </h1>
                <p className="text-sm text-green-100">Defensivos e insumos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => abrirHistorico(filtroHistorico)}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <History size={18} /> Histórico
              </button>
              <button
                onClick={abrirNovo}
                className="flex items-center gap-1.5 bg-amber-500 text-green-900 hover:bg-amber-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Plus size={18} /> Novo item
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* CARDS DE ALERTA - igual ao anterior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* ... (mesmo código dos cards) ... */}
        </div>

        {/* BUSCA E FILTRO - igual ao anterior */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* ... (mesmo código) ... */}
        </div>

        {erro && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {erro}
          </div>
        )}

        {/* RESUMO DE ESTOQUE TOTAL POR PRODUTO */}
        {estoqueTotal.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-md p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Resumo de Estoque por Produto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {estoqueTotal.slice(0, 20).map((item) => (
                <div key={item.produto_id} className="flex justify-between items-center border-b border-gray-100 py-1 px-2 text-sm">
                  <span className="text-gray-700 truncate">{item.codigo} - {item.nome}</span>
                  <span className="font-semibold text-green-700">{item.quantidade_total}</span>
                </div>
              ))}
              {estoqueTotal.length > 20 && (
                <div className="col-span-full text-center text-xs text-gray-400">
                  + {estoqueTotal.length - 20} produtos
                </div>
              )}
            </div>
          </div>
        )}

        {/* LISTA DE ITENS EM GRID - igual ao anterior */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ... (mesmo código da lista) ... */}
        </div>
      </div>

      {/* ===== MODAL - FORMULÁRIO (igual ao anterior) ===== */}
      {/* ... (mesmo código do modal de formulário) ... */}

      {/* ===== MODAL - RETIRAR (igual ao anterior) ===== */}
      {/* ... (mesmo código do modal de retirar) ... */}

      {/* ===== MODAL - TRANSFERIR (com exibição de quantidades por local) ===== */}
      {mostrarTransferir && itemTransferir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 to-purple-700">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                <ArrowLeftRight size={20} /> Transferir entre locais
              </h2>
              <button
                onClick={fecharTransferir}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-800">{itemTransferir.nome}</p>
                <p className="text-xs text-gray-500">
                  Lote {itemTransferir.lote} · Disponível:{" "}
                  {itemTransferir.quantidade} {itemTransferir.unidade}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  De: <span className="font-medium text-gray-700">{itemTransferir.local}</span>
                </p>
              </div>

              {/* EXIBIÇÃO DE QUANTIDADE POR LOCAL */}
              {estoquePorLocal.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">📦 Quantidade disponível por local:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {estoquePorLocal.map((item) => (
                      <div key={item.local} className="flex justify-between">
                        <span className="text-gray-600">{item.local}:</span>
                        <span className="font-semibold text-blue-700">{item.quantidade_total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600">
                  Transferir para *
                </label>
                <select
                  value={localDestino}
                  onChange={(e) => setLocalDestino(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {LOCAIS.filter((l) => l !== itemTransferir.local).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Quantidade a transferir *
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={itemTransferir.quantidade}
                    value={qtdTransferir}
                    onChange={(e) => setQtdTransferir(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                  />
                  <span className="text-sm text-gray-500 shrink-0">{itemTransferir.unidade}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Observação (opcional)
                </label>
                <input
                  value={motivoTransferir}
                  onChange={(e) => setMotivoTransferir(e.target.value)}
                  placeholder="Ex: Reposição de balcão"
                  className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                />
              </div>
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
                  {erro}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={fecharTransferir}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarTransferencia}
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  <Check size={16} /> {salvando ? "Transferindo..." : "Confirmar transferência"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL - HISTÓRICO (igual ao anterior) ===== */}
      {/* ... (mesmo código do modal de histórico) ... */}
    </div>
  );
}
