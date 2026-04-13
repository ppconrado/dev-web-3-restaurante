import { Pedido } from '../types';

const ITEM_SEPARATOR = ' | ';

export interface ItemPedidoDetalhado {
  item: string;
  quantidade: number;
}

function parseToken(token: string): ItemPedidoDetalhado | null {
  const valor = token.trim();
  if (!valor) return null;

  const match = valor.match(/^(\d+)x\s+(.+)$/i);
  if (match) {
    const quantidade = Number.parseInt(match[1], 10);
    const item = match[2].trim();
    if (!item) return null;
    return { item, quantidade: Number.isNaN(quantidade) ? 1 : quantidade };
  }

  return { item: valor, quantidade: 1 };
}

export function getItensDetalhadosDoPedido(
  pedido: Pedido,
): ItemPedidoDetalhado[] {
  if (
    Array.isArray(pedido.itensDetalhados) &&
    pedido.itensDetalhados.length > 0
  ) {
    return pedido.itensDetalhados;
  }

  if (Array.isArray(pedido.itens) && pedido.itens.length > 0) {
    return pedido.itens
      .map((item) => ({ item: item.trim(), quantidade: 1 }))
      .filter((entrada) => entrada.item);
  }

  if (!pedido.prato) {
    return [];
  }

  return pedido.prato
    .split(ITEM_SEPARATOR)
    .map(parseToken)
    .filter((entrada): entrada is ItemPedidoDetalhado => Boolean(entrada));
}

export function getItensDoPedido(pedido: Pedido): string[] {
  return getItensDetalhadosDoPedido(pedido).map((entrada) => entrada.item);
}

export function formatarItensPedido(itens: string[]): string {
  return itens.join(ITEM_SEPARATOR);
}

export function formatarItensComQuantidade(pedido: Pedido): string {
  return getItensDetalhadosDoPedido(pedido)
    .map((entrada) => `${entrada.quantidade}x ${entrada.item}`)
    .join(', ');
}
