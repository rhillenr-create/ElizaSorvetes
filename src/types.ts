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

export type IceCreamContainer = 'casquinha' | 'copinho';

export interface CartItem {
  cartId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  selectedFlavors: string[];
  container?: IceCreamContainer;
  notes?: string;
  scoopsPerUnit?: number; // Bolas de sorvete por unidade (1 ou 2 para sorvete/cascão, 0 para sundae/picolé)
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';

export interface SaleHistoryEntry {
  timestamp: string;
  operatorName: string;
  reason: string;
  action: 'criada' | 'corrigida' | 'cancelada_com_estorno' | 'revisada';
  changesDescription?: string;
  previousSnapshot?: any;
}

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
  notes?: string;
  scoopsConsumed?: number; // Total de bolas consumidas calculado fielmente
  status?: 'normal' | 'corrigida' | 'cancelada' | 'divergencia_a_conferir';
  history?: SaleHistoryEntry[];
  originalRecord?: Partial<Sale>;
}

export type NavScreen = 'pdv' | 'produtos' | 'estoque' | 'relatorios' | 'auditoria';

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

export interface FlavorSaleReportItem {
  id: string;
  name: string;
  category: 'sorvete' | 'picole' | 'sundae';
  categoryLabel: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  salesCount: number;
  percentageOfCategory: number;
  percentageOfTotal: number;
  casquinhaCount: number;
  copinhoCount: number;
  currentStock?: number;
  stockUnit?: string;
  minStock?: number;
  stockStatus: 'normal' | 'baixo' | 'zerado' | 'sem_estoque_cadastrado';
  color?: string;
  isRegional?: boolean;
  isNutella?: boolean;
  rank?: number;
}

export interface ConsolidatedFlavorRanking {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  iceCreamQuantity: number;
  popsicleQuantity: number;
  color?: string;
  categoryDetail: string;
  isRegional?: boolean;
  isNutella?: boolean;
  rank?: number;
}

// ==========================================
// MÓDULO DE AUDITORIA E BALDES DE SORVETE
// ==========================================

export type TubPurchaseType = 'compra_setembro' | 'estoque_anterior' | 'compra_regular';

export interface TubPurchase {
  id: string;
  date: string; // "YYYY-MM-DD"
  timestamp: string;
  type: TubPurchaseType;
  tubsCount: number; // Quantidade de baldes
  volumePerTubLiters: number; // Padrão: 5 litros
  estimatedScoopsPerTub: number; // Padrão: 30 bolas
  popsiclesCount?: number; // Picolés que entraram juntos na entrega
  flavor?: string; // Sabor específico ou 'Sortidos / Mix'
  supplier?: string;
  cost?: number;
  lotNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  history?: {
    timestamp: string;
    operatorName: string;
    action: string;
    reason: string;
  }[];
}

export type PhysicalTubStatus = 'fechado_100' | 'aberto_75' | 'aberto_50' | 'aberto_25' | 'vazio_0';

export interface PhysicalTubItem {
  id: string;
  flavor: string;
  status: PhysicalTubStatus;
  percentage: number; // 100, 75, 50, 25, 0
  equivalentTubs: number; // 1.0, 0.75, 0.50, 0.25, 0.0
  notes?: string;
  updatedAt: string;
}

export type ConferenceStatus = 'conforme' | 'alerta_diferenca' | 'divergencia_a_conferir';

export interface StockConference {
  id: string;
  date: string;
  timestamp: string;
  auditorName: string;
  estimatedScoopsPerTub: number; // e.g. 30 bolas por balde
  tubsInitial: number; // Estoque anterior
  tubsPurchased: number; // Compras do período
  tubsSoldEquivalent: number; // Bolas vendidas / rendimento
  tubsTheoretical: number; // Inicial + Compras - Consumo
  tubsPhysicalCounted: number; // Baldes fechados + soma ponderada dos abertos
  tubsDifference: number; // Físico - Teórico
  scoopsSold: number; // Bolas reais de sorvete registradas em vendas
  scoopsEstimatedFromTubs: number; // Estimativa com base no consumo físico dos baldes
  scoopsDifference: number; // Diferença entre vendas e consumo físico
  physicalTubsList: PhysicalTubItem[];
  status: ConferenceStatus;
  investigationNotes?: string;
  history?: {
    timestamp: string;
    operatorName: string;
    action: string;
    reason: string;
  }[];
}

export interface DailyClosureRecord {
  id: string; // e.g. "FECH-2026-09-05"
  date: string; // "YYYY-MM-DD"
  closedAt: string;
  closedBy: string;
  version: number; // Versão 1, 2, etc. (Nunca apaga a versão original)
  status: 'fechado' | 'retificado' | 'divergencia_a_conferir';
  totalSalesCount: number;
  totalRevenue: number;
  paymentBreakdown: {
    dinheiro: number;
    pix: number;
    cartao_debito: number;
    cartao_credito: number;
  };
  productsSold: Record<string, { count: number; quantity: number; revenue: number }>;
  bolasConsumidas: number;
  baldesEquivalentes: number;
  cascoes1BolaCount: number;
  cascoes2BolasCount: number;
  sundaesCount: number; // Comprados prontos para revenda
  picolesCount: number;
  comprasBaldes: number;
  comprasPicoles: number;
  estoqueInformado?: number;
  estoqueTeorico?: number;
  diferenca?: number;
  despesasOuSangrias?: number;
  notes?: string;
  previousVersionSnapshot?: any;
  history?: {
    timestamp: string;
    operatorName: string;
    action: string;
    reason: string;
  }[];
}

export interface StockMovement {
  id: string;
  date: string;
  time: string;
  timestamp: string;
  type: 'compra' | 'venda_consumo' | 'ajuste_inventario' | 'perda_descarte' | 'correcao';
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  value?: number;
  responsibleUser: string;
  origin: 'pdv' | 'conferencia_estoque' | 'entrada_compras' | 'ajuste_manual';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  history?: {
    timestamp: string;
    operatorName: string;
    action: string;
    reason: string;
  }[];
}

export interface AuditInvestigationSummary {
  periodStart: string;
  periodEnd: string;
  daysWithSales: string[];
  daysWithoutSales: string[];
  totalSalesCount: number;
  totalRevenue: number;
  totalBolasConsumidas: number;
  totalBaldesEquivalentes: number;
  totalPicolesVendidos: number;
  totalSundaesVendidos: number;
  purchasedTubs: number;
  purchasedPopsicles: number;
  initialTubs: number;
  theoreticalTubs: number;
  physicalTubs: number;
  tubDifference: number;
  hasSignificantDifference: boolean;
  alertMessage?: string;
  dailyBreakdown: {
    date: string;
    salesCount: number;
    revenue: number;
    bolasConsumidas: number;
    cascoesCount: number;
    picolesCount: number;
    sundaesCount: number;
    comprasBaldes: number;
    comprasPicoles: number;
    status: 'normal' | 'sem_vendas' | 'divergencia';
  }[];
}



