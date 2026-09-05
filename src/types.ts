export type ProductCategory = 'sorvete' | 'picole' | 'bebida' | 'sobremesa';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  requiresFlavors: boolean;
  flavorType?: 'sorvete' | 'picole' | 'sundae';
  maxFlavors?: number;
  badge?: string;
  iconName?: string;
  colorBg?: string;
}

export interface Flavor {
  id: string;
  name: string;
  type: 'sorvete' | 'picole' | 'sundae';
  color?: string;
  description?: string;
  isNutella?: boolean;
  isRegional?: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  category: 'Sorvete' | 'Picolé' | 'Bebida' | 'Sobremesa';
  quantity: number;
  minQuantity: number; // Low stock threshold
  unit: string; // 'bolas', 'unidades', 'garrafas'
  updatedAt: string;
}

export interface CartItem {
  cartId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  selectedFlavors: string[];
  notes?: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';

export interface Sale {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  change?: number;
  cashierName?: string;
  customerName?: string;
}

export type NavScreen = 'pdv' | 'produtos' | 'estoque' | 'relatorios';
