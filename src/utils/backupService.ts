import { 
  Sale, 
  StockItem, 
  Product, 
  TubPurchase, 
  StockConference, 
  DailyClosureRecord, 
  CashShift 
} from '../types';
import { safeStorage } from './storage';
import { getBrazilIsoTimestamp } from './dateUtils';

export interface FullBackupSnapshot {
  version: string;
  createdAt: string;
  description: string;
  metadata: {
    app: string;
    totalSales: number;
    totalRevenue: number;
    totalStockItems: number;
    totalPurchases: number;
    totalClosures: number;
  };
  sales: Sale[];
  stock: StockItem[];
  products: Product[];
  purchases: TubPurchase[];
  conferences: StockConference[];
  closures: DailyClosureRecord[];
  shifts: CashShift[];
}

/**
 * Cria um snapshot de backup completo de todos os dados do sistema
 */
export function generateBackupSnapshot(params: {
  sales: Sale[];
  stock: StockItem[];
  products: Product[];
  purchases: TubPurchase[];
  conferences: StockConference[];
  closures: DailyClosureRecord[];
  shifts: CashShift[];
  description?: string;
}): FullBackupSnapshot {
  const { sales, stock, products, purchases, conferences, closures, shifts, description } = params;
  const now = getBrazilIsoTimestamp();
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const snapshot: FullBackupSnapshot = {
    version: '2.0-audited',
    createdAt: now,
    description: description || 'Backup de integridade estrutural e auditoria - Eliza Sorvetes',
    metadata: {
      app: 'Eliza Sorvetes Artesanais - Sistema PDV & Auditoria',
      totalSales: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalStockItems: stock.length,
      totalPurchases: purchases.length,
      totalClosures: closures.length
    },
    sales: JSON.parse(JSON.stringify(sales)),
    stock: JSON.parse(JSON.stringify(stock)),
    products: JSON.parse(JSON.stringify(products)),
    purchases: JSON.parse(JSON.stringify(purchases)),
    conferences: JSON.parse(JSON.stringify(conferences)),
    closures: JSON.parse(JSON.stringify(closures)),
    shifts: JSON.parse(JSON.stringify(shifts))
  };

  // Salva no histórico de backups do safeStorage (mantém até 10 snapshots recentes)
  try {
    const existingBackups = safeStorage.get<FullBackupSnapshot[]>('eliza_backup_history', []);
    const updatedHistory = [snapshot, ...existingBackups.slice(0, 9)];
    safeStorage.set('eliza_backup_history', updatedHistory);
  } catch (err) {
    console.warn('Aviso ao armazenar snapshot local:', err);
  }

  return snapshot;
}

/**
 * Faz o download do arquivo de backup JSON no navegador do usuário
 */
export function downloadBackupFile(snapshot: FullBackupSnapshot): void {
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDate = snapshot.createdAt.replace(/[:.]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `eliza_sorvetes_backup_completo_${safeDate}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida a integridade de um arquivo de backup antes da importação
 */
export function validateBackupData(data: any): {
  isValid: boolean;
  errors: string[];
  summary: {
    salesCount: number;
    purchasesCount: number;
    closuresCount: number;
    stockCount: number;
    createdAt?: string;
  };
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Arquivo de backup corrompido ou formato JSON inválido.'],
      summary: { salesCount: 0, purchasesCount: 0, closuresCount: 0, stockCount: 0 }
    };
  }

  if (!Array.isArray(data.sales)) {
    errors.push('O backup não contém o array de vendas (sales).');
  }

  if (Array.isArray(data.sales)) {
    const invalidSales = data.sales.filter((s: any) => !s || !s.id || typeof s.total !== 'number');
    if (invalidSales.length > 0) {
      errors.push(`Identificadas ${invalidSales.length} vendas com formato incompleto.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    summary: {
      salesCount: Array.isArray(data.sales) ? data.sales.length : 0,
      purchasesCount: Array.isArray(data.purchases) ? data.purchases.length : 0,
      closuresCount: Array.isArray(data.closures) ? data.closures.length : 0,
      stockCount: Array.isArray(data.stock) ? data.stock.length : 0,
      createdAt: data.createdAt
    }
  };
}

/**
 * Mescla e restaura dados garantindo a REGRA #1 e #2:
 * NUNCA apaga dados existentes. Se houver conflito entre antigo e novo,
 * preserva o histórico e marca como divergência para revisão manual.
 */
export function mergeAndRestoreData(
  currentData: {
    sales: Sale[];
    stock: StockItem[];
    purchases: TubPurchase[];
    closures: DailyClosureRecord[];
    shifts: CashShift[];
  },
  importedBackup: FullBackupSnapshot,
  operatorName = 'Auditor'
): {
  mergedSales: Sale[];
  mergedStock: StockItem[];
  mergedPurchases: TubPurchase[];
  mergedClosures: DailyClosureRecord[];
  mergedShifts: CashShift[];
  newSalesAdded: number;
  conflictsDetected: number;
} {
  let newSalesAdded = 0;
  let conflictsDetected = 0;

  // 1. Vendas
  const salesMap = new Map<string, Sale>();
  currentData.sales.forEach((s) => salesMap.set(s.id, { ...s }));

  if (Array.isArray(importedBackup.sales)) {
    importedBackup.sales.forEach((importedSale) => {
      if (!importedSale || !importedSale.id) return;

      const existing = salesMap.get(importedSale.id);
      if (!existing) {
        // Nova venda não presente no sistema atual
        salesMap.set(importedSale.id, importedSale);
        newSalesAdded++;
      } else {
        // Verifica se há conflito de valores
        const hasDifference =
          Math.abs((existing.total || 0) - (importedSale.total || 0)) > 0.01 ||
          existing.paymentMethod !== importedSale.paymentMethod ||
          existing.items.length !== importedSale.items.length;

        if (hasDifference) {
          conflictsDetected++;
          // Cria registro de histórico de divergência sem apagar o original
          const updatedHistory = existing.history || [];
          updatedHistory.push({
            timestamp: getBrazilIsoTimestamp(),
            operatorName,
            action: 'revisada',
            reason: `Conflito detectado na importação de backup. Registro original mantido e marcado para revisão.`,
            changesDescription: `Total atual: R$ ${existing.total} vs Total importado: R$ ${importedSale.total}`,
            previousSnapshot: importedSale
          });

          existing.status = 'divergencia_a_conferir';
          existing.history = updatedHistory;
          salesMap.set(existing.id, existing);
        }
      }
    });
  }

  // 2. Compras
  const purchasesMap = new Map<string, TubPurchase>();
  currentData.purchases.forEach((p) => purchasesMap.set(p.id, { ...p }));
  if (Array.isArray(importedBackup.purchases)) {
    importedBackup.purchases.forEach((p) => {
      if (p && p.id && !purchasesMap.has(p.id)) {
        purchasesMap.set(p.id, p);
      }
    });
  }

  // 3. Fechamentos
  const closuresMap = new Map<string, DailyClosureRecord>();
  currentData.closures.forEach((c) => closuresMap.set(c.id, { ...c }));
  if (Array.isArray(importedBackup.closures)) {
    importedBackup.closures.forEach((c) => {
      if (c && c.id && !closuresMap.has(c.id)) {
        closuresMap.set(c.id, c);
      }
    });
  }

  // 4. Turnos
  const shiftsMap = new Map<string, CashShift>();
  currentData.shifts.forEach((sh) => shiftsMap.set(sh.id, { ...sh }));
  if (Array.isArray(importedBackup.shifts)) {
    importedBackup.shifts.forEach((sh) => {
      if (sh && sh.id && !shiftsMap.has(sh.id)) {
        shiftsMap.set(sh.id, sh);
      }
    });
  }

  const mergedSales = Array.from(salesMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    mergedSales,
    mergedStock: currentData.stock,
    mergedPurchases: Array.from(purchasesMap.values()),
    mergedClosures: Array.from(closuresMap.values()),
    mergedShifts: Array.from(shiftsMap.values()),
    newSalesAdded,
    conflictsDetected
  };
}
