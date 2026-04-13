export interface CardapioItem {
  item: string;
  preco: number;
}

export interface Pedido {
  id: string;
  prato: string;
  itens?: string[];
  itensDetalhados?: Array<{ item: string; quantidade: number }>;
  status: string;
}
