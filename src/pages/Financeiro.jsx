import { useState } from 'react';
import VendasForm from '../components/financeiro/VendasForm';
import ContasForm from '../components/financeiro/ContasForm';
import VendedoresDashboard from '../components/financeiro/VendedoresDashboard';
import FinanceiroDashboard from '../FinanceiroDashboard';
import { ChartColumn, FileSpreadsheet, LayoutDashboard, Users, ArrowLeft } from 'lucide-react';

export default function Financeiro({ onVoltar }) {
  const [aba, setAba] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 Módulo Financeiro</h1>
            <p className="text-gray-500">Gestão de vendas, contas e indicadores</p>
          </div>
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 flex-wrap">
          <button
            onClick={() => setAba('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              aba === 'dashboard'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard Financeiro
          </button>
          <button
            onClick={() => setAba('vendas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              aba === 'vendas'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChartColumn size={18} />
            Lançar Venda
          </button>
          <button
            onClick={() => setAba('contas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              aba === 'contas'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileSpreadsheet size={18} />
            Contas a Pagar/Receber
          </button>
          <button
            onClick={() => setAba('vendedores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
              aba === 'vendedores'
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={18} />
            Vendedores
          </button>
        </div>

        {aba === 'dashboard' && <FinanceiroDashboard onVoltar={onVoltar} />}
        {aba === 'vendas' && <VendasForm />}
        {aba === 'contas' && <ContasForm />}
        {aba === 'vendedores' && <VendedoresDashboard />}
      </div>
    </div>
  );
}