import { Sale, Product, StockItem, Flavor } from '../types';
import { ICE_CREAM_FLAVORS, POPSICLE_FLAVORS } from '../data/initialData';

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

export interface FlavorReportSummary {
  periodLabel: string;
  totalSalesCount: number;
  totalProductsSold: number;
  totalIceCreamSold: number;
  totalIceCreamRevenue: number;
  totalIceCreamUnits: number;
  totalPopsicleSold: number;
  totalPopsicleRevenue: number;
  totalSalesRevenue: number;
  totalFlavorRevenue: number;
  otherProductsRevenue: number;
  totalRevenue: number; // compatibilidade: reflete totalSalesRevenue
  totalItemsSold: number; // compatibilidade: reflete totalProductsSold
  topIceCream: FlavorSaleReportItem | null;
  topPopsicle: FlavorSaleReportItem | null;
  topOverallFlavor: ConsolidatedFlavorRanking | null;
  iceCreamFlavors: FlavorSaleReportItem[];
  popsicleFlavors: FlavorSaleReportItem[];
  allFlavors: FlavorSaleReportItem[];
  consolidatedFlavors: ConsolidatedFlavorRanking[];
  iceCreamPercentage: number;
  popsiclePercentage: number;
}

/**
 * Normaliza strings para comparação (remove acentos e espaços extras)
 */
function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Encontra o item de estoque correspondente para um determinado sabor e categoria
 */
function findStockForFlavor(
  flavorName: string,
  category: 'sorvete' | 'picole',
  stock: StockItem[]
): StockItem | undefined {
  const normFlavor = normalizeStr(flavorName);
  const targetCategory = category === 'sorvete' ? 'sorvete' : 'picole';

  // 1. Busca exata ou que contenha o nome do sabor na mesma categoria
  const match = stock.find((s) => {
    const sCat = normalizeStr(s.category);
    if (!sCat.includes(targetCategory)) return false;
    const sName = normalizeStr(s.name);
    return sName.includes(normFlavor) || normFlavor.includes(sName.replace(/^sorvete:\s*|^picole:\s*/, ''));
  });

  return match;
}

/**
 * Gera o relatório completo consolidado de vendas por sabor de sorvete e picolé
 */
export function generateFlavorSalesReport(
  sales: Sale[],
  products: Product[],
  stock: StockItem[],
  options: {
    periodLabel?: string;
    includeZeroSales?: boolean;
  } = {}
): FlavorReportSummary {
  const { periodLabel = 'Período', includeZeroSales = true } = options;

  // Mapa de agrupamento: chave única composta por "categoria:nome_normalizado"
  interface FlavorAccumulator {
    id: string;
    name: string;
    category: 'sorvete' | 'picole';
    quantitySold: number;
    totalRevenue: number;
    saleIds: Set<string>;
    casquinhaCount: number;
    copinhoCount: number;
    color?: string;
    isRegional?: boolean;
    isNutella?: boolean;
  }

  const flavorMap = new Map<string, FlavorAccumulator>();

  // 1. Inicializa com o catálogo base de sabores de sorvete (IDs com prefixo exclusivo)
  ICE_CREAM_FLAVORS.forEach((fl) => {
    const key = `sorvete:${normalizeStr(fl.name)}`;
    if (!flavorMap.has(key)) {
      flavorMap.set(key, {
        id: `sorvete_${fl.id}`,
        name: fl.name,
        category: 'sorvete',
        quantitySold: 0,
        totalRevenue: 0,
        saleIds: new Set<string>(),
        casquinhaCount: 0,
        copinhoCount: 0,
        color: fl.color,
        isRegional: fl.isRegional,
        isNutella: fl.isNutella
      });
    }
  });

  // 2. Inicializa com o catálogo base de sabores de picolé (IDs com prefixo exclusivo)
  POPSICLE_FLAVORS.forEach((fl) => {
    const key = `picole:${normalizeStr(fl.name)}`;
    if (!flavorMap.has(key)) {
      flavorMap.set(key, {
        id: `picole_${fl.id}`,
        name: fl.name,
        category: 'picole',
        quantitySold: 0,
        totalRevenue: 0,
        saleIds: new Set<string>(),
        casquinhaCount: 0,
        copinhoCount: 0,
        color: fl.color,
        isRegional: fl.isRegional,
        isNutella: fl.isNutella
      });
    }
  });

  // Métricas gerais de contagem de vendas
  let totalProductsSold = 0;
  let totalIceCreamUnits = 0;

  // 3. Processa cada venda e distribui para os sabores correspondentes
  sales.forEach((sale) => {
    if (!Array.isArray(sale.items)) return;

    sale.items.forEach((item) => {
      const itemQty = Number(item.quantity) || 1;
      const itemPrice = Number(item.price) || 0;
      const totalItemRevenue = itemPrice * itemQty;
      totalProductsSold += itemQty;

      // Descobre se o produto é Sorvete ou Picolé
      const prod = products.find((p) => p.id === item.productId || p.name === item.productName);
      let itemCategory: 'sorvete' | 'picole' = 'sorvete';

      const normProdName = normalizeStr(item.productName || '');
      if (
        prod?.flavorType === 'picole' ||
        prod?.category === 'picole' ||
        normProdName.includes('picole') ||
        normProdName.includes('picolé')
      ) {
        itemCategory = 'picole';
      } else {
        itemCategory = 'sorvete';
        totalIceCreamUnits += itemQty;
      }

      // Extrai a lista de sabores a processar
      let flavorsToProcess: string[] = [];
      if (Array.isArray(item.selectedFlavors) && item.selectedFlavors.length > 0) {
        flavorsToProcess = item.selectedFlavors.filter((f) => f && f.trim());
      } else {
        // Se selectedFlavors estiver vazio, infere o sabor pelo nome do produto
        if (normProdName.includes('acai') || normProdName.includes('açaí')) {
          flavorsToProcess = ['Açaí'];
        } else {
          // Busca em todos os sabores conhecidos se o nome do produto contém algum sabor
          const allKnown = [...ICE_CREAM_FLAVORS, ...POPSICLE_FLAVORS];
          for (const kf of allKnown) {
            const kfNorm = normalizeStr(kf.name);
            if (kfNorm.length >= 3 && normProdName.includes(kfNorm)) {
              flavorsToProcess = [kf.name];
              break;
            }
          }
        }
      }

      // Se não for um produto com sabor (ex: água mineral), ignora no mapa de sabores
      if (flavorsToProcess.length === 0) {
        return;
      }

      // Se for sorvete de 2 bolas, cada unidade contém 2 bolas
      let scoopsPerUnit = 1;
      if (item.productId === 'sorvete_2_bolas' || normProdName.includes('2 bolas')) {
        scoopsPerUnit = 2;
      }
      const totalItemScoops = itemQty * scoopsPerUnit;
      const scoopsPerFlavor = totalItemScoops / flavorsToProcess.length;
      const revenuePerFlavor = totalItemRevenue / flavorsToProcess.length;

      flavorsToProcess.forEach((flavorRaw) => {
        const flavorName = (flavorRaw || '').trim();
        if (!flavorName) return;

        let flavorCategory = itemCategory;
        const normFl = normalizeStr(flavorName);

        // Se o item foi classificado como sorvete mas o sabor é exclusivamente de picolé
        if (itemCategory === 'sorvete') {
          const inIce = ICE_CREAM_FLAVORS.some((f) => normalizeStr(f.name) === normFl);
          const inPop = POPSICLE_FLAVORS.some((f) => normalizeStr(f.name) === normFl);
          if (!inIce && inPop) {
            flavorCategory = 'picole';
          }
        }

        const key = `${flavorCategory}:${normFl}`;
        let acc = flavorMap.get(key);

        if (!acc) {
          const metaIce = ICE_CREAM_FLAVORS.find((f) => normalizeStr(f.name) === normFl);
          const metaPop = POPSICLE_FLAVORS.find((f) => normalizeStr(f.name) === normFl);
          const meta = flavorCategory === 'sorvete' ? metaIce : metaPop;

          acc = {
            id: `${flavorCategory}_${meta?.id || normFl.replace(/\s+/g, '_')}`,
            name: meta?.name || flavorName,
            category: flavorCategory,
            quantitySold: 0,
            totalRevenue: 0,
            saleIds: new Set<string>(),
            casquinhaCount: 0,
            copinhoCount: 0,
            color: meta?.color,
            isRegional: meta?.isRegional,
            isNutella: meta?.isNutella
          };
          flavorMap.set(key, acc);
        }

        acc.quantitySold += scoopsPerFlavor;
        acc.totalRevenue += revenuePerFlavor;
        if (sale.id) acc.saleIds.add(sale.id);

        if (flavorCategory === 'sorvete') {
          if (item.container === 'casquinha') {
            acc.casquinhaCount += scoopsPerFlavor;
          } else if (item.container === 'copinho') {
            acc.copinhoCount += scoopsPerFlavor;
          }
        }
      });
    });
  });

  // 4. Calcula totais agregados por categoria
  let totalIceCreamSold = 0;
  let totalIceCreamRevenue = 0;
  let totalPopsicleSold = 0;
  let totalPopsicleRevenue = 0;

  flavorMap.forEach((acc) => {
    if (acc.category === 'sorvete') {
      totalIceCreamSold += acc.quantitySold;
      totalIceCreamRevenue += acc.totalRevenue;
    } else {
      totalPopsicleSold += acc.quantitySold;
      totalPopsicleRevenue += acc.totalRevenue;
    }
  });

  const totalSalesRevenue = Number(sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0).toFixed(2));
  const totalFlavorRevenue = Number((totalIceCreamRevenue + totalPopsicleRevenue).toFixed(2));
  const otherProductsRevenue = Number(Math.max(0, totalSalesRevenue - totalFlavorRevenue).toFixed(2));
  const totalSalesCount = sales.length;

  // 5. Converte para lista completa com métricas de estoque e percentuais
  const transformToReportItem = (
    acc: FlavorAccumulator,
    catTotalSold: number
  ): FlavorSaleReportItem => {
    const stockItem = findStockForFlavor(acc.name, acc.category, stock);
    const currentStock = stockItem?.quantity;
    const minStock = stockItem?.minQuantity ?? 10;
    const stockUnit = stockItem?.unit || (acc.category === 'sorvete' ? 'bolas' : 'unidades');

    let stockStatus: FlavorSaleReportItem['stockStatus'] = 'sem_estoque_cadastrado';
    if (currentStock !== undefined) {
      if (currentStock <= 0) {
        stockStatus = 'zerado';
      } else if (currentStock <= minStock) {
        stockStatus = 'baixo';
      } else {
        stockStatus = 'normal';
      }
    }

    const percentageOfCategory = catTotalSold > 0 ? (acc.quantitySold / catTotalSold) * 100 : 0;
    const percentageOfTotal = totalFlavorRevenue > 0 ? (acc.totalRevenue / totalFlavorRevenue) * 100 : 0;
    const averagePrice = acc.quantitySold > 0 ? acc.totalRevenue / acc.quantitySold : 0;

    return {
      id: acc.id,
      name: acc.name,
      category: acc.category,
      categoryLabel: acc.category === 'sorvete' ? 'Sorvete' : 'Picolé',
      quantitySold: acc.quantitySold,
      totalRevenue: Number(acc.totalRevenue.toFixed(2)),
      averagePrice: Number(averagePrice.toFixed(2)),
      salesCount: acc.saleIds.size,
      percentageOfCategory: Number(percentageOfCategory.toFixed(1)),
      percentageOfTotal: Number(percentageOfTotal.toFixed(1)),
      casquinhaCount: acc.casquinhaCount,
      copinhoCount: acc.copinhoCount,
      currentStock,
      stockUnit,
      minStock,
      stockStatus,
      color: acc.color,
      isRegional: acc.isRegional,
      isNutella: acc.isNutella
    };
  };

  const rawIceCreamList: FlavorSaleReportItem[] = [];
  const rawPopsicleList: FlavorSaleReportItem[] = [];

  flavorMap.forEach((acc) => {
    if (!includeZeroSales && acc.quantitySold === 0) {
      return;
    }
    if (acc.category === 'sorvete') {
      rawIceCreamList.push(transformToReportItem(acc, totalIceCreamSold));
    } else {
      rawPopsicleList.push(transformToReportItem(acc, totalPopsicleSold));
    }
  });

  // Ordena por quantidade vendida decrescente (e desempate por faturamento)
  const sortFlavors = (a: FlavorSaleReportItem, b: FlavorSaleReportItem) => {
    if (b.quantitySold !== a.quantitySold) {
      return b.quantitySold - a.quantitySold;
    }
    return b.totalRevenue - a.totalRevenue;
  };

  rawIceCreamList.sort(sortFlavors);
  rawPopsicleList.sort(sortFlavors);

  // Atribui posições de ranking (#1, #2...)
  rawIceCreamList.forEach((item, index) => {
    item.rank = index + 1;
  });
  rawPopsicleList.forEach((item, index) => {
    item.rank = index + 1;
  });

  const combinedList = [...rawIceCreamList, ...rawPopsicleList].sort(sortFlavors);

  // 6. Constrói o ranking consolidado por sabor (combina vendas de sorvete e picolé para visão geral única)
  const consolidatedMap = new Map<string, {
    id: string;
    name: string;
    totalQuantity: number;
    totalRevenue: number;
    iceCreamQuantity: number;
    popsicleQuantity: number;
    color?: string;
    isRegional?: boolean;
    isNutella?: boolean;
  }>();

  flavorMap.forEach((acc) => {
    if (acc.quantitySold === 0) return;
    const norm = normalizeStr(acc.name);
    let existing = consolidatedMap.get(norm);
    if (!existing) {
      existing = {
        id: `consolidated_${norm.replace(/\s+/g, '_')}`,
        name: acc.name,
        totalQuantity: 0,
        totalRevenue: 0,
        iceCreamQuantity: 0,
        popsicleQuantity: 0,
        color: acc.color,
        isRegional: acc.isRegional,
        isNutella: acc.isNutella
      };
      consolidatedMap.set(norm, existing);
    }

    existing.totalQuantity += acc.quantitySold;
    existing.totalRevenue += acc.totalRevenue;
    if (acc.category === 'sorvete') {
      existing.iceCreamQuantity += acc.quantitySold;
    } else {
      existing.popsicleQuantity += acc.quantitySold;
    }
  });

  const consolidatedFlavors: ConsolidatedFlavorRanking[] = Array.from(consolidatedMap.values())
    .map((item) => {
      let detail = '';
      if (item.iceCreamQuantity > 0 && item.popsicleQuantity > 0) {
        detail = `${item.popsicleQuantity} ${item.popsicleQuantity === 1 ? 'picolé' : 'picolés'} • ${item.iceCreamQuantity} ${item.iceCreamQuantity === 1 ? 'bola sorvete' : 'bolas sorvete'}`;
      } else if (item.iceCreamQuantity > 0) {
        detail = `${item.iceCreamQuantity} ${item.iceCreamQuantity === 1 ? 'bola sorvete' : 'bolas sorvete'}`;
      } else if (item.popsicleQuantity > 0) {
        detail = `${item.popsicleQuantity} ${item.popsicleQuantity === 1 ? 'picolé' : 'picolés'}`;
      }

      return {
        id: item.id,
        name: item.name,
        totalQuantity: item.totalQuantity,
        totalRevenue: Number(item.totalRevenue.toFixed(2)),
        iceCreamQuantity: item.iceCreamQuantity,
        popsicleQuantity: item.popsicleQuantity,
        color: item.color,
        categoryDetail: detail,
        isRegional: item.isRegional,
        isNutella: item.isNutella
      };
    })
    .sort((a, b) => {
      if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity;
      return b.totalRevenue - a.totalRevenue;
    });

  consolidatedFlavors.forEach((item, index) => {
    item.rank = index + 1;
  });

  const topIceCream = rawIceCreamList.find((i) => i.quantitySold > 0) || rawIceCreamList[0] || null;
  const topPopsicle = rawPopsicleList.find((i) => i.quantitySold > 0) || rawPopsicleList[0] || null;
  const topOverallFlavor = consolidatedFlavors[0] || null;

  const iceCreamPercentage = totalFlavorRevenue > 0 ? (totalIceCreamRevenue / totalFlavorRevenue) * 100 : 0;
  const popsiclePercentage = totalFlavorRevenue > 0 ? (totalPopsicleRevenue / totalFlavorRevenue) * 100 : 0;

  return {
    periodLabel,
    totalSalesCount,
    totalProductsSold,
    totalIceCreamSold,
    totalIceCreamRevenue: Number(totalIceCreamRevenue.toFixed(2)),
    totalIceCreamUnits,
    totalPopsicleSold,
    totalPopsicleRevenue: Number(totalPopsicleRevenue.toFixed(2)),
    totalSalesRevenue,
    totalFlavorRevenue,
    otherProductsRevenue,
    totalRevenue: totalSalesRevenue,
    totalItemsSold: totalProductsSold,
    topIceCream,
    topPopsicle,
    topOverallFlavor,
    iceCreamFlavors: rawIceCreamList,
    popsicleFlavors: rawPopsicleList,
    allFlavors: combinedList,
    consolidatedFlavors,
    iceCreamPercentage: Number(iceCreamPercentage.toFixed(1)),
    popsiclePercentage: Number(popsiclePercentage.toFixed(1))
  };
}

/**
 * Exporta o relatório completo de sabores para arquivo CSV compatível com Microsoft Excel
 */
export function exportFlavorReportToCsv(
  items: FlavorSaleReportItem[],
  periodLabel: string,
  summary: FlavorReportSummary
): void {
  const headers = [
    'Categoria',
    'Posição Ranking',
    'Sabor',
    'Qtd Vendida (Bolas/Un)',
    'Faturamento Total (R$)',
    'Preço Médio (R$)',
    '% do Segmento',
    '% do Faturamento Total',
    'Pedidos Contendo Sabor',
    'Casquinhas',
    'Copinhos',
    'Estoque Atual',
    'Unidade Estoque',
    'Status Estoque',
    'Regional Paraense',
    'Contém Nutella'
  ];

  const rows = items.map((item) => [
    item.categoryLabel,
    item.rank ? `#${item.rank}` : '-',
    `"${item.name.replace(/"/g, '""')}"`,
    item.quantitySold,
    item.totalRevenue.toFixed(2).replace('.', ','),
    item.averagePrice.toFixed(2).replace('.', ','),
    `${item.percentageOfCategory.toFixed(1).replace('.', ',')}%`,
    `${item.percentageOfTotal.toFixed(1).replace('.', ',')}%`,
    item.salesCount,
    item.category === 'sorvete' ? item.casquinhaCount : '-',
    item.category === 'sorvete' ? item.copinhoCount : '-',
    item.currentStock !== undefined ? item.currentStock : 'N/C',
    item.stockUnit || '-',
    item.stockStatus.toUpperCase(),
    item.isRegional ? 'SIM' : 'NÃO',
    item.isNutella ? 'SIM' : 'NÃO'
  ]);

  // Linhas de cabeçalho do relatório com resumo geral
  const metaLines = [
    ['ELIZA SORVETES - RELATÓRIO COMPLETO DE VENDAS POR SABOR'],
    [`Período Apurado: ${periodLabel}`],
    [`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`],
    [''],
    ['RESUMO DO PERÍODO'],
    [`Total Geral de Vendas: ${summary.totalSalesCount} pedidos`],
    [`Faturamento Geral Total: R$ ${summary.totalSalesRevenue.toFixed(2).replace('.', ',')}`],
    [`Total de Produtos Vendidos: ${summary.totalProductsSold} produtos`],
    [`Faturamento Sorvetes: R$ ${summary.totalIceCreamRevenue.toFixed(2).replace('.', ',')} (${summary.totalIceCreamSold} bolas • ${summary.iceCreamPercentage.toFixed(1).replace('.', ',')}%)`],
    [`Faturamento Picolés: R$ ${summary.totalPopsicleRevenue.toFixed(2).replace('.', ',')} (${summary.totalPopsicleSold} un • ${summary.popsiclePercentage.toFixed(1).replace('.', ',')}%)`],
    [`Outros Produtos / Bebidas: R$ ${summary.otherProductsRevenue.toFixed(2).replace('.', ',')}`],
    [`Sabor Campeão Geral: ${summary.topOverallFlavor ? `${summary.topOverallFlavor.name} (${summary.topOverallFlavor.totalQuantity} un - ${summary.topOverallFlavor.categoryDetail})` : 'Nenhum'}`],
    [`Sabor Campeão Sorvete: ${summary.topIceCream ? `${summary.topIceCream.name} (${summary.topIceCream.quantitySold} bolas)` : 'Nenhum'}`],
    [`Sabor Campeão Picolé: ${summary.topPopsicle ? `${summary.topPopsicle.name} (${summary.topPopsicle.quantitySold} un)` : 'Nenhum'}`],
    [''],
    ['DETALHAMENTO POR SABOR']
  ];

  const csvContent =
    '\uFEFF' + // UTF-8 BOM para abrir com acentuação correta no Excel brasileiro
    metaLines.map((line) => line.join(';')).join('\r\n') +
    '\r\n' +
    headers.join(';') +
    '\r\n' +
    rows.map((row) => row.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `eliza_relatorio_sabores_${safeDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta o relatório completo de sabores para arquivo nativo Microsoft Excel (.xlsx)
 */
export async function exportFlavorReportToExcel(
  items: FlavorSaleReportItem[],
  periodLabel: string,
  summary: FlavorReportSummary
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Aba 1: Sabores e Vendas
  const rows = items.map((item) => ({
    'Categoria': item.categoryLabel,
    'Posição': item.rank ? `#${item.rank}` : '-',
    'Sabor': item.name,
    'Qtd Vendida (Bolas/Un)': item.quantitySold,
    'Faturamento Total (R$)': Number(item.totalRevenue.toFixed(2)),
    'Preço Médio (R$)': Number(item.averagePrice.toFixed(2)),
    '% Categoria': Number(item.percentageOfCategory.toFixed(1)),
    '% Faturamento Total': Number(item.percentageOfTotal.toFixed(1)),
    'Pedidos': item.salesCount,
    'Casquinhas': item.category === 'sorvete' ? item.casquinhaCount : '-',
    'Copinhos': item.category === 'sorvete' ? item.copinhoCount : '-',
    'Estoque': item.currentStock !== undefined ? item.currentStock : 'N/C',
    'Unidade': item.stockUnit || '-',
    'Status Estoque': item.stockStatus.toUpperCase(),
    'Regional Paraense': item.isRegional ? 'SIM' : 'NÃO',
    'Contém Nutella': item.isNutella ? 'SIM' : 'NÃO'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 }, // Categoria
    { wch: 10 }, // Posição
    { wch: 28 }, // Sabor
    { wch: 18 }, // Qtd
    { wch: 18 }, // Faturamento
    { wch: 15 }, // Preço Médio
    { wch: 14 }, // % Categoria
    { wch: 16 }, // % Total
    { wch: 12 }, // Pedidos
    { wch: 12 }, // Casquinhas
    { wch: 12 }, // Copinhos
    { wch: 12 }, // Estoque
    { wch: 10 }, // Unidade
    { wch: 15 }, // Status
    { wch: 14 }, // Regional
    { wch: 14 }  // Nutella
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Ranking de Sabores');

  // Aba 2: Resumo Executivo
  const summaryRows = [
    { 'Métrica / Indicador': 'Período Apurado', 'Valor': periodLabel },
    { 'Métrica / Indicador': 'Data de Emissão', 'Valor': new Date().toLocaleString('pt-BR') },
    { 'Métrica / Indicador': 'Total Geral de Pedidos', 'Valor': summary.totalSalesCount },
    { 'Métrica / Indicador': 'Faturamento Geral Total (R$)', 'Valor': Number(summary.totalSalesRevenue.toFixed(2)) },
    { 'Métrica / Indicador': 'Total de Produtos Vendidos', 'Valor': summary.totalProductsSold },
    { 'Métrica / Indicador': 'Faturamento Sorvetes (R$)', 'Valor': Number(summary.totalIceCreamRevenue.toFixed(2)) },
    { 'Métrica / Indicador': 'Bolas de Sorvete Vendidas', 'Valor': summary.totalIceCreamSold },
    { 'Métrica / Indicador': 'Faturamento Picolés (R$)', 'Valor': Number(summary.totalPopsicleRevenue.toFixed(2)) },
    { 'Métrica / Indicador': 'Picolés Vendidos', 'Valor': summary.totalPopsicleSold },
    { 'Métrica / Indicador': 'Outros Produtos / Bebidas (R$)', 'Valor': Number(summary.otherProductsRevenue.toFixed(2)) },
    { 'Métrica / Indicador': 'Sabor Campeão Geral', 'Valor': summary.topOverallFlavor ? `${summary.topOverallFlavor.name} (${summary.topOverallFlavor.totalQuantity} un)` : 'Nenhum' },
    { 'Métrica / Indicador': 'Sabor Campeão Sorvete', 'Valor': summary.topIceCream ? `${summary.topIceCream.name} (${summary.topIceCream.quantitySold} bolas)` : 'Nenhum' },
    { 'Métrica / Indicador': 'Sabor Campeão Picolé', 'Valor': summary.topPopsicle ? `${summary.topPopsicle.name} (${summary.topPopsicle.quantitySold} un)` : 'Nenhum' }
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Executivo');

  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  XLSX.writeFile(wb, `eliza_relatorio_sabores_${safeDate}.xlsx`);
}

/**
 * Exporta o relatório de sabores para arquivo PDF oficial
 */
export async function exportFlavorReportToPdf(
  items: FlavorSaleReportItem[],
  periodLabel: string,
  summary: FlavorReportSummary
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule.default || autoTableModule) as any;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Cabeçalho
  doc.setFillColor(190, 18, 60);
  doc.rect(14, 10, 182, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(159, 18, 57);
  doc.text('ELIZA SORVETES ARTESANAIS', 14, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text('RELATÓRIO DE VENDAS POR SABOR', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Período Apurado: ${periodLabel}   •   Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 31);

  // KPI boxes
  const kpiY = 34;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);

  doc.roundedRect(14, kpiY, 42, 13, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('FATURAMENTO TOTAL', 17, kpiY + 4);
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70);
  doc.text(`R$ ${summary.totalSalesRevenue.toFixed(2).replace('.', ',')}`, 17, kpiY + 9.5);

  doc.roundedRect(59, kpiY, 42, 13, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('SORVETES DE MASSA', 62, kpiY + 4);
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`R$ ${summary.totalIceCreamRevenue.toFixed(2).replace('.', ',')}`, 62, kpiY + 9.5);

  doc.roundedRect(104, kpiY, 42, 13, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('PICOLÉS ARTESANAIS', 107, kpiY + 4);
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`R$ ${summary.totalPopsicleRevenue.toFixed(2).replace('.', ',')}`, 107, kpiY + 9.5);

  doc.roundedRect(149, kpiY, 47, 13, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('SABOR CAMPEÃO GERAL', 152, kpiY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(159, 18, 57);
  doc.text(summary.topOverallFlavor ? `${summary.topOverallFlavor.name.substring(0, 18)}` : 'Nenhum', 152, kpiY + 9.5);

  // Tabela
  const tableHead = [['#', 'Sabor', 'Categoria', 'Qtd Vendida', 'Faturamento (R$)', 'Preço Médio', '% Segmento']];
  const tableBody = items.map((it) => [
    it.rank ? `#${it.rank}` : '-',
    it.name,
    it.categoryLabel,
    String(it.quantitySold),
    `R$ ${it.totalRevenue.toFixed(2).replace('.', ',')}`,
    `R$ ${it.averagePrice.toFixed(2).replace('.', ',')}`,
    `${it.percentageOfCategory.toFixed(1).replace('.', ',')}%`
  ]);

  autoTable(doc, {
    startY: 50,
    head: tableHead,
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [190, 18, 60],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [55, 65, 81],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [255, 248, 248]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [6, 95, 70] },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'center' }
    }
  });

  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  doc.save(`eliza_relatorio_sabores_${safeDate}.pdf`);
}

