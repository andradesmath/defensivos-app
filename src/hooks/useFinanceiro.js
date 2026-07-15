import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function useFinanceiro() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getVendedores = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .order('nome');
    if (error) {
      setError(error.message);
      setLoading(false);
      return [];
    }
    setLoading(false);
    return data;
  };

  const salvarVenda = async (venda) => {
    setLoading(true);
    setError(null);

    const { data: vendaData, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        vendedor_id: venda.vendedor_id,
        data_venda: venda.data_venda || new Date().toISOString().split('T')[0],
        valor_total: venda.valor_total,
        status: 'concluida',
      })
      .select()
      .single();

    if (vendaError) {
      setError('Erro ao salvar venda: ' + vendaError.message);
      setLoading(false);
      return false;
    }

    const itensComVendaId = venda.itens.map(item => ({
      venda_id: vendaData.id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      subtotal: item.subtotal,
    }));

    const { error: itensError } = await supabase
      .from('vendas_itens')
      .insert(itensComVendaId);

    if (itensError) {
      setError('Erro ao salvar itens: ' + itensError.message);
      setLoading(false);
      return false;
    }

    const { error: contaError } = await supabase
      .from('contas_receber')
      .insert({
        venda_id: vendaData.id,
        descricao: `Venda ${vendaData.id} - ${venda.vendedor_nome || 'Cliente'}`,
        valor: venda.valor_total,
        data_vencimento: venda.data_vencimento || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
        status: 'pendente',
        tipo: 'venda',
      });

    if (contaError) {
      setError('Erro ao gerar conta a receber: ' + contaError.message);
      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  };

  const salvarContaPagar = async (conta) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('contas_pagar')
      .insert({
        descricao: conta.descricao,
        categoria: conta.categoria,
        valor: conta.valor,
        data_vencimento: conta.data_vencimento,
        status: 'pendente',
        tipo: conta.tipo || 'fixa',
      });
    if (error) {
      setError('Erro ao salvar conta a pagar: ' + error.message);
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  };

  const salvarContaReceber = async (conta) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('contas_receber')
      .insert({
        descricao: conta.descricao,
        valor: conta.valor,
        data_vencimento: conta.data_vencimento,
        status: 'pendente',
        tipo: 'manual',
        venda_id: null,
      });
    if (error) {
      setError('Erro ao salvar conta a receber: ' + error.message);
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  };

  return {
    loading,
    error,
    getVendedores,
    salvarVenda,
    salvarContaPagar,
    salvarContaReceber,
  };
}
