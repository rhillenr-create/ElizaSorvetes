import { Product, Flavor, StockItem, Sale } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'sorvete_1_bola',
    name: 'Sorvete 1 Bola',
    category: 'sorvete',
    price: 6.00,
    description: 'Casquinha ou copinho crocante com 1 bola generosa',
    requiresFlavors: true,
    flavorType: 'sorvete',
    maxFlavors: 1,
    badge: 'Popular',
    iconName: 'IceCream2',
    colorBg: 'from-amber-100/80 to-rose-100/60'
  },
  {
    id: 'sorvete_2_bolas',
    name: 'Sorvete 2 Bolas',
    category: 'sorvete',
    price: 10.00,
    description: 'Casquinha ou copinho com até 2 sabores à sua escolha',
    requiresFlavors: true,
    flavorType: 'sorvete',
    maxFlavors: 2,
    badge: 'Melhor Valor',
    iconName: 'Sparkles',
    colorBg: 'from-rose-100/80 to-pink-100/70'
  },
  {
    id: 'sorvete_acai',
    name: 'Sorvete de Açaí',
    category: 'sorvete',
    price: 7.00,
    description: 'Açaí cremoso artesanal servido geladinho na taça ou copo',
    requiresFlavors: true,
    flavorType: 'sorvete',
    maxFlavors: 1,
    badge: 'Especial',
    iconName: 'Flame',
    colorBg: 'from-purple-100/70 to-pink-100/60'
  },
  {
    id: 'picole_simples',
    name: 'Picolé Simples',
    category: 'picole',
    price: 3.50,
    description: 'Picolé artesanal de frutas tropicais e cremosos tradicionais',
    requiresFlavors: true,
    flavorType: 'picole',
    maxFlavors: 1,
    badge: 'Frutas',
    iconName: 'Sun',
    colorBg: 'from-amber-100/80 to-yellow-100/70'
  },
  {
    id: 'picole_acai',
    name: 'Picolé de Açaí',
    category: 'picole',
    price: 4.00,
    description: 'Picolé puro de açaí paraense, sabor marcante e refrescante',
    requiresFlavors: true,
    flavorType: 'picole',
    maxFlavors: 1,
    badge: 'Paraense',
    iconName: 'Heart',
    colorBg: 'from-fuchsia-100/70 to-purple-100/60'
  },
  {
    id: 'sundae',
    name: 'Sundae Especial',
    category: 'sobremesa',
    price: 12.00,
    description: 'Sorvete com calda artesanal morna, chantilly e castanhas',
    requiresFlavors: true,
    flavorType: 'sundae',
    maxFlavors: 1,
    badge: 'Delícia',
    iconName: 'Award',
    colorBg: 'from-rose-100/80 to-amber-100/60'
  },
  {
    id: 'agua_mineral',
    name: 'Água Mineral 500ml',
    category: 'bebida',
    price: 3.50,
    description: 'Água mineral fresca e gelada (com ou sem gás)',
    requiresFlavors: false,
    badge: 'Bebida',
    iconName: 'Droplets',
    colorBg: 'from-sky-100/70 to-cyan-100/50'
  },
];

// Sabores de Sorvete e Açaí solicitados
export const ICE_CREAM_FLAVORS: Flavor[] = [
  { id: 'acai', name: 'Açaí', type: 'sorvete', color: '#5B146F', isRegional: true },
  { id: 'bacuri', name: 'Bacuri', type: 'sorvete', color: '#FFF8DC', isRegional: true },
  { id: 'capuccino_nutella', name: 'Capuccino com Nutella', type: 'sorvete', color: '#8B4513', isNutella: true },
  { id: 'chocolate_suico', name: 'Chocolate Suíço', type: 'sorvete', color: '#3E2723' },
  { id: 'delicias_do_para', name: 'Delícias do Pará', type: 'sorvete', color: '#D4AF37', isRegional: true },
  { id: 'morango', name: 'Morango', type: 'sorvete', color: '#E91E63' },
  { id: 'mestico', name: 'Mestiço', type: 'sorvete', color: '#795548', isRegional: true },
  { id: 'ninho_nutella', name: 'Ninho com Nutella', type: 'sorvete', color: '#EEDC82', isNutella: true },
  { id: 'ouro_branco', name: 'Ouro Branco', type: 'sorvete', color: '#FFFDD0' },
  { id: 'pave_cupuacu', name: 'Pavê de Cupuaçu', type: 'sorvete', color: '#F5DEB3', isRegional: true },
  { id: 'marajoara', name: 'Marajoara', type: 'sorvete', color: '#CD853F', isRegional: true },
  { id: 'sonho_de_valsa', name: 'Sonho de Valsa', type: 'sorvete', color: '#D2691E' },
  { id: 'tapioca', name: 'Tapioca', type: 'sorvete', color: '#FDF5E6', isRegional: true },
  { id: 'tapioca_nutella', name: 'Tapioca com Nutella', type: 'sorvete', color: '#8A3324', isNutella: true, isRegional: true },
];

// Sabores de Picolé solicitados
export const POPSICLE_FLAVORS: Flavor[] = [
  { id: 'p_acai', name: 'Açaí', type: 'picole', color: '#5B146F', isRegional: true },
  { id: 'p_amendoim', name: 'Amendoim', type: 'picole', color: '#C49A45' },
  { id: 'p_bacuri', name: 'Bacuri', type: 'picole', color: '#FFF8DC', isRegional: true },
  { id: 'p_brigadeiro', name: 'Brigadeiro', type: 'picole', color: '#4A2C2A' },
  { id: 'p_canjiquinha', name: 'Canjiquinha', type: 'picole', color: '#F7E7CE' },
  { id: 'p_castanha_para', name: 'Castanha do Pará', type: 'picole', color: '#D2B48C', isRegional: true },
  { id: 'p_ceu_azul', name: 'Céu Azul', type: 'picole', color: '#38BDF8' },
  { id: 'p_chocotino', name: 'Chocotino', type: 'picole', color: '#5C3A21' },
  { id: 'p_cupuacu', name: 'Cupuaçu', type: 'picole', color: '#F5DEB3', isRegional: true },
  { id: 'p_leite_condensado', name: 'Leite Condensado', type: 'picole', color: '#FFF8E7' },
  { id: 'p_muruci', name: 'Muruci', type: 'picole', color: '#FACC15', isRegional: true },
  { id: 'p_tapereba', name: 'Taperebá', type: 'picole', color: '#EAB308', isRegional: true },
  { id: 'p_tapioca', name: 'Tapioca', type: 'picole', color: '#FAF0E6', isRegional: true },
];

// Sabores de Calda para Sundae
export const SUNDAE_FLAVORS: Flavor[] = [
  { id: 's_chocolate', name: 'Calda de Chocolate Belga', type: 'sundae', color: '#3E2723' },
  { id: 's_morango', name: 'Calda de Morango Artesanal', type: 'sundae', color: '#E91E63' },
  { id: 's_caramelo', name: 'Calda de Caramelo Toffee', type: 'sundae', color: '#D97706' },
  { id: 's_nutella', name: 'Calda Quente de Nutella', type: 'sundae', color: '#78350F', isNutella: true },
  { id: 's_cupuacu', name: 'Geleia Suave de Cupuaçu', type: 'sundae', color: '#CA8A04', isRegional: true },
];

// Estoque Inicial
export const INITIAL_STOCK: StockItem[] = [
  // Sorvetes (medido em bolas estimadas por cuba)
  { id: 'st_acai', name: 'Sorvete: Açaí', category: 'Sorvete', quantity: 45, minQuantity: 12, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_bacuri', name: 'Sorvete: Bacuri', category: 'Sorvete', quantity: 28, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_capuccino_nutella', name: 'Sorvete: Capuccino com Nutella', category: 'Sorvete', quantity: 20, minQuantity: 8, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_chocolate_suico', name: 'Sorvete: Chocolate Suíço', category: 'Sorvete', quantity: 38, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_delicias_do_para', name: 'Sorvete: Delícias do Pará', category: 'Sorvete', quantity: 32, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_morango', name: 'Sorvete: Morango', category: 'Sorvete', quantity: 35, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_mestico', name: 'Sorvete: Mestiço', category: 'Sorvete', quantity: 18, minQuantity: 8, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_ninho_nutella', name: 'Sorvete: Ninho com Nutella', category: 'Sorvete', quantity: 42, minQuantity: 12, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_ouro_branco', name: 'Sorvete: Ouro Branco', category: 'Sorvete', quantity: 24, minQuantity: 8, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_pave_cupuacu', name: 'Sorvete: Pavê de Cupuaçu', category: 'Sorvete', quantity: 4, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' }, // Estoque baixo de demonstração
  { id: 'st_marajoara', name: 'Sorvete: Marajoara', category: 'Sorvete', quantity: 26, minQuantity: 8, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_sonho_de_valsa', name: 'Sorvete: Sonho de Valsa', category: 'Sorvete', quantity: 30, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_tapioca', name: 'Sorvete: Tapioca', category: 'Sorvete', quantity: 34, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' },
  { id: 'st_tapioca_nutella', name: 'Sorvete: Tapioca com Nutella', category: 'Sorvete', quantity: 6, minQuantity: 10, unit: 'bolas', updatedAt: '2026-09-03' }, // Estoque baixo de demonstração

  // Picolés
  { id: 'st_p_acai', name: 'Picolé: Açaí', category: 'Picolé', quantity: 30, minQuantity: 10, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_amendoim', name: 'Picolé: Amendoim', category: 'Picolé', quantity: 18, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_bacuri', name: 'Picolé: Bacuri', category: 'Picolé', quantity: 22, minQuantity: 10, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_brigadeiro', name: 'Picolé: Brigadeiro', category: 'Picolé', quantity: 25, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_canjiquinha', name: 'Picolé: Canjiquinha', category: 'Picolé', quantity: 3, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' }, // Estoque baixo
  { id: 'st_p_castanha_para', name: 'Picolé: Castanha do Pará', category: 'Picolé', quantity: 15, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_ceu_azul', name: 'Picolé: Céu Azul', category: 'Picolé', quantity: 28, minQuantity: 10, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_chocotino', name: 'Picolé: Chocotino', category: 'Picolé', quantity: 19, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_cupuacu', name: 'Picolé: Cupuaçu', category: 'Picolé', quantity: 24, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_leite_condensado', name: 'Picolé: Leite Condensado', category: 'Picolé', quantity: 20, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_muruci', name: 'Picolé: Muruci', category: 'Picolé', quantity: 14, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },
  { id: 'st_p_tapereba', name: 'Picolé: Taperebá', category: 'Picolé', quantity: 5, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' }, // Estoque baixo
  { id: 'st_p_tapioca', name: 'Picolé: Tapioca', category: 'Picolé', quantity: 27, minQuantity: 8, unit: 'unidades', updatedAt: '2026-09-03' },

  // Bebidas e Outros
  { id: 'st_agua_mineral', name: 'Água Mineral 500ml', category: 'Bebida', quantity: 48, minQuantity: 15, unit: 'garrafas', updatedAt: '2026-09-03' },
  { id: 'st_sundae_base', name: 'Taças de Sundae (Bases)', category: 'Sobremesa', quantity: 25, minQuantity: 10, unit: 'porções', updatedAt: '2026-09-03' },
];

// Vendas Iniciais para enriquecer a tela de Relatórios desde o primeiro acesso
export const INITIAL_SALES: Sale[] = [
  {
    id: 'VENDA-1001',
    timestamp: '2026-09-03T14:22:00',
    items: [
      {
        cartId: 'c-1',
        productId: 'sorvete_2_bolas',
        productName: 'Sorvete 2 Bolas',
        price: 10.00,
        quantity: 1,
        selectedFlavors: ['Ninho com Nutella', 'Morango']
      },
      {
        cartId: 'c-2',
        productId: 'agua_mineral',
        productName: 'Água Mineral 500ml',
        price: 3.50,
        quantity: 1,
        selectedFlavors: []
      }
    ],
    subtotal: 13.50,
    discount: 0,
    total: 13.50,
    paymentMethod: 'pix',
    cashierName: 'Eliza',
    customerName: 'Mariana Silva'
  },
  {
    id: 'VENDA-1002',
    timestamp: '2026-09-03T15:10:00',
    items: [
      {
        cartId: 'c-3',
        productId: 'picole_simples',
        productName: 'Picolé Simples',
        price: 3.50,
        quantity: 2,
        selectedFlavors: ['Céu Azul']
      },
      {
        cartId: 'c-4',
        productId: 'picole_acai',
        productName: 'Picolé de Açaí',
        price: 4.00,
        quantity: 1,
        selectedFlavors: ['Açaí']
      }
    ],
    subtotal: 11.00,
    discount: 0,
    total: 11.00,
    paymentMethod: 'cartao_debito',
    cashierName: 'Eliza',
    customerName: 'Carlos Oliveira'
  },
  {
    id: 'VENDA-1003',
    timestamp: '2026-09-03T16:05:00',
    items: [
      {
        cartId: 'c-5',
        productId: 'sundae',
        productName: 'Sundae Especial',
        price: 12.00,
        quantity: 1,
        selectedFlavors: ['Calda Quente de Nutella']
      }
    ],
    subtotal: 12.00,
    discount: 0,
    total: 12.00,
    paymentMethod: 'dinheiro',
    amountReceived: 20.00,
    change: 8.00,
    cashierName: 'Eliza',
    customerName: 'Lucas Santos'
  }
];
