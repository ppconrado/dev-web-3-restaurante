// Colocar sempre no topo
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Restaurante API',
    version: '1.0.0',
    description: 'API para gerenciamento de pedidos e cardápio do restaurante.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor local',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./index.js'], // Caminho para este arquivo
};

const swaggerSpec = swaggerJSDoc(options);
// Fim da configuração do Swagger
// Para salvar o arquivo swagger.json gerado automaticamente, precisamos do módulo 'fs' do Node.js
const fs = require('fs');
// Salva o swagger.json gerado automaticamente
fs.writeFileSync('./swagger.json', JSON.stringify(swaggerSpec, null, 2));
// Agora sim, o resto do código da nossa API
const express = require('express');
// Criamos a aplicação Express
const app = express();
// Nova dependência para lidar com CORS
const cors = require('cors');
// Definimos a porta onde o servidor vai rodar
const port = 3001;
// Middleware para permitir que o Express entenda JSON no corpo das requisições
app.use(express.json());
// Middleware para habilitar CORS e permitir que o frontend (que roda em outra porta) acesse nossa API
app.use(cors());
// Prisma Client para interagir com o banco de dados
const { PrismaClient } = require('@prisma/client'); // Primeira novidade, importa o prisma
// Segunda novidade, criamos uma instância do Prisma Client para usar em nossas rotas
const prisma = new PrismaClient(); // 2. Instancia o nosso "Cliente Prisma"

// O Cardápio continua aqui, Por enquanto ele é regra, não dado salvo
// const cardapio = [
//   { item: 'Macarronada', preco: 35.0 },
//   { item: 'Salada Ceasar', preco: 28.0 },
//   { item: 'Suco de Laranja', preco: 10.0 },
// ];

// Antes das rotas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//npm install swagger-ui-express

// --- ROTAS (Agora com ASYNC / AWAIT) ---
// Como ir ao banco na nuvem demora um pouco, nosso "java" vai ter que esperar (await)

// =======================================================
// 1. GET: Rota que busca todos os pedidos
// =======================================================
/**
 * @swagger
 * /pedidos:
 *   get:
 *     summary: Lista todos os pedidos
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
app.get('/pedidos', async (req, res) => {
  try {
    const todosOsPedidos = await prisma.pedido.findMany(); // Prisma, busque todos!
    res.json(todosOsPedidos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar pedidos.' });
  }
});

// =======================================================
// 2. POST: Rota que cadastra um pedido
// =======================================================
/**
 * @swagger
 * /pedidos:
 *   post:
 *     summary: Cria um novo pedido
 *     description: Cria um pedido apenas se o prato existir no cardápio do banco de dados.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prato:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido criado
 *       400:
 *         description: Erro de validação ou prato não existe no cardápio
 */
app.post('/pedidos', async (req, res) => {
  try {
    // Agora o pedido pode vir com um item unico (prato) ou com varios itens (itens)
    const { prato, itens } = req.body;
    // No frontend, quando formos enviar o pedido, precisamos fazer algo assim:
    // fetch('http://localhost:3001/pedidos', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ prato: pedido }),
    // });

    let itensNormalizados = [];

    if (Array.isArray(itens)) {
      itensNormalizados = itens
        .map((entrada) => {
          if (typeof entrada === 'string') {
            const nome = entrada.trim();
            return nome ? { item: nome, quantidade: 1 } : null;
          }

          if (!entrada || typeof entrada !== 'object') {
            return null;
          }

          const nome = String(entrada.item || '').trim();
          const qtd = Number(entrada.quantidade);

          if (!nome) {
            return null;
          }

          if (!Number.isInteger(qtd) || qtd <= 0) {
            return { item: nome, quantidade: NaN };
          }

          return { item: nome, quantidade: qtd };
        })
        .filter(Boolean);
    } else if (prato && String(prato).trim() !== '') {
      itensNormalizados = [{ item: String(prato).trim(), quantidade: 1 }];
    }

    if (itensNormalizados.length === 0) {
      return res
        .status(400)
        .json({ erro: 'Selecione ao menos um prato ou bebida para o pedido.' });
    }

    const itensComQuantidadeInvalida = itensNormalizados.filter(
      (item) => !Number.isInteger(item.quantidade) || item.quantidade <= 0,
    );

    if (itensComQuantidadeInvalida.length > 0) {
      return res.status(400).json({
        erro: 'Quantidade invalida. Use valores inteiros maiores que zero.',
      });
    }

    // Em MongoDB, o filtro com mode: 'insensitive' pode causar erro dependendo da versão.
    // Fazemos validação case-insensitive no Node para evitar 500 em tempo de execução.
    const itensMenu = await prisma.menu.findMany({
      select: { item: true },
    });

    const itensMenuNormalizados = itensMenu.map((produto) =>
      produto.item.toLowerCase(),
    );

    const itensInvalidos = itensNormalizados.filter(
      (item) => !itensMenuNormalizados.includes(item.item.toLowerCase()),
    );

    if (itensInvalidos.length > 0) {
      return res.status(400).json({
        erro: `Item(ns) nao encontrado(s) no cardapio: ${itensInvalidos
          .map((item) => item.item)
          .join(', ')}`,
      });
    }

    // Consolidar itens repetidos (ex.: dois sucos) antes de salvar
    const itensConsolidadosMap = new Map();
    itensNormalizados.forEach(({ item, quantidade }) => {
      const chave = item.toLowerCase();
      const existente = itensConsolidadosMap.get(chave);

      if (existente) {
        existente.quantidade += quantidade;
      } else {
        itensConsolidadosMap.set(chave, { item, quantidade });
      }
    });

    const itensConsolidados = Array.from(itensConsolidadosMap.values());

    // Aqui a nova mágica acontece
    const novoPedido = await prisma.pedido.create({
      data: {
        prato: itensConsolidados
          .map(({ item, quantidade }) => `${quantidade}x ${item}`)
          .join(' | '),
        // Não passamos o ID nem o status. O Prisma cuida disso pra nós
      },
    });

    res.status(201).json(novoPedido);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar pedido.' });
  }
});

// =======================================================
// 3. GET /menu - continua igual, ele ainda esta em memória
// =======================================================
/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Lista o cardápio do banco de dados
 *     responses:
 *       200:
 *         description: Lista de itens do cardápio cadastrados no banco
 */
// app.get('/menu', (req, res) => {
//   res.json(cardapio);
// });
app.get('/menu', async (req, res) => {
  try {
    const menu = await prisma.menu.findMany();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar cardapio.' });
  }
});

// =======================================================
// 4. GET POR ID: Rota que busca um pedido especifico
// =======================================================
/**
 * @swagger
 * /pedidos/{id}:
 *   get:
 *     summary: Busca um pedido pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido encontrado
 *       404:
 *         description: Pedido não encontrado
 */
app.get('/pedidos/:id', async (req, res) => {
  // Lembrete para a turma: Adeus parseInt! O ID do Mongo é uma String.
  const { id } = req.params;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: id },
    });

    // O Prisma retorna 'null' se pesquisar um ID válido que não existe
    if (!pedido) {
      return res
        .status(404)
        .json({ erro: 'Pedido não encontrado na cozinha.' });
    }

    res.json(pedido);
  } catch (error) {
    // Se o garçom digitar um ID que não tem o formato do MongoDB (ObjectId), cai aqui
    res.status(400).json({ erro: 'Formato de ID inválido.' });
  }
});

// =======================================================
// 5. PUT: Atualizar um pedido (Apenas mudança de status)
// =======================================================
/**
 * @swagger
 * /pedidos/{id}:
 *   put:
 *     summary: Atualiza o status de um pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pedido atualizado
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Pedido não encontrado
 */
app.put('/pedidos/:id', async (req, res) => {
  const { id } = req.params;

  // 1. Recebemos APENAS o status do corpo da requisição
  const { status } = req.body;

  // 2. Trava de segurança: e se enviarem o JSON vazio?
  if (!status || status.trim() === '') {
    return res
      .status(400)
      .json({ erro: 'O novo status é obrigatório para atualização.' });
  }

  try {
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: id },
      data: {
        status: status, // 3. O Prisma vai alterar SOMENTE este campo no banco
      },
    });

    res.json(pedidoAtualizado);
  } catch (error) {
    // O método update() é "chato". Se o ID não existir no banco, ele gera um erro!
    res.status(404).json({ erro: 'Pedido não encontrado para atualização.' });
  }
});

// =======================================================
// 6. DELETE: Cancelar/Excluir um pedido do sistema
// =======================================================
/**
 * @swagger
 * /pedidos/{id}:
 *   delete:
 *     summary: Exclui um pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Pedido excluído
 *       404:
 *         description: Pedido não encontrado
 */
app.delete('/pedidos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.pedido.delete({
      where: { id: id },
    });

    // Código 204 significa "No Content". A ação deu certo e não há o que devolver na tela.
    res.status(204).send();
  } catch (error) {
    // Igual ao update, se tentar deletar o que não existe, o Prisma grita e cai no catch.
    res.status(404).json({ erro: 'Pedido não encontrado para exclusão.' });
  }
});

// =======================================================
// 7. GET /pedidos/status/:status: Rota Bônus: Filtrar pedidos por status (Ex: GET /pedidos/status/preparando)
// =======================================================
//
/**
 * @swagger
 * /pedidos/status/{status}:
 *   get:
 *     summary: Filtra pedidos por status
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de pedidos filtrados
 *       404:
 *         description: Nenhum pedido encontrado
 */
app.get('/pedidos/status/:status', async (req, res) => {
  const { status } = req.params; // Pega o status digitado na URL

  try {
    const pedidosFiltrados = await prisma.pedido.findMany({
      where: {
        status: status, // O campo do banco deve bater com o parâmetro da URL
      },
    });

    // Bônus do bônus: Se não achar nenhum com aquele status, avisa!
    if (pedidosFiltrados.length === 0) {
      return res.status(404).json({
        mensagem: `Nenhum pedido com o status '${status}' encontrado.`,
      });
    }

    res.json(pedidosFiltrados);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar pedidos por status.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
