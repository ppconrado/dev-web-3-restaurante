'use client';
// SSR: busca pedidos no lado do servidor para garantir dados ao acessar a página

import CozinhaPedidosList from './CozinhaPedidosList';
import BuscaPedidoPorId from './BuscaPedidoPorId';

export default function CozinhaPage() {
  return (
    <main className="app-shell">
      <header style={{ marginBottom: 20 }}>
        <h1 className="hero-title">Painel da Cozinha</h1>
        <p className="hero-subtitle">
          Organize preparos, finalize pratos e registre entregas.
        </p>
      </header>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2 className="panel-title">Busca Rapida</h2>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 8, color: 'var(--muted)' }}>
            Em "Pedidos em Preparacao" use "Marcar como Pronto". Em "Pedidos
            Prontos" use "Excluir Entregue".
          </div>
          <BuscaPedidoPorId />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Gestao de Pedidos</h2>
        </div>
        <div className="panel-body">
          <CozinhaPedidosList />
        </div>
      </section>
    </main>
  );
}
