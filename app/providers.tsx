'use client';

import { ReactNode } from 'react';
import { AtualizacaoPedidosProvider } from './AtualizacaoPedidosContext';
import { ToastProvider } from './ToastContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AtualizacaoPedidosProvider>
      <ToastProvider>{children}</ToastProvider>
    </AtualizacaoPedidosProvider>
  );
}
