import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, User, Calendar, Database, Search, RefreshCw } from 'lucide-react';

export default function LogsExclusao() {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [tabelaFiltro, setTabelaFiltro] = useState('todos');

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from('view_logs_exclusao')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar logs: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }

  // Filtros
  const logsFiltrados = logs.filter(log => {
    if (filtro && !log.usuario_email?.toLowerCase().includes(filtro.toLowerCase()) &&
        !log.usuario_nome?.toLowerCase().includes(filtro.toLowerCase()) &&
        !log.tabela?.toLowerCase().includes(filtro.toLowerCase())) {
      return false;
    }
    if (tabelaFiltro !== 'todos' && log.tabela !== tabelaFiltro) {
      return false;
    }
    return true;
  });

  // Formatação de data
  function formatarData(dataISO) {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Extrair nome do produto do JSON
  function extrairNome(dadosAntigos) {
    try {
      const obj = typeof dadosAntigos === 'string' ? JSON.parse(dadosAntigos) : dadosAntigos;
      return obj?.nome || obj?.produto_nome || 'ID: ' + (obj?.id || 'N/A');
    } catch {
      return 'Dados não disponíveis';
    }
  }

  // Tabelas disponíveis para filtro
  const tabelas = ['todos', ...new Set(logs.map(log => log.tabela))];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Trash2 className="text-red-500" size={24} />
          Histórico de Exclusões
        </h2>
        <button
          onClick={carregarLogs}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, email ou tabela..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={tabelaFiltro}
          onChange={(e) => setTabelaFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
        >
          {tabelas.map(tab => (
            <option key={tab} value={tab}>
              {tab === 'todos' ? 'Todas as tabelas' : tab}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de logs */}
      {carregando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : erro ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          {erro}
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Database size={48} className="mx-auto mb-3 text-gray-300" />
          <p>Nenhum registro de exclusão encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tabela</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item excluído</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dados antigos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logsFiltrados.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-gray-400" />
                      {formatarData(log.data_hora)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      {log.usuario_nome || log.usuario_email || 'Usuário desconhecido'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {log.tabela}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                    {extrairNome(log.dados_antigos)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    <button
                      onClick={() => alert(JSON.stringify(log.dados_antigos, null, 2))}
                      className="text-blue-600 hover:text-blue-800 text-xs underline"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logsFiltrados.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 text-right">
          Mostrando {logsFiltrados.length} de {logs.length} registros
        </div>
      )}
    </div>
  );
}
