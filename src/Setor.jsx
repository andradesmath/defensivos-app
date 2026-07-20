import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, AlertOctagon, PackageX, PackageMinus,
  ArrowLeftRight, Plus, Trash2, Pencil, X, Check,
  Search, History, MapPin, LogOut, ChevronLeft,
  Sprout
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DIAS_ALERTA_VENCIMENTO = 90;
const UNIDADES = ["L", "mL", "kg", "g", "un", "m"];
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
const MOTIVOS_SAIDA = [
  "Aplicação",
  "Perda por Deterioração",
  "Perda por Validade",
  "Não Localizado",
  "Vendido",
  "Outro"
];

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

export default function Setor({ sessao, categoria, onVoltar }) {
  // ===== ESTADOS =====
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [estoqueTotal, setEstoqueTotal] = useState([]);
  const [estoquePorLocal, setEstoquePorLocal] = useState([]);
  const [totalProduto, setTotalProduto] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [termoBusca, setTermoBusca] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");
  const [filtroLocal, setFiltroLocal] = useState("todos");

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

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [filtroHistorico, setFiltroHistorico] = useState('todos');

  // ============================================================
  // CARREGAR DADOS DA CATEGORIA
  // ============================================================
  useEffect(() => {
    if (categoria) {
      carregarProdutos();
      carregarItens();
      carregarEstoqueTotal();
    }
  }, [categoria]);

  useEffect(() => {
    if (form.produto_id) {
      carregarQuantidadesProduto(form.produto_id);
    } else {
      setEstoquePorLocal([]);
      setTotalProduto(0);
    }
  }, [form.produto_id]);

  async function carregarProdutos() {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("categoria_id", categoria.id)
      .order("nome", { ascending: true });
    if (!error) setProdutos(data || []);
  }

  async function carregarItens() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("itens")
      .select(`
        *,
        produtos!inner (categoria_id)
      `)
      .eq("produtos.categoria_id", categoria.id)
      .order("validade", { ascending: true });
    if (error) {
      console.error(error);
      setErro("Erro ao carregar itens.");
      setItens([]);
    } else {
      setItens(data || []);
    }
    setCarregando(false);
  }

  async function carregarEstoqueTotal() {
    const { data, error } = await supabase
      .from("estoque_total_produto")
      .select("*")
      .eq("categoria", categoria.nome)
      .order("nome", { ascending: true });
    if (!error) setEstoqueTotal(data || []);
  }

  async function carregarQuantidadesProduto(produtoId) {
    if (!produtoId) return;
    const { data: localData } = await supabase
      .from("estoque_por_local")
      .select("*")
      .eq("produto_id", produtoId);
    if (localData) setEstoquePorLocal(localData || []);

    const { data: totalData } = await supabase
      .from("estoque_total_produto")
      .select("quantidade_total")
      .eq("produto_id", produtoId)
      .maybeSingle();
    setTotalProduto(totalData?.quantidade_total || 0);
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ============================================================
  // FORMULÁRIO
  // ============================================================
  function abrirNovo() {
    setForm({ ...vazio });
    setEditandoId(null);
    setTermoBusca("");
    setMostrarForm(true);
  }

  function abrirEdicao(item) {
    const produto = produtos.find(p => p.id === item.produto_id);
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
    setTermoBusca(produto ? `${produto.codigo} - ${produto.nome}` : item.nome);
    setEditandoId(item.id);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setForm(vazio);
    setEditandoId(null);
    setTermoBusca("");
    setEstoquePorLocal([]);
    setTotalProduto(0);
  }

  function handleProdutoBusca(texto) {
    setTermoBusca(texto);

    if (!texto.trim()) {
      setForm({ ...form, produto_id: "", nome: "" });
      return;
    }

    const limpo = texto.trim().toLowerCase();

    // Tenta encontrar pelo código (sem zeros à esquerda)
    const porCodigo = produtos.find(p => {
      const codigoLimpo = p.codigo.replace(/^0+/, '');
      return codigoLimpo === limpo.replace(/^0+/, '');
    });

    if (porCodigo) {
      setForm({
        ...form,
        produto_id: porCodigo.id,
        nome: porCodigo.nome,
      });
      return;
    }

    // Tenta por nome
    const porNome = produtos.find(p =>
      p.nome.toLowerCase().includes(limpo)
    );

    if (porNome) {
      setForm({
        ...form,
        produto_id: porNome.id,
        nome: porNome.nome,
      });
      return;
    }

    // Não encontrou
    setForm({ ...form, produto_id: "", nome: texto });
  }

  async function salvarForm() {
    // Validação específica
    if (!form.produto_id) {
      setErro("Selecione um produto válido da lista.");
      return;
    }
    if (!form.lote.trim()) {
      setErro("Informe o lote.");
      return;
    }
    if (!form.validade) {
      setErro("Informe a data de validade.");
      return;
    }
    if (form.quantidade === "" || isNaN(form.quantidade) || parseFloat(form.quantidade) <= 0) {
      setErro("Informe uma quantidade válida (maior que zero).");
      return;
    }
    if (form.minimo === "" || isNaN(form.minimo) || parseFloat(form.minimo) <= 0) {
      setErro("Informe um estoque mínimo válido (maior que zero).");
      return;
    }
    if (!form.local) {
      setErro("Selecione o local de armazenamento.");
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
    if (error) {
      setErro("Erro ao salvar: " + error.message);
      setSalvando(false);
      return;
    }
    // Recarrega os dados
    await carregarItens();
    await carregarEstoqueTotal();
    // Fecha o modal
    fecharForm();
    alert("Item salvo com sucesso!");
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

  // ... (as demais funções: retirada, transferência, histórico, etc.)
  // Mantenha o restante do código igual ao que você já tem.

  // ============================================================
  // RENDER (continue com seu código atual)
  // ============================================================
  return ( ... );
}
