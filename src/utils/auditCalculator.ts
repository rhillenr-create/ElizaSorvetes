import { 
  Sale, 
  TubPurchase, 
  PhysicalTubItem, 
  StockConference, 
  DailyClosureRecord, 
  AuditInvestigationSummary 
} from '../types';
import { getBrazilDateString, getBrazilIsoTimestamp } from './dateUtils';

/**
 * COMPRAS E ESTOQUE DE REFERÊNCIA OFICIAL DA ELIZA SORVETES (SETEMBRO/2026)
 * Inauguração: 05/09/2026
 * Compras registradas:
 * - 01/09: 6 baldes + 200 picolés
 * - 03/09: 8 baldes + 100 picolés
 * - 10/09: 2 baldes + 200 picolés
 * - 22/09: 7 baldes + 90 picolés
 * Total Compras: 23 baldes e 590 picolés
 * 
 * Estoque Anterior Informado pelo Proprietário (mantido estritamente separado das compras):
 * - 3 baldes anteriores já consumidos
 * - 4 baldes parcialmente consumidos atualmente
 */
export const OFFICIAL_REFERENCE_PURCHASES: TubPurchase[] = [
  {
    id: 'COMPRA-2026-09-01',
    date: '2026-09-01',
    timestamp: '2026-09-01T10:00:00.000-03:00',
    type: 'compra_setembro',
    tubsCount: 6,
    volumePerTubLiters: 5,
    estimatedScoopsPerTub: 30,
    popsiclesCount: 200,
    flavor: 'Sabores Sortidos / Mix Inauguração',
    supplier: 'Fornecedor Oficial de Fábrica',
    notes: 'Primeira entrega para preparação da inauguração (05/09)',
    createdBy: 'Proprietário',
    createdAt: '2026-09-01T10:00:00.000-03:00'
  },
  {
    id: 'COMPRA-2026-09-03',
    date: '2026-09-03',
    timestamp: '2026-09-03T11:30:00.000-03:00',
    type: 'compra_setembro',
    tubsCount: 8,
    volumePerTubLiters: 5,
    estimatedScoopsPerTub: 30,
    popsiclesCount: 100,
    flavor: 'Sabores Tradicionais e Regionais',
    supplier: 'Fornecedor Oficial de Fábrica',
    notes: 'Reforço de estoque para semana de abertura',
    createdBy: 'Proprietário',
    createdAt: '2026-09-03T11:30:00.000-03:00'
  },
  {
    id: 'COMPRA-2026-09-10',
    date: '2026-09-10',
    timestamp: '2026-09-10T14:00:00.000-03:00',
    type: 'compra_setembro',
    tubsCount: 2,
    volumePerTubLiters: 5,
    estimatedScoopsPerTub: 30,
    popsiclesCount: 200,
    flavor: 'Reposição Picolés e Baldes Especiais',
    supplier: 'Fornecedor Oficial de Fábrica',
    notes: 'Entrega recebida em 10/09 (sem movimentação de venda no dia)',
    createdBy: 'Proprietário',
    createdAt: '2026-09-10T14:00:00.000-03:00'
  },
  {
    id: 'COMPRA-2026-09-22',
    date: '2026-09-22',
    timestamp: '2026-09-22T09:45:00.000-03:00',
    type: 'compra_setembro',
    tubsCount: 7,
    volumePerTubLiters: 5,
    estimatedScoopsPerTub: 30,
    popsiclesCount: 90,
    flavor: 'Reposição Quinzenal',
    supplier: 'Fornecedor Oficial de Fábrica',
    notes: 'Entrega recebida em 22/09 (sem movimentação de venda no dia)',
    createdBy: 'Proprietário',
    createdAt: '2026-09-22T09:45:00.000-03:00'
  }
];

/**
 * Estoque anterior registrado de forma separada das compras de setembro
 */
export const OFFICIAL_PREVIOUS_STOCK: TubPurchase[] = [
  {
    id: 'ESTOQUE-ANTERIOR-CONSUMIDO',
    date: '2026-08-31',
    timestamp: '2026-08-31T18:00:00.000-03:00',
    type: 'estoque_anterior',
    tubsCount: 3,
    volumePerTubLiters: 5,
    estimatedScoopsPerTub: 30,
    notes: '3 baldes de estoque anterior informados pelo proprietário que já foram consumidos (NÃO somados nas compras de setembro)',
    createdBy: 'Proprietário',
    createdAt: '2026-08-31T18:00:00.000-03:00'
  }
];

/**
 * Baldes físicos parcialmente consumidos atualmente informados pelo proprietário
 * (4 baldes com percentuais médios para auditoria)
 */
export const INITIAL_PHYSICAL_TUBS: PhysicalTubItem[] = [
  { id: 'tub-aberto-1', flavor: 'Açaí', status: 'aberto_50', percentage: 50, equivalentTubs: 0.5, updatedAt: '2026-09-30' },
  { id: 'tub-aberto-2', flavor: 'Ninho com Nutella', status: 'aberto_50', percentage: 50, equivalentTubs: 0.5, updatedAt: '2026-09-30' },
  { id: 'tub-aberto-3', flavor: 'Tapioca', status: 'aberto_50', percentage: 50, equivalentTubs: 0.5, updatedAt: '2026-09-30' },
  { id: 'tub-aberto-4', flavor: 'Chocolate Suíço', status: 'aberto_50', percentage: 50, equivalentTubs: 0.5, updatedAt: '2026-09-30' }
];

/**
 * Calcula o consumo exato de bolas de sorvete para um item de venda individual.
 * Regras estritas:
 * - 1 bola (copinho ou casquinha) = 1 bola
 * - 2 bolas (copinho ou casquinha) = 2 bolas
 * - Cascão 1 bola / Cascão = 1 bola
 * - Cascão 2 bolas = 2 bolas
 * - Sorvete de Açaí = 1 bola
 * - SUNDAE = 0 bolas (Comprado pronto para revenda, NÃO consome sorvete dos baldes!)
 * - PICOLÉS = 0 bolas
 * - BEBIDAS / ÁGUA = 0 bolas
 */
export function calculateItemScoops(item: {
  productId?: string;
  productName?: string;
  quantity?: number;
  container?: string;
}): { scoopsPerUnit: number; totalScoops: number; isScoopConsumer: boolean } {
  const name = (item.productName || item.productId || '').toLowerCase();
  const qty = Number(item.quantity) || 1;

  // Sundae é comprado pronto para revenda: NUNCA desconta bolas de sorvete!
  if (name.includes('sundae')) {
    return { scoopsPerUnit: 0, totalScoops: 0, isScoopConsumer: false };
  }

  // Picolés e Bebidas não usam bolas de sorvete
  if (name.includes('picolé') || name.includes('picole') || name.includes('água') || name.includes('agua')) {
    return { scoopsPerUnit: 0, totalScoops: 0, isScoopConsumer: false };
  }

  // Cascão 2 Bolas
  if (name.includes('cascão 2') || name.includes('cascao 2') || (name.includes('cascão') && name.includes('2 bolas'))) {
    return { scoopsPerUnit: 2, totalScoops: 2 * qty, isScoopConsumer: true };
  }

  // Cascão 1 Bola ou Cascão Simples
  if (name.includes('cascão') || name.includes('cascao')) {
    return { scoopsPerUnit: 1, totalScoops: 1 * qty, isScoopConsumer: true };
  }

  // Sorvete 2 Bolas
  if (name.includes('2 bolas') || name.includes('duas bolas')) {
    return { scoopsPerUnit: 2, totalScoops: 2 * qty, isScoopConsumer: true };
  }

  // Sorvete 1 Bola ou Sorvete de Açaí
  if (name.includes('1 bola') || name.includes('uma bola') || name.includes('sorvete')) {
    return { scoopsPerUnit: 1, totalScoops: 1 * qty, isScoopConsumer: true };
  }

  return { scoopsPerUnit: 0, totalScoops: 0, isScoopConsumer: false };
}

/**
 * Calcula o total de bolas de sorvete consumidas em uma venda
 */
export function calculateSaleScoops(sale: Sale): number {
  if (!sale || !Array.isArray(sale.items)) return 0;
  return sale.items.reduce((sum, it) => sum + calculateItemScoops(it).totalScoops, 0);
}

/**
 * Calcula o total de BOLAS CONSUMIDAS para um grupo de vendas
 * Fórmula:
 * Vendas de 1 bola + (Vendas de 2 bolas × 2) + Cascões de 1 bola + (Cascões de 2 bolas × 2) + outros produtos de sorvete
 * (Sundaes, picolés e bebidas NÃO entram na conta!)
 */
export function calculateTotalBolasConsumidas(sales: Sale[]): {
  totalBolas: number;
  bolas1Bola: number;
  bolas2Bolas: number;
  bolasCascao1: number;
  bolasCascao2: number;
  bolasAcai: number;
  outrasBolas: number;
  sundaesTotal: number;
  picolesTotal: number;
} {
  let bolas1Bola = 0;
  let bolas2Bolas = 0;
  let bolasCascao1 = 0;
  let bolasCascao2 = 0;
  let bolasAcai = 0;
  let outrasBolas = 0;
  let sundaesTotal = 0;
  let picolesTotal = 0;

  sales.forEach((s) => {
    (s.items || []).forEach((it) => {
      const name = (it.productName || it.productId || '').toLowerCase();
      const q = Number(it.quantity) || 1;

      if (name.includes('sundae')) {
        sundaesTotal += q;
      } else if (name.includes('picolé') || name.includes('picole')) {
        picolesTotal += q;
      } else if (name.includes('cascão 2') || name.includes('cascao 2')) {
        bolasCascao2 += q * 2;
      } else if (name.includes('cascão') || name.includes('cascao')) {
        bolasCascao1 += q;
      } else if (name.includes('2 bolas')) {
        bolas2Bolas += q * 2;
      } else if (name.includes('sorvete de açaí') || name.includes('sorvete de acai')) {
        bolasAcai += q;
      } else if (name.includes('1 bola')) {
        bolas1Bola += q;
      } else if (name.includes('sorvete')) {
        outrasBolas += q;
      }
    });
  });

  const totalBolas = bolas1Bola + bolas2Bolas + bolasCascao1 + bolasCascao2 + bolasAcai + outrasBolas;

  return {
    totalBolas,
    bolas1Bola,
    bolas2Bolas,
    bolasCascao1,
    bolasCascao2,
    bolasAcai,
    outrasBolas,
    sundaesTotal,
    picolesTotal
  };
}

/**
 * Converte bolas consumidas para baldes equivalentes
 * Rendimento padrão: 30 bolas por balde de 5 litros
 */
export function calculateBaldesEquivalentes(bolasConsumidas: number, rendimentoPorBalde = 30): number {
  if (rendimentoPorBalde <= 0) return 0;
  return Number((bolasConsumidas / rendimentoPorBalde).toFixed(2));
}

/**
 * Calcula a soma ponderada de baldes físicos (fechados + abertos por percentual)
 */
export function calculatePhysicalTubsCount(items: PhysicalTubItem[]): number {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, it) => sum + (Number(it.percentage || 0) / 100), 0);
  return Number(total.toFixed(2));
}

/**
 * DRILL-DOWN REAL (REGRA #15):
 * Permite voltar de qualquer métrica ou total para as vendas individuais que compõem o número.
 */
export function getSalesDrillDown(
  sales: Sale[],
  metricType: 
    | 'todas_vendas'
    | 'bolas_consumidas'
    | 'sorvete_1_bola'
    | 'sorvete_2_bolas'
    | 'cascao_1_bola'
    | 'cascao_2_bolas'
    | 'sundaes'
    | 'picoles'
    | 'acai'
    | 'faturamento',
  filterDate?: string
): Sale[] {
  let list = sales;
  if (filterDate) {
    list = list.filter((s) => (s.timestamp || '').slice(0, 10) === filterDate);
  }

  if (metricType === 'todas_vendas' || metricType === 'faturamento') {
    return list;
  }

  return list.filter((s) => {
    return (s.items || []).some((it) => {
      const name = (it.productName || it.productId || '').toLowerCase();
      switch (metricType) {
        case 'bolas_consumidas':
          return calculateItemScoops(it).isScoopConsumer;
        case 'sorvete_1_bola':
          return name.includes('1 bola') && !name.includes('cascão') && !name.includes('cascao');
        case 'sorvete_2_bolas':
          return name.includes('2 bolas') && !name.includes('cascão') && !name.includes('cascao');
        case 'cascao_1_bola':
          return (name.includes('cascão') || name.includes('cascao')) && !name.includes('2');
        case 'cascao_2_bolas':
          return (name.includes('cascão') || name.includes('cascao')) && (name.includes('2') || name.includes('duas'));
        case 'sundaes':
          return name.includes('sundae');
        case 'picoles':
          return name.includes('picolé') || name.includes('picole');
        case 'acai':
          return name.includes('açaí') || name.includes('acai');
        default:
          return true;
      }
    });
  });
}

/**
 * Constrói a Investigação de Diferença de Auditoria
 */
export function buildAuditInvestigation(
  sales: Sale[],
  purchases: TubPurchase[],
  initialTubs = 0,
  physicalTubsCounted = 2.0, // 4 baldes pela metade = 2.0 baldes
  rendimentoPorBalde = 30
): AuditInvestigationSummary {
  // Ordena vendas cronologicamente
  const sortedSales = [...sales].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  const periodStart = sortedSales[0]?.timestamp?.slice(0, 10) || '2026-09-01';
  const periodEnd = sortedSales[sortedSales.length - 1]?.timestamp?.slice(0, 10) || '2026-09-30';

  // Conjunto de todas as datas de vendas
  const salesDatesSet = new Set<string>();
  const salesByDate: Record<string, Sale[]> = {};

  sortedSales.forEach((s) => {
    const d = (s.timestamp || '').slice(0, 10);
    if (!salesByDate[d]) salesByDate[d] = [];
    salesByDate[d].push(s);
    salesDatesSet.add(d);
  });

  // Mapeia compras por data (apenas compras de setembro, separadas do estoque anterior)
  const purchasesByDate: Record<string, { baldes: number; picoles: number }> = {};
  let totalPurchasedTubs = 0;
  let totalPurchasedPopsicles = 0;

  purchases.forEach((p) => {
    if (p.type === 'compra_setembro' || p.type === 'compra_regular') {
      totalPurchasedTubs += p.tubsCount || 0;
      totalPurchasedPopsicles += p.popsiclesCount || 0;

      if (!purchasesByDate[p.date]) purchasesByDate[p.date] = { baldes: 0, picoles: 0 };
      purchasesByDate[p.date].baldes += p.tubsCount || 0;
      purchasesByDate[p.date].picoles += p.popsiclesCount || 0;
    }
  });

  // Dias com e sem movimentação
  const daysWithSales: string[] = Array.from(salesDatesSet).sort();
  const allKnownDates = new Set<string>([...daysWithSales, ...Object.keys(purchasesByDate)]);
  
  // Adiciona dias de compras que não tiveram vendas registradas
  const daysWithoutSales: string[] = [];
  Object.keys(purchasesByDate).forEach((d) => {
    if (!salesDatesSet.has(d)) {
      daysWithoutSales.push(d);
    }
  });

  // Totais
  const stats = calculateTotalBolasConsumidas(sales);
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalBaldesEquivalentes = calculateBaldesEquivalentes(stats.totalBolas, rendimentoPorBalde);

  // Estoque Teórico: Estoque inicial + Compras - Consumo Registrado
  const theoreticalTubs = Number((initialTubs + totalPurchasedTubs - totalBaldesEquivalentes).toFixed(2));
  const tubDifference = Number((physicalTubsCounted - theoreticalTubs).toFixed(2));
  const hasSignificantDifference = Math.abs(tubDifference) > 1.5;

  let alertMessage = '';
  if (hasSignificantDifference) {
    alertMessage =
      'Foi identificada uma diferença entre o consumo estimado e as vendas registradas. Isso pode indicar venda não registrada, produto cadastrado incorretamente, ajuste de estoque ou diferença no rendimento real do balde. Verifique os registros antes de realizar qualquer correção.';
  }

  // Detalhamento diário consolidado
  const sortedDates = Array.from(allKnownDates).sort();
  const dailyBreakdown = sortedDates.map((date) => {
    const daySales = salesByDate[date] || [];
    const dayPurchases = purchasesByDate[date] || { baldes: 0, picoles: 0 };
    const dayStats = calculateTotalBolasConsumidas(daySales);
    const dayRevenue = daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    let status: 'normal' | 'sem_vendas' | 'divergencia' = 'normal';
    if (daySales.length === 0 && dayPurchases.baldes > 0) {
      status = 'sem_vendas';
    }

    return {
      date,
      salesCount: daySales.length,
      revenue: Number(dayRevenue.toFixed(2)),
      bolasConsumidas: dayStats.totalBolas,
      cascoesCount: (dayStats.bolasCascao1) + (dayStats.bolasCascao2 / 2),
      picolesCount: dayStats.picolesTotal,
      sundaesCount: dayStats.sundaesTotal,
      comprasBaldes: dayPurchases.baldes,
      comprasPicoles: dayPurchases.picoles,
      status
    };
  });

  return {
    periodStart,
    periodEnd,
    daysWithSales,
    daysWithoutSales,
    totalSalesCount: sales.length,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalBolasConsumidas: stats.totalBolas,
    totalBaldesEquivalentes,
    totalPicolesVendidos: stats.picolesTotal,
    totalSundaesVendidos: stats.sundaesTotal,
    purchasedTubs: totalPurchasedTubs,
    purchasedPopsicles: totalPurchasedPopsicles,
    initialTubs,
    theoreticalTubs,
    physicalTubs: physicalTubsCounted,
    tubDifference,
    hasSignificantDifference,
    alertMessage: alertMessage || undefined,
    dailyBreakdown
  };
}
