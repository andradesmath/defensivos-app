import { useState, useEffect } from "react";
import { Package, LogOut, Layers, ChevronLeft, Tractor, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "./supabaseClient";
import Modulos from "./Modulos";

// ... (CATEGORIAS_PADRAO mantido igual)

export default function Dashboard({ sessao, onSelectCategoria, onOpenFinanceiro }) {
  const [moduloAtivo, setModuloAtivo] = useState(null); // null = galeria, 'estoque', 'financeiro'
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [usandoFallback, setUsandoFallback] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (moduloAtivo === 'estoque') {
      carregarCategorias();
    }
  }, [moduloAtivo]);

  async function carregarCategorias() { /* ... (mesmo código) */ }

  function usarFallback() { /* ... */ }

  async function handleLogout() { /* ... */ }

  const handleSelectModulo = (moduloId) => {
    if (moduloId === 'estoque') {
      setModuloAtivo('estoque');
    } else if (moduloId === 'financeiro') {
      onOpenFinanceiro();
    }
  };

  const voltarParaGaleria = () => {
    setModuloAtivo(null);
    setCategorias([]);
    setErro(null);
  };

  // --- GALERIA ---
  if (!moduloAtivo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-8 shadow-xl shadow-green-900/30 border border-green-600/30">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
            <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                  <Package size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Porteira Agrocomercial
                    <Tractor size={20} className="text-amber-300" />
                  </h1>
                  <p className="text-sm text-green-100">Sistema Integrado de Gestão</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModuloAtivo('estoque')}
                  className="flex items-center gap-1.5 bg-green-500/20 text-white hover:bg-green-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
                >
                  <Package size={18} /> Estoque
                </button>
                <button
                  onClick={onOpenFinanceiro}
                  className="flex items-center gap-1.5 bg-blue-500/20 text-white hover:bg-blue-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
                >
                  <span>💰</span> Financeiro
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

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Selecione um módulo</h2>
            <p className="text-gray-500 mt-2">Escolha a área que deseja gerenciar</p>
          </div>

          <Modulos onSelectModulo={handleSelectModulo} />
        </div>
      </div>
    );
  }

  // --- MÓDULO ESTOQUE (categorias) ---
  if (moduloAtivo === 'estoque') {
    // ... (mesmo código que você já tinha para exibir categorias)
    // Lembre-se de incluir o botão "Voltar" no header
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
        {/* ... header com voltarParaGaleria */}
      </div>
    );
  }

  return null;
}