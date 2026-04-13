// Client Component para buscar pedido por ID com interatividade
'use client';
import React, { useState } from 'react';
import { Pedido } from '../types';
import { apiRequest } from '../../lib/api';
import { formatarItensComQuantidade } from '../utils/pedidoItens';

export default function BuscaPedidoPorId() {
  const [buscaId, setBuscaId] = useState('');
  const [buscaResultado, setBuscaResultado] = useState<Pedido | null>(null);
  const [buscaErro, setBuscaErro] = useState('');

  // Função para buscar pedido por ID
  const buscarPedido = async () => {
    setBuscaErro('');
    setBuscaResultado(null);

    if (!buscaId.trim()) {
      setBuscaErro('Informe um ID valido.');
      return;
    }

    try {
      const data = await apiRequest<Pedido>(`/pedidos/${buscaId.trim()}`);
      setBuscaResultado(data);
    } catch (error) {
      setBuscaErro(error instanceof Error ? error.message : 'Erro de conexao.');
    }
  };

  // Limpa resultado ao alterar buscaId apenas se buscaId estiver vazio
  React.useEffect(() => {
    if (buscaId === '') {
      setBuscaResultado(null);
      setBuscaErro('');
    }
  }, [buscaId]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar pedido por ID"
          value={buscaId}
          onChange={(e) => setBuscaId(e.target.value)}
          className="input"
          style={{ maxWidth: 360 }}
        />
        <button
          type="button"
          onClick={buscarPedido}
          className="btn btn-primary"
        >
          Buscar
        </button>
      </div>
      {buscaErro && (
        <div className="feedback-error" style={{ marginTop: 8 }}>
          {buscaErro}
        </div>
      )}
      {buscaResultado && (
        <div className="list-item" style={{ marginTop: 10 }}>
          <div>
            <b>ID:</b> {buscaResultado.id}
          </div>
          <div>
            <b>Itens:</b> {formatarItensComQuantidade(buscaResultado)}
          </div>
          <div>
            <b>Status:</b>{' '}
            <span
              className={`status-badge ${
                buscaResultado.status.trim().toLowerCase() === 'pronto'
                  ? 'status-pronto'
                  : 'status-preparando'
              }`}
            >
              {buscaResultado.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
