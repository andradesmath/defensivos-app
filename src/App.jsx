import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import Setor from "./Setor";
import LogsExclusao from "./pages/LogsExclusao";
import LogsAcoes from "./pages/LogsAcoes";
import MinimosProdutos from "./pages/MinimosProdutos";
import CadastroProduto from "./pages/CadastroProduto";

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [tela, setTela] = useState("dashboard");
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  function irParaSetor(categoria) {
    setCategoriaAtiva(categoria);
    setTela("setor");
  }

  function voltarDashboard() {
    setTela("dashboard");
    setCategoriaAtiva(null);
  }

  function abrirLogsExclusao() {
    setTela("logsExclusao");
  }

  function abrirLogsAcoes() {
    setTela("logsAcoes");
  }

  function abrirMinimos() {
    setTela("minimos");
  }

  function abrirCadastroProduto() {
    setTela("cadastroProduto");
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  }

  if (!sessao) {
    return <Auth onLogin={() => {}} />;
  }

  if (tela === "dashboard") {
    return (
      <Dashboard
        sessao={sessao}
        onSelectCategoria={irParaSetor}
        onOpenLogsExclusao={abrirLogsExclusao}
        onOpenLogsAcoes={abrirLogsAcoes}
        onOpenMinimos={abrirMinimos}
        onOpenCadastroProduto={abrirCadastroProduto}
      />
    );
  }

  if (tela === "setor" && categoriaAtiva) {
    return (
      <Setor
        sessao={sessao}
        categoria={categoriaAtiva}
        onVoltar={voltarDashboard}
        onOpenLogsAcoes={abrirLogsAcoes}
        onOpenMinimos={abrirMinimos}
        onOpenCadastroProduto={abrirCadastroProduto}
      />
    );
  }

  if (tela === "logsExclusao") {
    return <LogsExclusao onVoltar={voltarDashboard} />;
  }

  if (tela === "logsAcoes") {
    return <LogsAcoes onVoltar={voltarDashboard} />;
  }

  if (tela === "minimos") {
    return <MinimosProdutos onVoltar={voltarDashboard} />;
  }

  if (tela === "cadastroProduto") {
    return <CadastroProduto onVoltar={voltarDashboard} />;
  }

  return (
    <Dashboard
      sessao={sessao}
      onSelectCategoria={irParaSetor}
      onOpenLogsExclusao={abrirLogsExclusao}
      onOpenLogsAcoes={abrirLogsAcoes}
      onOpenMinimos={abrirMinimos}
      onOpenCadastroProduto={abrirCadastroProduto}
    />
  );
}
