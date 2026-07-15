import { Package, DollarSign, Layers, TrendingUp } from "lucide-react";

const MODULOS = [
  {
    id: 'estoque',
    nome: 'Gestão de Estoque',
    descricao: 'Controle de produtos, categorias e movimentações',
    icon: Package,
    cor: 'green',
  },
  {
    id: 'financeiro',
    nome: 'Módulo Financeiro',
    descricao: 'Vendas, contas a pagar/receber e indicadores',
    icon: DollarSign,
    cor: 'blue',
  },
];

export default function Modulos({ onSelectModulo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {MODULOS.map((mod) => {
        const Icon = mod.icon;
        const corClasses = {
          green: 'border-green-400 hover:shadow-green-200',
          blue: 'border-blue-400 hover:shadow-blue-200',
        };
        return (
          <button
            key={mod.id}
            onClick={() => onSelectModulo(mod.id)}
            className={`bg-white rounded-2xl border-2 ${corClasses[mod.cor]} shadow-md hover:shadow-xl transition-all p-8 text-center group hover:-translate-y-1`}
          >
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-50 rounded-full group-hover:bg-opacity-20 transition-colors">
                <Icon size={48} className="text-gray-700" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{mod.nome}</h3>
            <p className="text-sm text-gray-500 mt-2">{mod.descricao}</p>
            <div className="mt-4 text-xs font-medium text-green-600 flex items-center justify-center gap-1">
              Acessar <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}