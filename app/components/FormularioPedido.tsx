'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAtualizacaoPedidos } from '../AtualizacaoPedidosContext';
import { useToast } from '../ToastContext';
import { CardapioItem, Pedido } from '../types';
import { apiRequest } from '../../lib/api';

interface FormularioPedidoProps {
  onPedidoEnviado?: () => void;
}

export default function FormularioPedido({
  onPedidoEnviado,
}: FormularioPedidoProps) {
  const { notificarAtualizacao } = useAtualizacaoPedidos();
  const { pushToast } = useToast();
  const pathname = usePathname();

  const [itensSelecionados, setItensSelecionados] = useState<
    Array<{ item: string; quantidade: number }>
  >([]);
  const [cardapio, setCardapio] = useState<CardapioItem[]>([]);
  const [carregandoCardapio, setCarregandoCardapio] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const resumoItens = itensSelecionados
    .map((selecionado) => {
      const itemCardapio = cardapio.find(
        (item) => item.item === selecionado.item,
      );
      const precoUnitario = itemCardapio?.preco ?? 0;
      const subtotal = precoUnitario * selecionado.quantidade;

      return {
        ...selecionado,
        precoUnitario,
        subtotal,
      };
    })
    .filter((entrada) => entrada.quantidade > 0);

  const totalComanda = resumoItens.reduce(
    (acc, entrada) => acc + entrada.subtotal,
    0,
  );

  useEffect(() => {
    setItensSelecionados([]);
    setMensagem('');
    setErro('');
    setEnviando(false);
  }, [pathname]);

  useEffect(() => {
    const fetchCardapio = async () => {
      setCarregandoCardapio(true);
      setErro('');

      try {
        const data = await apiRequest<CardapioItem[]>('/menu');
        setCardapio(Array.isArray(data) ? data : []);
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : 'Erro ao carregar cardapio.',
        );
      } finally {
        setCarregandoCardapio(false);
      }
    };

    fetchCardapio();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (itensSelecionados.length === 0) {
      setErro('Selecione ao menos um item do cardapio.');
      return;
    }

    setEnviando(true);
    setMensagem('');
    setErro('');

    try {
      await apiRequest<Pedido>('/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itens: itensSelecionados }),
      });
      setMensagem('Pedido enviado com sucesso!');
      pushToast('Pedido enviado para a cozinha.', 'success');
      setItensSelecionados([]);
      onPedidoEnviado?.();
      notificarAtualizacao();
    } catch (error) {
      pushToast('Falha ao enviar pedido.', 'error');
      setErro(
        error instanceof Error
          ? error.message
          : 'Erro de conexao com o servidor.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '2 1 520px',
            minWidth: 280,
            display: 'grid',
            gap: 10,
          }}
        >
          <label style={{ fontWeight: 600 }}>
            Selecione os itens do pedido:
          </label>

          {carregandoCardapio ? (
            <div>Carregando cardapio...</div>
          ) : cardapio.length === 0 ? (
            <div className="feedback-error">
              Nenhum item disponivel no cardapio.
            </div>
          ) : (
            <div className="panel" style={{ padding: 12 }}>
              <div className="stack">
                {cardapio.map((item, idx) => {
                  const itemSelecionado = itensSelecionados.find(
                    (entrada) => entrada.item === item.item,
                  );
                  const marcado = Boolean(itemSelecionado);
                  const quantidade = itemSelecionado?.quantidade ?? 1;

                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: marcado
                          ? 'var(--panel-strong)'
                          : 'var(--panel)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={enviando}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setMensagem('');
                            setErro('');
                            setItensSelecionados((prev) => {
                              if (checked) {
                                if (
                                  prev.some(
                                    (entrada) => entrada.item === item.item,
                                  )
                                ) {
                                  return prev;
                                }

                                return [
                                  ...prev,
                                  { item: item.item, quantidade: 1 },
                                ];
                              }

                              return prev.filter(
                                (entrada) => entrada.item !== item.item,
                              );
                            });
                          }}
                        />
                        <span>{item.item}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <strong>R$ {item.preco.toFixed(2)}</strong>
                        {marcado && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '2px 8px' }}
                              onClick={() =>
                                setItensSelecionados((prev) =>
                                  prev
                                    .map((entrada) =>
                                      entrada.item === item.item
                                        ? {
                                            ...entrada,
                                            quantidade: Math.max(
                                              1,
                                              entrada.quantidade - 1,
                                            ),
                                          }
                                        : entrada,
                                    )
                                    .filter(
                                      (entrada) => entrada.quantidade > 0,
                                    ),
                                )
                              }
                            >
                              -
                            </button>
                            <span
                              style={{
                                minWidth: 24,
                                textAlign: 'center',
                                fontWeight: 700,
                              }}
                            >
                              {quantidade}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '2px 8px' }}
                              onClick={() =>
                                setItensSelecionados((prev) =>
                                  prev.map((entrada) =>
                                    entrada.item === item.item
                                      ? {
                                          ...entrada,
                                          quantidade: entrada.quantidade + 1,
                                        }
                                      : entrada,
                                  ),
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ color: 'var(--muted)' }}>
            Itens selecionados: {itensSelecionados.length} | Quantidade total:{' '}
            {itensSelecionados.reduce((acc, item) => acc + item.quantidade, 0)}
          </div>
        </div>

        <aside style={{ flex: '1 1 300px', minWidth: 260 }}>
          <div className="panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Resumo da Comanda
            </div>

            {resumoItens.length === 0 ? (
              <div style={{ color: 'var(--muted)' }}>
                Selecione itens no cardapio para montar a comanda.
              </div>
            ) : (
              <>
                <ul className="stack" style={{ gap: 6 }}>
                  {resumoItens.map((entrada) => (
                    <li
                      key={entrada.item}
                      className="list-item"
                      style={{ padding: 8 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span>
                          {entrada.quantidade}x {entrada.item}
                        </span>
                        <strong>R$ {entrada.subtotal.toFixed(2)}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Total estimado</span>
                  <span style={{ fontWeight: 800, fontSize: 18 }}>
                    R$ {totalComanda.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <button
        type="submit"
        disabled={
          enviando || itensSelecionados.length === 0 || carregandoCardapio
        }
        className="btn btn-primary"
      >
        {enviando ? 'Enviando...' : 'Enviar para Cozinha'}
      </button>

      {mensagem && <div className="feedback-success">{mensagem}</div>}
      {erro && <div className="feedback-error">{erro}</div>}
    </form>
  );
}
