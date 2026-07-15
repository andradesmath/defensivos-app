import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import Setor from "./Setor";
import Financeiro from "./pages/Financeiro";

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [tela, setTela] = useState('dashboard'); // 'dashboard', 'setor', 'financeiro'
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
    setTela('setor');
  }

  function irParaFinanceiro() {
    setTela('financeiro');
  }

  function voltarDashboard() {
    setTela('dashboard');
    setCategoriaAtiva(null);
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-amber-50">Carregando...</div>;
  if (!sessao) return <Auth onLogin={() => {}} />;

  if (tela === 'dashboard') {
    return (
      <Dashboard
        sessao={sessao}
        onSelectCategoria={irParaSetor}
        onOpenFinanceiro={irParaFinanceiro}
      />
    );
  }

  if (tela === 'setor' && categoriaAtiva) {
    return <Setor sessao={sessao} categoria={categoriaAtiva} onVoltar={voltarDashboard} />;
  }

  if (tela === 'financeiro') {
    return <Financeiro onVoltar={voltarDashboard} />;
  }

  return <Dashboard sessao={sessao} onSelectCategoria={irParaSetor} onOpenFinanceiro={irParaFinanceiro} />;
}