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
  shiftId?: string;
}

export type NavScreen = 'pdv' | 'produtos' | 'estoque' | 'relatorios';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'local_only' | 'error';

export interface OperatorUser {
  email: string;
  name: string;
  role: 'operator' | 'admin';
  loggedInAt: string;
}

export type CashMovementType = 'suprimento' | 'sangria' | 'ajuste';

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  timestamp: string;
  operatorName: string;
  adjustmentType?: 'sobra' | 'falta'; // Usado quando type === 'ajuste'
  previousExpectedCash?: number;
  newExpectedCash?: number;
}

export interface CashShift {
  id: string;
  status: 'aberto' | 'fechado';
  openedAt: string;
  closedAt?: string;
  operatorName: string;
  initialCash: number; // Fundo de troco inicial
  movements: CashMovement[]; // Entradas (suprimentos), retiradas (sangrias) e ajustes
  totalCashSales: number;
  totalPixSales: number;
  totalDebitSales: number;
  totalCreditSales: number;
  totalSalesAmount: number;
  totalSalesCount: number;
  expectedCash: number; // initialCash + totalCashSales + suprimentos - sangrias ± ajustes
  countedCash?: number; // Dinheiro contado na gaveta no fechamento
  difference?: number; // countedCash - expectedCash (Sobra ou Falta)
  notes?: string;
  // Campos de controle de ajuste de divergência
  hasAdjustment?: boolean;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  adjustedCountedCash?: number;
}

export interface PaymentSummary {
  total: number;
  count: number;
  percentage?: number;
}

export interface FlavorRanking {
  name: string;
  count: number;
  flavorName?: string;
  quantity?: number;
}

export interface ProductRanking {
  name: string;
  quantity: number;
  revenue: number;
  productName?: string;
}

export interface SalesReport {
  id: string; // e.g. "REL-2026-09-05"
  type: 'diario' | 'mensal' | 'fechamento_caixa';
  periodType?: 'diario' | 'mensal' | 'fechamento_caixa';
  periodDate: string; // "2026-09-05" or "2026-09"
  periodLabel: string; // "05/09/2026" or "Setembro/2026"
  totalRevenue: number;
  totalSalesCount: number;
  totalItemsSold: number;
  averageTicket: number;
  paymentBreakdown: {
    dinheiro: PaymentSummary;
    pix: PaymentSummary;
    cartao_debito: PaymentSummary;
    cartao_credito: PaymentSummary;
  };
  paymentsSummary?: {
    dinheiro: PaymentSummary;
    pix: PaymentSummary;
    cartao_debito: PaymentSummary;
    cartao_credito: PaymentSummary;
  };
  topFlavors: FlavorRanking[];
  topProducts?: ProductRanking[];
  salesIds: string[];
  createdAt: string;
  updatedAt: string;
  generatedBy?: string;
  notes?: string;
}


