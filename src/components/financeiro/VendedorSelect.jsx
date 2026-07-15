import { useEffect, useState } from 'react';
import { useFinanceiro } from '../../hooks/useFinanceiro';

export default function VendedorSelect({ value, onChange, className = '' }) {
  const [vendedores, setVendedores] = useState([]);
  const { getVendedores, loading } = useFinanceiro();

  useEffect(() => {
    carregarVendedores();
  }, []);

  const carregarVendedores = async () => {
    const dados = await getVendedores();
    setVendedores(dados);
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${className}`}
      disabled={loading}
    >
      <option value="">Selecione um vendedor...</option>
      {vendedores.map((v) => (
        <option key={v.id} value={v.id}>
          {v.nome} - {v.localizacao || 'Sem local'}
        </option>
      ))}
    </select>
  );
}