import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { useFinanceiro } from '../../hooks/useFinanceiro';
import VendedorSelect from './VendedorSelect';
import ItemVendaRow from './ItemVendaRow';

export default function VendasForm({ onSuccess }) {
  const { salvarVenda, loading, error } = useFinanceiro();

  const [vendedorId, setVendedorId] = useState('');
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [dataVencimento, setDataVencimento] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [itens, setItens] = useState([
    { produto_nome: '', quantidade: 1, valor_unitario: 0, subtotal: 0 },
  ]);

  const handleAddItem = () => {
    setItens([...itens, { produto_nome: '', quantidade: 1, valor_unitario: 0, subtotal: 0 }]);
  };

  const handleUpdateItem = (index, novoItem) => {
    const novosItens = [...itens];
    novosItens[index] = novoItem;
    setItens(novosItens);
  };

  const handleRemoveItem = (index) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return itens.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vendedorId) {
      alert('Selecione um vendedor.');
      return;
    }

    const itensValidos = itens.filter(
      (item) => item.produto_nome.trim() !== '' && item.quantidade > 0 && item.valor_unitario > 0
    );
    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um item válido.');
      return;
    }

    const total = calcularTotal();

    const vendaData = {
      vendedor_id: vendedorId,
      data_venda: dataVenda,
      data_vencimento: dataVencimento,
      valor_total: total,
      itens: itensValidos,
      vendedor_nome: 'Cliente',
    };

    const sucesso = await salvarVenda(vendaData);
    if (sucesso) {
      alert('Venda lançada com sucesso!');
      setVendedorId('');
      setItens([{ produto_nome: '', quantidade: 1, valor_unitario: 0, subtotal: 0 }]);
      if (onSuccess) onSuccess();
    } else {
      alert('Erro ao salvar: ' + error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-green-100 text-green-700 p-2 rounded-lg">💰</span>
        Lançamento de Venda
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
            <VendedorSelect value={vendedorId} onChange={setVendedorId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
            <input
              type="date"
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento (Conta a Receber)</label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold text-gray-700">Itens da Venda</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={16} /> Adicionar item
            </button>
          </div>

          {itens.map((item, index) => (
            <ItemVendaRow
              key={index}
              item={item}
              index={index}
              onUpdate={handleUpdateItem}
              onRemove={handleRemoveItem}
            />
          ))}

          <div className="flex justify-end mt-4 pt-3 border-t border-gray-200">
            <div className="text-lg font-bold text-gray-800">
              Total: R$ {calcularTotal().toFixed(2)}
            </div>
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
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-60"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Venda'}
          </button>
        </div>
      </form>
    </div>
  );
}