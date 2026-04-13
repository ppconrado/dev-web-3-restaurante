'use client';
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';

interface AtualizacaoPedidosContextType {
  atualizarPedidos: number;
  notificarAtualizacao: () => void;
}

const AtualizacaoPedidosContext = createContext<
  AtualizacaoPedidosContextType | undefined
>(undefined);

export function useAtualizacaoPedidos() {
  const ctx = useContext(AtualizacaoPedidosContext);
  if (!ctx)
    throw new Error(
      'useAtualizacaoPedidos deve ser usado dentro do AtualizacaoPedidosProvider',
    );
  return ctx;
}

export function AtualizacaoPedidosProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [atualizarPedidos, setAtualizarPedidos] = useState(0);

  const notificarAtualizacao = useCallback(() => {
    setAtualizarPedidos((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ atualizarPedidos, notificarAtualizacao }),
    [atualizarPedidos, notificarAtualizacao],
  );

  return (
    <AtualizacaoPedidosContext.Provider value={value}>
      {children}
    </AtualizacaoPedidosContext.Provider>
  );
}
