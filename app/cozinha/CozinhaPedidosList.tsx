'use client';
// Client Component para CRUD dinâmico da cozinha
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAtualizacaoPedidos } from '../AtualizacaoPedidosContext';
import PedidoAcoes from './PedidoAcoes';
import { Pedido } from '../types';
import { apiRequest } from '../../lib/api';
import { useToast } from '../ToastContext';
import { formatarItensComQuantidade } from '../utils/pedidoItens';
import {
  getAutoRefreshStorageKey,
  readAutoRefreshSettings,
  writeAutoRefreshSettings,
} from '../utils/autoRefreshSettings';

export default function CozinhaPedidosList() {
  const { pushToast } = useToast();
  const { atualizarPedidos, notificarAtualizacao } = useAtualizacaoPedidos();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [atualizando, setAtualizando] = useState(false);
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [intervaloSegundos, setIntervaloSegundos] = useState(15);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<
    'todos' | 'preparando' | 'pronto' | 'entregue'
  >('todos');
  const [erro, setErro] = useState('');
  const emRequisicaoRef = useRef(false);

  const isStatusPronto = (status: string) =>
    status.trim().toLowerCase() === 'pronto';

  const isStatusEntregue = (status: string) =>
    status.trim().toLowerCase() === 'entregue';

  const getCreatedAtFromObjectId = (id: string) => {
    if (!id || id.length < 8) return null;
    const timestampHex = id.slice(0, 8);
    const seconds = Number.parseInt(timestampHex, 16);
    if (Number.isNaN(seconds)) return null;
    return new Date(seconds * 1000);
  };

  const getTempoEsperaMinutos = (id: string) => {
    const createdAt = getCreatedAtFromObjectId(id);
    if (!createdAt) return null;
    const diffMs = Date.now() - createdAt.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const fetchPedidos = useCallback(async (isBackground = false) => {
    if (emRequisicaoRef.current) {
      return;
    }
    emRequisicaoRef.current = true;

    if (isBackground) {
      setAtualizando(true);
    }

    try {
      setErro('');
      const data = await apiRequest<Pedido[]>('/pedidos');
      setPedidos(Array.isArray(data) ? data : []);
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao buscar pedidos. Verifique o backend ou a conexao.',
      );
    } finally {
      emRequisicaoRef.current = false;
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

    fetchPedidos(true);

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

  const pedidosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      const correspondeTexto =
        !texto ||
        pedido.prato.toLowerCase().includes(texto) ||
        pedido.id.toLowerCase().includes(texto);

      if (filtroStatus === 'todos') {
        return correspondeTexto;
      }

      if (filtroStatus === 'pronto') {
        return correspondeTexto && isStatusPronto(pedido.status);
      }

      if (filtroStatus === 'entregue') {
        return correspondeTexto && isStatusEntregue(pedido.status);
      }

      return (
        correspondeTexto &&
        !isStatusPronto(pedido.status) &&
        !isStatusEntregue(pedido.status)
      );
    });
  }, [pedidos, filtroTexto, filtroStatus]);

  const pedidosPreparando = useMemo(
    () =>
      pedidosFiltrados.filter(
        (pedido) =>
          !isStatusPronto(pedido.status) && !isStatusEntregue(pedido.status),
      ),
    [pedidosFiltrados],
  );

  const pedidosProntos = useMemo(
    () =>
      pedidosFiltrados.filter(
        (pedido) =>
          isStatusPronto(pedido.status) && !isStatusEntregue(pedido.status),
      ),
    [pedidosFiltrados],
  );

  const pedidosEntregues = useMemo(
    () => pedidosFiltrados.filter((pedido) => isStatusEntregue(pedido.status)),
    [pedidosFiltrados],
  );

  const handleStatusAtualizado = (pedidoId: string, novoStatus: string) => {
    setPedidos((prev) =>
      prev.map((pedido) =>
        pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido,
      ),
    );
  };

  const excluirDoHistorico = async (pedidoId: string) => {
    const confirmar = window.confirm(
      'Confirma excluir definitivamente este pedido do historico?',
    );
    if (!confirmar) return;

    try {
      await apiRequest<void>(`/pedidos/${pedidoId}`, { method: 'DELETE' });
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
      pushToast('Pedido removido do historico.', 'success');
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro ao excluir pedido do historico.',
      );
      pushToast('Falha ao excluir pedido do historico.', 'error');
    }
  };

  return (
    <>
      <div
        className="mb-6"
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ color: 'var(--muted)', display: 'grid', gap: 4 }}>
          <span>
            Em preparo: {pedidosPreparando.length} | Prontos:{' '}
            {pedidosProntos.length} | Entregues: {pedidosEntregues.length}
          </span>
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
            onClick={() => fetchPedidos(true)}
            className="btn btn-ghost"
          >
            Atualizar Agora
          </button>
        </div>
      </div>
      <div
        className="mb-6"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Filtrar por prato ou ID"
          className="input"
          style={{ minWidth: 260 }}
        />
        <select
          value={filtroStatus}
          onChange={(e) =>
            setFiltroStatus(
              e.target.value as 'todos' | 'preparando' | 'pronto' | 'entregue',
            )
          }
          className="select"
        >
          <option value="todos">Todos os status</option>
          <option value="preparando">Somente em preparo</option>
          <option value="pronto">Somente prontos</option>
          <option value="entregue">Somente entregues</option>
        </select>
      </div>
      {erro && (
        <div className="feedback-error" style={{ marginBottom: 16 }}>
          {erro}
        </div>
      )}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Pedidos em Preparação</h2>
        {pedidosPreparando.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>
            Nenhum pedido em preparação no momento.
          </div>
        ) : (
          <ul className="stack">
            {pedidosPreparando.map((pedido) => (
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
                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      ID: {pedido.id}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="status-badge status-preparando">
                        preparando
                      </span>
                      <span
                        className={`status-badge ${
                          (getTempoEsperaMinutos(pedido.id) ?? 0) >= 20
                            ? 'priority-high'
                            : 'priority-normal'
                        }`}
                      >
                        {(getTempoEsperaMinutos(pedido.id) ?? 0) >= 20
                          ? 'prioridade alta'
                          : 'prioridade normal'}
                      </span>
                      <span className="status-badge priority-normal">
                        espera: {getTempoEsperaMinutos(pedido.id) ?? 0} min
                      </span>
                    </div>
                  </div>
                </div>
                <PedidoAcoes
                  pedidoId={pedido.id}
                  statusAtual={pedido.status}
                  secao="preparando"
                  onStatusAtualizado={(novoStatus) =>
                    handleStatusAtualizado(pedido.id, novoStatus)
                  }
                  onAcaoConcluida={() => {
                    notificarAtualizacao();
                    fetchPedidos(true);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">Pedidos Prontos</h2>
        {pedidosProntos.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>
            Nenhum pedido pronto no momento.
          </div>
        ) : (
          <ul className="stack">
            {pedidosProntos.map((pedido) => (
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
                  <span className="status-badge status-pronto">pronto</span>
                </div>
                <PedidoAcoes
                  pedidoId={pedido.id}
                  statusAtual={pedido.status}
                  secao="pronto"
                  onStatusAtualizado={(novoStatus) =>
                    handleStatusAtualizado(pedido.id, novoStatus)
                  }
                  onAcaoConcluida={() => {
                    notificarAtualizacao();
                    fetchPedidos(true);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold mb-4">Historico de Entregues</h2>
        {pedidosEntregues.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>
            Nenhum pedido entregue nesta sessao.
          </div>
        ) : (
          <ul className="stack">
            {pedidosEntregues.map((pedido) => (
              <li key={pedido.id} className="list-item">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div>
                    <span className="font-semibold">
                      {formatarItensComQuantidade(pedido)}
                    </span>{' '}
                    (ID: {pedido.id})
                    <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                      Entregue em:{' '}
                      {getCreatedAtFromObjectId(pedido.id)?.toLocaleString(
                        'pt-BR',
                      ) || 'horario indisponivel'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => excluirDoHistorico(pedido.id)}
                  >
                    Excluir Definitivo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
