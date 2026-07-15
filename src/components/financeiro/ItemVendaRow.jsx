import { Trash2 } from 'lucide-react';

export default function ItemVendaRow({ item, index, onUpdate, onRemove }) {
  const handleChange = (campo, valor) => {
    const novoItem = { ...item, [campo]: valor };
    if (campo === 'quantidade' || campo === 'valor_unitario') {
      const qtd = parseFloat(campo === 'quantidade' ? valor : item.quantidade) || 0;
      const vu = parseFloat(campo === 'valor_unitario' ? valor : item.valor_unitario) || 0;
      novoItem.subtotal = qtd * vu;
    }
    onUpdate(index, novoItem);
  };

  return (
    <div className="grid grid-cols-12 gap-3 items-end mb-3">
      <div className="col-span-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Produto</label>
        <input
          type="text"
          value={item.produto_nome || ''}
          onChange={(e) => handleChange('produto_nome', e.target.value)}
          placeholder="Nome do produto"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.quantidade || ''}
          onChange={(e) => handleChange('quantidade', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Valor unit.</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.valor_unitario || ''}
          onChange={(e) => handleChange('valor_unitario', parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
          R$ {(item.subtotal || 0).toFixed(2)}
        </div>
      </div>
      <div className="col-span-1 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}