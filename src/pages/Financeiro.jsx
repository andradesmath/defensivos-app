import { useState } from 'react';
import VendasForm from '../components/financeiro/VendasForm';
import ContasForm from '../components/financeiro/ContasForm';
import { ChartColumn, FileSpreadsheet } from 'lucide-react';

export default function Financeiro() {
  const [aba, setAba] = useState('vendas');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Módulo Financeiro</h1>
        <p className="text-gray-500 mb-6">Lançamento de vendas e contas a pagar/receber</p>

        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
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
        </div>

        {aba === 'vendas' && <VendasForm />}
        {aba === 'contas' && <ContasForm />}
      </div>
    </div>
  );
}