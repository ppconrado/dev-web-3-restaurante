import React from 'react';
import Link from 'next/link';
import CardapioList from './components/CardapioList';
import FormularioPedido from './components/FormularioPedido';
import PedidosAbertosList from './components/PedidosAbertosList';

export default function Home() {
  return (
    <main className="app-shell">
      <header style={{ marginBottom: 20 }}>
        <h1 className="hero-title">Painel do Garçom</h1>
        <p className="hero-subtitle">
          Registre pedidos, acompanhe os itens em preparo e envie para a
          cozinha.
        </p>
      </header>

      {/* <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2 className="panel-title">Cardapio do Restaurante</h2>
        </div>
        <div className="panel-body">
          <CardapioList />
        </div>
      </section> */}

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2 className="panel-title">Novo Pedido</h2>
        </div>
        <div className="panel-body">
          <FormularioPedido />
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h2 className="panel-title">Pedidos Abertos</h2>
        </div>
        <div className="panel-body">
          <PedidosAbertosList />
          <div style={{ marginTop: 16 }}>
            <Link href="/cozinha" className="btn btn-primary">
              Ir para Cozinha
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
