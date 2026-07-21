import { useState, useEffect } from "react";
import { ArrowLeft, ClipboardList, User, Calendar, Database } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function LogsAcoes({ onVoltar }) {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtroTabela, setFiltroTabela] = useState("todos");

  useEffect(() => {
    carregarLogs();
  }, []);

  async function carregarLogs() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("logs_completo")
        .select("*")
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const tabelas = ["todos", ...new Set(logs.map(l => l.tabela))];

  const logsFiltrados = filtroTabela === "todos"
    ? logs
    : logs.filter(l => l.tabela === filtroTabela);

  const getAcaoColor = (acao) => {
    if (acao === 'INSERT') return 'text-green-600 bg-green-100';
    if (acao === 'UPDATE') return 'text-blue-600 bg-blue-100';
    if (acao === 'DELETE') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onVoltar}
            className="bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition border border-gray-200"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={28} className="text-blue-600" />
            Logs de Ações
          </h1>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
            <Database size={18} className="text-gray-400" />
            <select
              value={filtroTabela}
              onChange={(e) => setFiltroTabela(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {tabelas.map(t => (
                <option key={t} value={t}>{t === "todos" ? "Todas as tabelas" : t}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 ml-auto">
              {logsFiltrados.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="p-8 text-center text-gray-500">Carregando logs...</div>
            ) : logsFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum log encontrado.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabela</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registro ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsFiltrados.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.data_hora).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.usuario_nome || log.usuario_email || "Sistema"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.tabela}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getAcaoColor(log.acao)}`}>
                          {log.acao}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                        {log.registro_id?.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
