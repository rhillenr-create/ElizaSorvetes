import { Sale, SalesReport, PaymentSummary, FlavorRanking, ProductRanking, CashShift, CashMovement } from '../types';
import { 
  getBrazilDateString, 
  getBrazilMonthString, 
  formatBrazilDateDisplay, 
  getBrazilIsoTimestamp 
} from './dateUtils';

/**
 * Constrói o objeto consolidado de relatório de vendas para um determinado dia.
 */
export function buildDailySalesReport(
  dateStr: string,
  sales: Sale[],
  operatorName?: string,
  existingReport?: SalesReport | null
): SalesReport {
  // Filtra as vendas que pertencem ao dia informado (no fuso de Brasília)
  const daySales = sales.filter((s) => getBrazilDateString(s.timestamp) === dateStr);

  const totalRevenue = daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalSalesCount = daySales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  let totalItemsSold = 0;
  const flavorCounts: Record<string, number> = {};
  const productMap: Record<string, { quantity: number; revenue: number }> = {};

  const paymentBreakdown: {
    dinheiro: PaymentSummary;
    pix: PaymentSummary;
    cartao_debito: PaymentSummary;
    cartao_credito: PaymentSummary;
  } = {
    dinheiro: { total: 0, count: 0 },
    pix: { total: 0, count: 0 },
    cartao_debito: { total: 0, count: 0 },
    cartao_credito: { total: 0, count: 0 }
  };

  daySales.forEach((sale) => {
    // Formas de pagamento
    const m = sale.paymentMethod;
    if (paymentBreakdown[m]) {
      paymentBreakdown[m].total += Number(sale.total) || 0;
      paymentBreakdown[m].count += 1;
    }

    // Itens e sabores
    if (Array.isArray(sale.items)) {
      sale.items.forEach((item) => {
        const q = Number(item.quantity) || 1;
        totalItemsSold += q;

        // Produtos
        const pName = item.productName || 'Item';
        if (!productMap[pName]) {
          productMap[pName] = { quantity: 0, revenue: 0 };
        }
        productMap[pName].quantity += q;
        productMap[pName].revenue += (Number(item.price) || 0) * q;

        // Sabores
        if (Array.isArray(item.selectedFlavors)) {
          item.selectedFlavors.forEach((fl) => {
            if (fl && fl.trim()) {
              flavorCounts[fl] = (flavorCounts[fl] || 0) + q;
            }
          });
        }
      });
    }
  });

  const topFlavors: FlavorRanking[] = Object.entries(flavorCounts)
    .map(([name, count]) => ({ name, count, flavorName: name, quantity: count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topProducts: ProductRanking[] = Object.entries(productMap)
    .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue, productName: name }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const paymentsSummary = {
    dinheiro: {
      ...paymentBreakdown.dinheiro,
      percentage: totalRevenue > 0 ? (paymentBreakdown.dinheiro.total / totalRevenue) * 100 : 0
    },
    pix: {
      ...paymentBreakdown.pix,
      percentage: totalRevenue > 0 ? (paymentBreakdown.pix.total / totalRevenue) * 100 : 0
    },
    cartao_debito: {
      ...paymentBreakdown.cartao_debito,
      percentage: totalRevenue > 0 ? (paymentBreakdown.cartao_debito.total / totalRevenue) * 100 : 0
    },
    cartao_credito: {
      ...paymentBreakdown.cartao_credito,
      percentage: totalRevenue > 0 ? (paymentBreakdown.cartao_credito.total / totalRevenue) * 100 : 0
    }
  };

  const salesIds = daySales.map((s) => s.id);
  const nowIso = getBrazilIsoTimestamp();

  return {
    id: `REL-DIA-${dateStr}`,
    type: 'diario',
    periodType: 'diario',
    periodDate: dateStr,
    periodLabel: formatBrazilDateDisplay(dateStr),
    totalRevenue,
    totalSalesCount,
    totalItemsSold,
    averageTicket,
    paymentBreakdown,
    paymentsSummary,
    topFlavors,
    topProducts,
    salesIds,
    createdAt: existingReport?.createdAt || nowIso,
    updatedAt: nowIso,
    generatedBy: operatorName || existingReport?.generatedBy || 'Gravação Automática Eliza Sorvetes',
    notes: `${totalSalesCount} venda(s) registrada(s) automaticamente no banco`
  };
}

/**
 * Constrói o objeto consolidado de relatório de vendas para um determinado mês.
 */
export function buildMonthlySalesReport(
  monthStr: string, // YYYY-MM
  sales: Sale[],
  operatorName?: string,
  existingReport?: SalesReport | null
): SalesReport {
  const monthSales = sales.filter((s) => getBrazilMonthString(s.timestamp) === monthStr);

  const totalRevenue = monthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalSalesCount = monthSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  let totalItemsSold = 0;
  const flavorCounts: Record<string, number> = {};
  const productMap: Record<string, { quantity: number; revenue: number }> = {};

  const paymentBreakdown: {
    dinheiro: PaymentSummary;
    pix: PaymentSummary;
    cartao_debito: PaymentSummary;
    cartao_credito: PaymentSummary;
  } = {
    dinheiro: { total: 0, count: 0 },
    pix: { total: 0, count: 0 },
    cartao_debito: { total: 0, count: 0 },
    cartao_credito: { total: 0, count: 0 }
  };

  monthSales.forEach((sale) => {
    const m = sale.paymentMethod;
    if (paymentBreakdown[m]) {
      paymentBreakdown[m].total += Number(sale.total) || 0;
      paymentBreakdown[m].count += 1;
    }

    if (Array.isArray(sale.items)) {
      sale.items.forEach((item) => {
        const q = Number(item.quantity) || 1;
        totalItemsSold += q;

        const pName = item.productName || 'Item';
        if (!productMap[pName]) {
          productMap[pName] = { quantity: 0, revenue: 0 };
        }
        productMap[pName].quantity += q;
        productMap[pName].revenue += (Number(item.price) || 0) * q;

        if (Array.isArray(item.selectedFlavors)) {
          item.selectedFlavors.forEach((fl) => {
            if (fl && fl.trim()) {
              flavorCounts[fl] = (flavorCounts[fl] || 0) + q;
            }
          });
        }
      });
    }
  });

  const topFlavors: FlavorRanking[] = Object.entries(flavorCounts)
    .map(([name, count]) => ({ name, count, flavorName: name, quantity: count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topProducts: ProductRanking[] = Object.entries(productMap)
    .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue, productName: name }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const paymentsSummary = {
    dinheiro: {
      ...paymentBreakdown.dinheiro,
      percentage: totalRevenue > 0 ? (paymentBreakdown.dinheiro.total / totalRevenue) * 100 : 0
    },
    pix: {
      ...paymentBreakdown.pix,
      percentage: totalRevenue > 0 ? (paymentBreakdown.pix.total / totalRevenue) * 100 : 0
    },
    cartao_debito: {
      ...paymentBreakdown.cartao_debito,
      percentage: totalRevenue > 0 ? (paymentBreakdown.cartao_debito.total / totalRevenue) * 100 : 0
    },
    cartao_credito: {
      ...paymentBreakdown.cartao_credito,
      percentage: totalRevenue > 0 ? (paymentBreakdown.cartao_credito.total / totalRevenue) * 100 : 0
    }
  };

  const [year, month] = monthStr.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const periodLabel = `${monthNames[mIndex] || month} de ${year}`;
  const nowIso = getBrazilIsoTimestamp();

  return {
    id: `REL-MES-${monthStr}`,
    type: 'mensal',
    periodType: 'mensal',
    periodDate: monthStr,
    periodLabel,
    totalRevenue,
    totalSalesCount,
    totalItemsSold,
    averageTicket,
    paymentBreakdown,
    paymentsSummary,
    topFlavors,
    topProducts,
    salesIds: monthSales.map((s) => s.id),
    createdAt: existingReport?.createdAt || nowIso,
    updatedAt: nowIso,
    generatedBy: operatorName || existingReport?.generatedBy || 'Gravação Automática Eliza Sorvetes',
    notes: `Consolidado mensal com ${totalSalesCount} venda(s)`
  };
}

/**
 * Normaliza qualquer objeto de relatório garantindo que paymentsSummary, paymentBreakdown
 * e todas as propriedades existam e nunca causem TypeError ao ler propriedades aninhadas.
 */
export function normalizeSalesReport(raw: any): SalesReport {
  const totalRev = Number(raw?.totalRevenue) || 0;
  const pbSource = raw?.paymentsSummary || raw?.paymentBreakdown || {};

  const getPayment = (key: string): PaymentSummary => {
    const item = pbSource[key] || {};
    const total = Number(item?.total) || 0;
    const count = Number(item?.count) || 0;
    const percentage = typeof item?.percentage === 'number' 
      ? item.percentage 
      : (totalRev > 0 ? (total / totalRev) * 100 : 0);
    return { total, count, percentage };
  };

  const paymentBreakdown = {
    dinheiro: getPayment('dinheiro'),
    pix: getPayment('pix'),
    cartao_debito: getPayment('cartao_debito'),
    cartao_credito: getPayment('cartao_credito')
  };

  const rawType = raw?.type || raw?.periodType || 'diario';
  const type: 'diario' | 'mensal' | 'fechamento_caixa' = 
    rawType === 'mensal' || rawType === 'fechamento_caixa' ? rawType : 'diario';

  const rawFlavors = Array.isArray(raw?.topFlavors) ? raw.topFlavors : [];
  const topFlavors: FlavorRanking[] = rawFlavors.map((f: any) => {
    const name = f?.name || f?.flavorName || 'Sabor';
    const count = Number(f?.count ?? f?.quantity) || 0;
    return { name, count, flavorName: name, quantity: count };
  });

  const rawProducts = Array.isArray(raw?.topProducts) ? raw.topProducts : [];
  const topProducts: ProductRanking[] = rawProducts.map((p: any) => {
    const name = p?.name || p?.productName || 'Produto';
    const quantity = Number(p?.quantity) || 0;
    const revenue = Number(p?.revenue) || 0;
    return { name, quantity, revenue, productName: name };
  });

  return {
    id: raw?.id || `REL-${Date.now()}`,
    type,
    periodType: type,
    periodDate: raw?.periodDate || '',
    periodLabel: raw?.periodLabel || '',
    totalRevenue: totalRev,
    totalSalesCount: Number(raw?.totalSalesCount) || 0,
    totalItemsSold: Number(raw?.totalItemsSold) || 0,
    averageTicket: Number(raw?.averageTicket) || 0,
    paymentBreakdown,
    paymentsSummary: paymentBreakdown,
    topFlavors,
    topProducts,
    salesIds: Array.isArray(raw?.salesIds) ? raw.salesIds : [],
    createdAt: raw?.createdAt || getBrazilIsoTimestamp(),
    updatedAt: raw?.updatedAt || getBrazilIsoTimestamp(),
    generatedBy: raw?.generatedBy,
    notes: raw?.notes
  };
}

/**
 * Retorna as datas distintas em que ocorreram vendas, ordenadas de forma decrescente.
 */
export function getDistinctSaleDates(sales: Sale[]): string[] {
  const dates = new Set<string>();
  sales.forEach((s) => {
    const d = getBrazilDateString(s.timestamp);
    if (d) dates.add(d);
  });
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

/**
 * Calcula o saldo esperado em gaveta considerando fundo inicial, vendas em dinheiro,
 * suprimentos, sangrias e ajustes de divergência de valores.
 */
export function calculateShiftExpectedCash(
  initialCash: number,
  totalCashSales: number,
  movements: CashMovement[]
): number {
  let net = (Number(initialCash) || 0) + (Number(totalCashSales) || 0);
  if (Array.isArray(movements)) {
    for (const m of movements) {
      const amt = Number(m.amount) || 0;
      if (m.type === 'suprimento') {
        net += amt;
      } else if (m.type === 'sangria') {
        net -= amt;
      } else if (m.type === 'ajuste') {
        if (m.adjustmentType === 'sobra') {
          net += amt;
        } else if (m.adjustmentType === 'falta') {
          net -= amt;
        } else {
          net += amt;
        }
      }
    }
  }
  return Number(net.toFixed(2));
}

/**
 * Normaliza um objeto de turno de caixa para garantir que todos os campos
 * existam e sejam seguros contra undefined/null.
 */
export function normalizeCashShift(raw: any): CashShift {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `CX-${Date.now()}`,
      status: 'fechado',
      openedAt: getBrazilIsoTimestamp(),
      operatorName: 'Operador',
      initialCash: 0,
      movements: [],
      totalCashSales: 0,
      totalPixSales: 0,
      totalDebitSales: 0,
      totalCreditSales: 0,
      totalSalesAmount: 0,
      totalSalesCount: 0,
      expectedCash: 0
    };
  }

  const movements: CashMovement[] = Array.isArray(raw.movements)
    ? raw.movements.map((m: any) => ({
        id: String(m?.id || `MOV-${Date.now()}`),
        type: m?.type === 'suprimento' || m?.type === 'sangria' || m?.type === 'ajuste' ? m.type : 'suprimento',
        amount: Number(m?.amount) || 0,
        reason: String(m?.reason || ''),
        timestamp: String(m?.timestamp || getBrazilIsoTimestamp()),
        operatorName: String(m?.operatorName || 'Operador'),
        adjustmentType: m?.adjustmentType === 'sobra' || m?.adjustmentType === 'falta' ? m.adjustmentType : undefined,
        previousExpectedCash: m?.previousExpectedCash !== undefined ? Number(m.previousExpectedCash) : undefined,
        newExpectedCash: m?.newExpectedCash !== undefined ? Number(m.newExpectedCash) : undefined
      }))
    : [];

  const initialCash = Number(raw.initialCash) || 0;
  const totalCashSales = Number(raw.totalCashSales) || 0;
  const calculatedExpected = calculateShiftExpectedCash(initialCash, totalCashSales, movements);

  return {
    id: String(raw.id || `CX-${Date.now()}`),
    status: raw.status === 'aberto' ? 'aberto' : 'fechado',
    openedAt: String(raw.openedAt || getBrazilIsoTimestamp()),
    closedAt: raw.closedAt ? String(raw.closedAt) : undefined,
    operatorName: String(raw.operatorName || 'Operador'),
    initialCash,
    movements,
    totalCashSales,
    totalPixSales: Number(raw.totalPixSales) || 0,
    totalDebitSales: Number(raw.totalDebitSales) || 0,
    totalCreditSales: Number(raw.totalCreditSales) || 0,
    totalSalesAmount: Number(raw.totalSalesAmount) || 0,
    totalSalesCount: Number(raw.totalSalesCount) || 0,
    expectedCash: raw.expectedCash !== undefined ? Number(raw.expectedCash) : calculatedExpected,
    countedCash: raw.countedCash !== undefined ? Number(raw.countedCash) : undefined,
    difference: raw.difference !== undefined ? Number(raw.difference) : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    hasAdjustment: Boolean(raw.hasAdjustment || movements.some((m) => m.type === 'ajuste')),
    adjustmentAmount: raw.adjustmentAmount !== undefined ? Number(raw.adjustmentAmount) : undefined,
    adjustmentReason: raw.adjustmentReason ? String(raw.adjustmentReason) : undefined,
    adjustedCountedCash: raw.adjustedCountedCash !== undefined ? Number(raw.adjustedCountedCash) : undefined
  };
}
