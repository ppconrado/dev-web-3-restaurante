// Componente de ações para pedidos na cozinha
'use client';
import React, { useState } from 'react';
import { Pedido } from '../types';
import { apiRequest } from '../../lib/api';
import { useToast } from '../ToastContext';

interface PedidoAcoesProps {
  pedidoId: Pedido['id'];
  statusAtual: Pedido['status'];
  secao: 'preparando' | 'pronto';
  onStatusAtualizado?: (novoStatus: string) => void;
  onAcaoConcluida?: () => void;
}

export default function PedidoAcoes({
  pedidoId,
  statusAtual,
  secao,
  onStatusAtualizado,
  onAcaoConcluida,
}: PedidoAcoesProps) {
  const { pushToast } = useToast();
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const atualizarParaPronto = async () => {
    setMensagem('');
    setErro('');
    setSalvando(true);
    try {
      await apiRequest<Pedido>(`/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pronto' }),
      });
      setMensagem('Pedido marcado como pronto.');
      pushToast('Pedido finalizado como pronto.', 'success');
      if (onStatusAtualizado) onStatusAtualizado('pronto');
      onAcaoConcluida?.();
    } catch (error) {
      pushToast('Nao foi possivel atualizar para pronto.', 'error');
      setErro(error instanceof Error ? error.message : 'Erro de conexao.');
    } finally {
      setSalvando(false);
    }
  };

  const marcarComoEntregue = async () => {
    setMensagem('');
    setErro('');
    setSalvando(true);
    try {
      await apiRequest<Pedido>(`/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'entregue' }),
      });
      setMensagem('Pedido marcado como entregue.');
      pushToast('Pedido registrado como entregue.', 'success');
      if (onStatusAtualizado) onStatusAtualizado('entregue');
      onAcaoConcluida?.();
    } catch (error) {
      pushToast('Falha ao marcar pedido como entregue.', 'error');
      setErro(error instanceof Error ? error.message : 'Erro de conexao.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 13 }}>
        Acoes do pedido
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {secao === 'preparando' ? (
          <button
            type="button"
            onClick={atualizarParaPronto}
            disabled={salvando || statusAtual.trim().toLowerCase() === 'pronto'}
            className="btn btn-primary"
          >
            Marcar como Pronto
          </button>
        ) : (
          <button
            type="button"
            onClick={marcarComoEntregue}
            disabled={salvando}
            className="btn btn-danger"
          >
            Marcar como Entregue
          </button>
        )}
      </div>
      {mensagem && (
        <div className="feedback-success" style={{ marginTop: 8 }}>
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="feedback-error" style={{ marginTop: 8 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
