'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtualizacaoPedidos } from '../AtualizacaoPedidosContext';
import { Pedido } from '../types';
import { apiRequest } from '../../lib/api';
import { formatarItensComQuantidade } from '../utils/pedidoItens';
import {
  getAutoRefreshStorageKey,
  readAutoRefreshSettings,
  writeAutoRefreshSettings,
} from '../utils/autoRefreshSettings';

export default function PedidosAbertosList() {
  const { atualizarPedidos } = useAtualizacaoPedidos();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [intervaloSegundos, setIntervaloSegundos] = useState(15);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('');

  const fetchPedidos = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setErro('');

    try {
      const data = await apiRequest<Pedido[]>('/pedidos');
      setPedidos(Array.isArray(data) ? data : []);
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Erro ao buscar pedidos.',
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos(false);
  }, [fetchPedidos, atualizarPedidos]);

  useEffect(() => {
    const settings = readAutoRefreshSettings();
    setAutoAtualizar(settings.autoAtualizar);
    setIntervaloSegundos(settings.intervaloSegundos);
  }, []);

  useEffect(() => {
    writeAutoRefreshSettings({ autoAtualizar, intervaloSegundos });
  }, [autoAtualizar, intervaloSegundos]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== getAutoRefreshStorageKey()) {
        return;
      }

      const settings = readAutoRefreshSettings();
      setAutoAtualizar(settings.autoAtualizar);
      setIntervaloSegundos(settings.intervaloSegundos);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!autoAtualizar) {
      return;
    }

    const atualizarQuandoVisivel = () => {
      if (document.visibilityState === 'visible') {
        fetchPedidos(true);
      }
    };

    const timer = window.setInterval(() => {
      atualizarQuandoVisivel();
    }, intervaloSegundos * 1000);

    document.addEventListener('visibilitychange', atualizarQuandoVisivel);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', atualizarQuandoVisivel);
    };
  }, [autoAtualizar, intervaloSegundos, fetchPedidos]);

  const pedidosGarcom = useMemo(
    () =>
      pedidos.filter(
        (pedido) => pedido.status.trim().toLowerCase() !== 'entregue',
      ),
    [pedidos],
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ color: 'var(--muted)', display: 'grid', gap: 4 }}>
          <span>Pedidos ativos: {pedidosGarcom.length}</span>
          <span>
            Ultima atualizacao: {ultimaAtualizacao || 'ainda nao atualizou'}
            {atualizando ? ' (atualizando...)' : ''}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--muted)',
            }}
          >
            <input
              type="checkbox"
              checked={autoAtualizar}
              onChange={(e) => setAutoAtualizar(e.target.checked)}
            />
            Autoatualizar
          </label>
          <select
            value={intervaloSegundos}
            onChange={(e) => setIntervaloSegundos(Number(e.target.value))}
            className="select"
            style={{ width: 110 }}
            disabled={!autoAtualizar}
          >
            <option value={10}>10s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fetchPedidos(true)}
          >
            Atualizar Agora
          </button>
        </div>
      </div>

      {carregando ? (
        <div>Carregando pedidos abertos...</div>
      ) : erro ? (
        <div className="feedback-error">{erro}</div>
      ) : pedidosGarcom.length === 0 ? (
        <div>Nenhum pedido aberto no momento.</div>
      ) : (
        <ul className="stack">
          {pedidosGarcom.map((pedido) => (
            <li key={pedido.id} className="list-item">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {formatarItensComQuantidade(pedido)}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                    ID: {pedido.id}
                  </div>
                </div>
                <span
                  className={`status-badge ${
                    pedido.status.trim().toLowerCase() === 'pronto'
                      ? 'status-pronto'
                      : 'status-preparando'
                  }`}
                >
                  {pedido.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
