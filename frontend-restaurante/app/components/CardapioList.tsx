'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useAtualizacaoPedidos } from '../AtualizacaoPedidosContext';
import { CardapioItem } from '../types';
import { apiRequest } from '../../lib/api';

export default function CardapioList() {
  const { atualizarPedidos } = useAtualizacaoPedidos();
  const [cardapio, setCardapio] = useState<CardapioItem[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const fetchCardapio = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const data = await apiRequest<CardapioItem[]>('/menu');
      setCardapio(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Erro ao buscar cardapio',
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    fetchCardapio();
  }, [atualizarPedidos, fetchCardapio]);

  return (
    <>
      {carregando && <div>Carregando cardapio...</div>}
      {erro && <div className="feedback-error">{erro}</div>}
      {!carregando && !erro && cardapio.length === 0 && (
        <div>Nenhum item disponivel no cardapio.</div>
      )}
      <ul className="stack">
        {cardapio.map((prato, index) => (
          <li key={index} className="list-item">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>{prato.item}</span>
              <span>R$ {prato.preco.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
