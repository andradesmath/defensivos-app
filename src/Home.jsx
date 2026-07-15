import { Package, DollarSign, LogOut } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function Home({ sessao, onOpenEstoque, onOpenFinanceiro, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="relative overflow-hidden bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-5 sm:p-7 mb-10 shadow-xl shadow-green-900/30 border border-green-600/30">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-2xl border border-white/20">
                <Package size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Porteira Agrocomercial
                </h1>
                <p className="text-sm text-green-100">Sistema Integrado de Gestão</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-red-500/20 text-white hover:bg-red-500/30 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Estoque */}
          <button
            onClick={onOpenEstoque}
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-green-400 transition-all p-8 text-left group hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="p-4 bg-green-100 rounded-2xl group-hover:bg-green-200 transition-colors">
                <Package size={32} className="text-green-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Estoque</h2>
            </div>
            <p className="text-gray-500">Gerencie produtos, categorias, movimentações e transferências.</p>
            <div className="mt-4 text-sm text-green-600 font-medium flex items-center gap-1">
              Acessar <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Card Financeiro */}
          <button
            onClick={onOpenFinanceiro}
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-blue-400 transition-all p-8 text-left group hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="p-4 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-colors">
                <DollarSign size={32} className="text-blue-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
            </div>
            <p className="text-gray-500">Lançamento de vendas, contas a pagar/receber e indicadores.</p>
            <div className="mt-4 text-sm text-blue-600 font-medium flex items-center gap-1">
              Acessar <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}