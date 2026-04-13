const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMenu() {
  const cardapio = [
    { item: 'Macarronada', preco: 35.0 },
    { item: 'Salada Ceasar', preco: 28.0 },
    { item: 'Suco de Laranja', preco: 10.0 },
    { item: 'Pizza Margherita', preco: 40.0 },
    { item: 'Hambúrguer Artesanal', preco: 30.0 },
    { item: 'Sushi', preco: 50.0 },
  ];
  for (const prato of cardapio) {
    await prisma.menu.create({ data: prato });
  }
  console.log('Menu inserido no banco!');
  await prisma.$disconnect();
}

seedMenu();
