import { useState } from 'react';
import { Save } from 'lucide-react';
import { useFinanceiro } from '../../hooks/useFinanceiro';

const CATEGORIAS_PAGAR = [
  'Impostos',
  'Despesas com Pessoal',
  'Despesas Operacionais Fixas',
  'Despesas Operacionais Variáveis',
  'Investimentos',
  'Despesas Bancárias',
  'Marketing',
  'Retiradas dos Sócios',
  'CMV',
];

export default function ContasForm({ onSuccess }) {
  const { salvarContaPagar, salvarContaReceber, loading, error } = useFinanceiro();

  const [tipo, setTipo] = useState('pagar');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_PAGAR[0]);
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!descricao.trim() || !valor || parseFloat(valor) <= 0) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const conta = {
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      data_vencimento: dataVencimento,
    };

    let sucesso = false;
    if (tipo === 'pagar') {
      conta.categoria = categoria;
      sucesso = await salvarContaPagar(conta);
    } else {
      sucesso = await salvarContaReceber(conta);
    }

    if (sucesso) {
      alert(`Conta a ${tipo === 'pagar' ? 'Pagar' : 'Receber'} lançada com sucesso!`);
      setDescricao('');
      setValor('');
      setCategoria(CATEGORIAS_PAGAR[0]);
      if (onSuccess) onSuccess();
    } else {
      alert('Erro ao salvar: ' + error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-blue-100 text-blue-700 p-2 rounded-lg">📋</span>
        Lançamento de Conta
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="pagar"
                checked={tipo === 'pagar'}
                onChange={() => setTipo('pagar')}
                className="w-4 h-4 text-green-600"
              />
              <span>Conta a Pagar</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="receber"
                checked={tipo === 'receber'}
                onChange={() => setTipo('receber')}
                className="w-4 h-4 text-green-600"
              />
              <span>Conta a Receber</span>
            </label>
          </div>
        </div>

        {tipo === 'pagar' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
            >
              {CATEGORIAS_PAGAR.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === 'pagar' ? 'Ex: Aluguel' : 'Ex: Recebimento cliente X'}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-60"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </button>
        </div>
      </form>
    </div>
  );
}