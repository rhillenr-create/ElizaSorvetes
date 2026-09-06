import React, { useState, useMemo, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { Sale, CashShift, SalesReport } from '../../types';
import { ReceiptModal } from '../PDV/ReceiptModal';
import { CashShiftModal, CashModalMode } from '../CashRegister/CashShiftModal';
import { 
  getBrazilDateString, 
  getBrazilMonthString, 
  getBrazilYesterdayDateString, 
  formatBrazilDateTime, 
  formatBrazilTime 
} from '../../utils/dateUtils';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  CreditCard, 
  QrCode, 
  Banknote, 
  RotateCcw,
  Search,
  Eye,
  FileText,
  Calendar,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Printer,
  Lock,
  Unlock,
  ArrowDownRight,
  ArrowUpRight,
  Database,
  Filter,
  Layers,
  Clock,
  Coins
} from 'lucide-react';

export type PeriodFilter = 'todos' | 'hoje' | 'ontem' | 'este_mes' | 'dia_especifico' | 'mes_especifico';
export type PaymentFilter = 'todos' | 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito';

// Safe helper to extract payment breakdown without throwing TypeError
const getSafeReportPayments = (report?: SalesReport | null) => {
  const pb = report?.paymentsSummary || report?.paymentBreakdown || {};
  const totalRev = Number(report?.totalRevenue) || 0;

  const getEntry = (item?: any) => {
    const total = Number(item?.total) || 0;
    const count = Number(item?.count) || 0;
    const percentage = typeof item?.percentage === 'number'
      ? item.percentage
      : (totalRev > 0 ? (total / totalRev) * 100 : 0);
    return { total, count, percentage };
  };

  return {
    dinheiro: getEntry((pb as any)?.dinheiro),
    pix: getEntry((pb as any)?.pix),
    cartao_debito: getEntry((pb as any)?.cartao_debito),
    cartao_credito: getEntry((pb as any)?.cartao_credito),
  };
};

export const ReportsView: React.FC = () => {
  const { 
    sales, 
    deleteSale, 
    deleteAllSales,
    syncAllCatalogToDatabase,
    resetAllData,
    activeShift,
    shiftsHistory,
    salesReports,
    isSavingReport,
    lastReportSyncTime,
    saveSalesReportForDate,
    saveAllReportsToDatabase
  } = usePos();

  // Tab state
  const [activeTab, setActiveTab] = useState<'vendas' | 'caixa' | 'relatorios_banco'>('vendas');
  const [selectedReportForView, setSelectedReportForView] = useState<SalesReport | null>(null);

  // Filters state with Brazil/Brasília timezone precision
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('hoje');
  const [todayStr, setTodayStr] = useState<string>(() => getBrazilDateString());
  const [currentMonthStr, setCurrentMonthStr] = useState<string>(() => getBrazilMonthString());
  const [yesterdayStr, setYesterdayStr] = useState<string>(() => getBrazilYesterdayDateString());

  // Automatically update todayStr at 00:00:00 midnight without requiring page refresh
  useEffect(() => {
    const checkMidnight = () => {
      const liveToday = getBrazilDateString();
      if (liveToday !== todayStr) {
        setTodayStr(liveToday);
        setCurrentMonthStr(getBrazilMonthString());
        setYesterdayStr(getBrazilYesterdayDateString(liveToday));
      }
    };
    const interval = setInterval(checkMidnight, 5000);
    return () => clearInterval(interval);
  }, [todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Actions state
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [isDeletingSale, setIsDeletingSale] = useState<boolean>(false);

  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);

  const [isSyncingCatalog, setIsSyncingCatalog] = useState<boolean>(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Cash shift modal controls
  const [cashModalOpen, setCashModalOpen] = useState<boolean>(false);
  const [cashModalMode, setCashModalMode] = useState<CashModalMode>('open');
  const [shiftForReceipt, setShiftForReceipt] = useState<CashShift | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr?.text === text ? null : curr));
    }, 6000);
  };

  // Sync Catalog to Firestore handler
  const handleSyncCatalog = async () => {
    try {
      setIsSyncingCatalog(true);
      const res = await syncAllCatalogToDatabase();
      showToast(`Catálogo sincronizado com o banco de dados com sucesso! (${res.productsCount} produtos e ${res.stockCount} itens de estoque).`);
    } catch (err: any) {
      showToast('Erro ao sincronizar catálogo com o banco de dados.', 'error');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  // Gravar relatórios consolidados no banco de dados Firestore
  const handleSaveReportsToDatabase = async () => {
    try {
      const res = await saveAllReportsToDatabase();
      if (res.success) {
        showToast(`Relatórios de vendas gravados no banco Firestore com sucesso! (${res.count} relatórios diários/mensais sincronizados).`);
      } else {
        showToast('Não foi possível consolidar os relatórios no banco.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao gravar relatórios no banco de dados.', 'error');
    }
  };

  // Delete All Sales handler
  const handleConfirmDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      await deleteAllSales();
      setDeleteAllConfirmOpen(false);
      showToast('Todas as vendas de teste foram excluídas com sucesso do banco de dados e do dispositivo!');
    } catch (err: any) {
      showToast('Erro ao excluir as vendas.', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Delete Individual Sale handler
  const handleConfirmDeleteSale = async () => {
    if (!saleToDelete) return;
    const saleId = saleToDelete.id;
    try {
      setIsDeletingSale(true);
      const ok = deleteSale(saleId, restoreStockOnDelete);
      setSaleToDelete(null);
      if (ok) {
        showToast(`A venda ${saleId} foi cancelada e excluída permanentemente${restoreStockOnDelete ? ' (estoque restaurado)' : ''}!`);
      } else {
        showToast(`Não foi possível localizar a venda ${saleId}.`, 'error');
      }
    } catch (err: any) {
      showToast(`Erro ao excluir venda ${saleId}.`, 'error');
    } finally {
      setIsDeletingSale(false);
    }
  };

  // Reset Demo handler
  const handleConfirmResetDemo = () => {
    resetAllData();
    setResetConfirmOpen(false);
    showToast('Dados de demonstração restaurados com sucesso!');
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Filtered Sales logic with Brazil timezone
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const sDate = getBrazilDateString(s.timestamp);
      const sMonth = getBrazilMonthString(s.timestamp);

      // Period Filter
      if (periodFilter === 'hoje' && sDate !== todayStr) return false;
      if (periodFilter === 'ontem' && sDate !== yesterdayStr) return false;
      if (periodFilter === 'este_mes' && sMonth !== currentMonthStr) return false;
      if (periodFilter === 'dia_especifico' && sDate !== selectedDate) return false;
      if (periodFilter === 'mes_especifico' && sMonth !== selectedMonth) return false;

      // Payment Filter
      if (paymentFilter !== 'todos' && s.paymentMethod !== paymentFilter) return false;

      // Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesId = (s.id || '').toLowerCase().includes(term);
        const matchesCustomer = s.customerName ? s.customerName.toLowerCase().includes(term) : false;
        const matchesMethod = (s.paymentMethod || '').toLowerCase().includes(term);
        const matchesItem = Array.isArray(s.items) && s.items.some(
          (i) =>
            (i?.productName || '').toLowerCase().includes(term) ||
            (Array.isArray(i?.selectedFlavors) && i.selectedFlavors.some((f) => (f || '').toLowerCase().includes(term)))
        );
        if (!matchesId && !matchesCustomer && !matchesMethod && !matchesItem) return false;
      }

      return true;
    });
  }, [sales, periodFilter, selectedDate, selectedMonth, paymentFilter, searchTerm, todayStr, currentMonthStr, yesterdayStr]);

  // Financial Metrics of filtered sales
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.total, 0);
  }, [filteredSales]);

  const totalSalesCount = filteredSales.length;

  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      return acc + sale.items.reduce((iSum, item) => iSum + item.quantity, 0);
    }, 0);
  }, [filteredSales]);

  // Payment Breakdown for filtered sales
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {
      dinheiro: { total: 0, count: 0 },
      pix: { total: 0, count: 0 },
      cartao_debito: { total: 0, count: 0 },
      cartao_credito: { total: 0, count: 0 }
    };

    filteredSales.forEach((s) => {
      if (map[s.paymentMethod]) {
        map[s.paymentMethod].total += s.total;
        map[s.paymentMethod].count += 1;
      }
    });

    return map;
  }, [filteredSales]);

  // Top Flavors Ranking for filtered sales
  const topFlavors = useMemo(() => {
    const flavorCounts: Record<string, number> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        item.selectedFlavors.forEach((flavor) => {
          flavorCounts[flavor] = (flavorCounts[flavor] || 0) + item.quantity;
        });
      });
    });

    return Object.entries(flavorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredSales]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'dinheiro':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            <Banknote className="w-3 h-3 text-emerald-600" /> Dinheiro
          </span>
        );
      case 'pix':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-semibold border border-teal-200">
            <QrCode className="w-3 h-3 text-teal-600" /> Pix
          </span>
        );
      case 'cartao_debito':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-semibold border border-sky-200">
            <CreditCard className="w-3 h-3 text-sky-600" /> Débito
          </span>
        );
      case 'cartao_credito':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-semibold border border-indigo-200">
            <CreditCard className="w-3 h-3 text-indigo-600" /> Crédito
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'hoje': return `Hoje (${todayStr.split('-').reverse().join('/')})`;
      case 'ontem': return 'Ontem';
      case 'este_mes': return `Este Mês (${currentMonthStr.split('-').reverse().join('/')})`;
      case 'dia_especifico': return `Dia: ${selectedDate.split('-').reverse().join('/')}`;
      case 'mes_especifico': return `Mês: ${selectedMonth.split('-').reverse().join('/')}`;
      case 'todos': return 'Todas as Vendas Registradas';
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-5 overflow-y-auto pb-24 sm:pb-6">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div 
          className={`px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 border ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : feedbackMsg.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {feedbackMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Quicksand',sans-serif] flex items-center gap-2">
            <span>Relatórios & Gestão Financeira</span>
            {activeShift ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Caixa Aberto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold">
                <Lock className="w-3 h-3" />
                Caixa Fechado
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Filtro por dia/mês, fechamento de caixa, conferência de gaveta e histórico completo
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gravar Relatórios no Banco Agora */}
          <button
            type="button"
            id="btn-save-reports-db"
            onClick={handleSaveReportsToDatabase}
            disabled={isSavingReport}
            title="Consolidar e gravar relatórios de vendas no banco Firestore agora"
            className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSavingReport ? 'Gravando no Banco...' : 'Gravar Relatórios no Banco'}</span>
          </button>

          {/* Sincronizar catálogo no database */}
          <button
            type="button"
            id="btn-sync-catalog-db"
            onClick={handleSyncCatalog}
            disabled={isSyncingCatalog}
            title="Salvar todos os produtos e estoque cadastrados no banco Firestore"
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-rose-500" />
            <span>{isSyncingCatalog ? 'Gravando Catálogo...' : 'Gravar Catálogo no Banco'}</span>
          </button>

          {/* Excluir vendas de teste */}
          {sales.length > 0 && (
            <button
              type="button"
              id="btn-open-delete-all-sales"
              onClick={() => setDeleteAllConfirmOpen(true)}
              title="Excluir todas as vendas de teste do sistema"
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Excluir Vendas</span>
            </button>
          )}

          {/* Imprimir Relatório */}
          <button
            type="button"
            id="btn-print-report"
            onClick={handlePrintReport}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Imprimir</span>
          </button>

          {/* Reset Demo */}
          <button
            type="button"
            id="reset-demo-btn"
            onClick={() => setResetConfirmOpen(true)}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Geral</span>
          </button>
        </div>
      </div>

      {/* Banner de Gravação Automática no Banco de Dados (Firestore) */}
      <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-emerald-950">
                Gravação Automática de Relatórios no Banco Ativada
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Firestore Sincronizado
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-850 mt-0.5 leading-relaxed">
              Os relatórios de vendas são consolidados e gravados automaticamente na coleção <span className="font-mono font-bold bg-emerald-100/90 text-emerald-900 px-1 py-0.2 rounded text-[10px]">sales_reports</span> a cada venda ou fechamento, respeitando o fuso de Brasília (UTC-3).
              {lastReportSyncTime && (
                <span className="ml-1 text-emerald-900 font-semibold block sm:inline">
                  • Última sincronização com o banco: {formatBrazilDateTime(lastReportSyncTime)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            id="btn-view-database-reports"
            onClick={() => setActiveTab('relatorios_banco')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ver Relatórios Gravados ({salesReports.length})</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto">
        <button
          type="button"
          id="tab-vendas-btn"
          onClick={() => setActiveTab('vendas')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'vendas'
              ? 'border-rose-500 text-rose-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Vendas & Faturamento ({sales.length})</span>
        </button>

        <button
          type="button"
          id="tab-caixa-btn"
          onClick={() => setActiveTab('caixa')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'caixa'
              ? 'border-rose-500 text-rose-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Abertura & Fechamento de Caixa</span>
          {activeShift && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>

        <button
          type="button"
          id="tab-relatorios-banco-btn"
          onClick={() => setActiveTab('relatorios_banco')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'relatorios_banco'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Relatórios no Banco ({salesReports.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VENDAS & FATURAMENTO COM FILTROS DE DIA / MÊS                      */}
      {/* ========================================================================= */}
      {activeTab === 'vendas' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Period & Payment Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Período:
                </span>
                {[
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'ontem', label: 'Ontem' },
                  { id: 'este_mes', label: 'Este Mês' },
                  { id: 'dia_especifico', label: 'Dia Específico' },
                  { id: 'mes_especifico', label: 'Mês Específico' },
                  { id: 'todos', label: 'Todas' },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      periodFilter === p.id
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Date/Month Pickers */}
              {periodFilter === 'dia_especifico' && (
                <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                  <Calendar className="w-4 h-4 text-stone-500" />
                  <label htmlFor="filter-specific-date" className="text-xs text-stone-600 font-medium">
                    Selecione o Dia:
                  </label>
                  <input
                    id="filter-specific-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-semibold text-stone-800 bg-white px-2 py-1 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              )}

              {periodFilter === 'mes_especifico' && (
                <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                  <Calendar className="w-4 h-4 text-stone-500" />
                  <label htmlFor="filter-specific-month" className="text-xs text-stone-600 font-medium">
                    Selecione o Mês:
                  </label>
                  <input
                    id="filter-specific-month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-semibold text-stone-800 bg-white px-2 py-1 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              )}
            </div>

            {/* Secondary Row: Payment Method Filter + Search Bar */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs font-bold text-stone-500 mr-1">Pagamento:</span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'pix', label: 'Pix' },
                  { id: 'cartao_debito', label: 'Débito' },
                  { id: 'cartao_credito', label: 'Crédito' },
                ].map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPaymentFilter(m.id as PaymentFilter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      paymentFilter === m.id
                        ? 'bg-stone-800 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar venda, cliente, sabor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 text-stone-800"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Selected Period Badge Indicator */}
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span className="font-semibold text-stone-700">
              Visualizando: <span className="text-rose-600 font-bold">{getPeriodLabel()}</span>
            </span>
            <span>
              {filteredSales.length} de {sales.length} venda(s) encontrada(s)
            </span>
          </div>

          {/* Financial Stat Cards (Filtered) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Faturamento */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-100/40 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center gap-2 text-rose-500 mb-1.5">
                <DollarSign className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Faturamento
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                R$ {totalRevenue.toFixed(2).replace('.', ',')}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                No período selecionado
              </span>
            </div>

            {/* Vendas Concluídas */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/40 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center gap-2 text-amber-500 mb-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Vendas Concluídas
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                {totalSalesCount}
              </div>
              <span className="text-[10px] text-stone-400 mt-1 inline-block">
                Transações filtradas
              </span>
            </div>

            {/* Ticket Médio */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/40 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center gap-2 text-teal-600 mb-1.5">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Ticket Médio
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                R$ {averageTicket.toFixed(2).replace('.', ',')}
              </div>
              <span className="text-[10px] text-stone-400 mt-1 inline-block">
                Média por compra
              </span>
            </div>

            {/* Total Itens */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-100/40 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex items-center gap-2 text-indigo-500 mb-1.5">
                <CreditCard className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Itens Vendidos
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                {totalItemsSold}
              </div>
              <span className="text-[10px] text-stone-400 mt-1 inline-block">
                Sorvetes, picolés e bebidas
              </span>
            </div>
          </div>

          {/* Payment Breakdown & Top Flavors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Formas de Pagamento no Período */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-rose-500" />
                <span>Formas de Pagamento no Período</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Dinheiro */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5" /> Dinheiro
                    </span>
                    <span className="text-[11px] text-emerald-600 font-normal">
                      {paymentBreakdown.dinheiro.count} vendas
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-950 font-mono">
                    R$ {paymentBreakdown.dinheiro.total.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                {/* Pix */}
                <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" /> Pix
                    </span>
                    <span className="text-[11px] text-teal-600 font-normal">
                      {paymentBreakdown.pix.count} vendas
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-teal-950 font-mono">
                    R$ {paymentBreakdown.pix.total.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                {/* Cartão Débito */}
                <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100">
                  <div className="flex items-center justify-between text-xs text-sky-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Cartão Débito
                    </span>
                    <span className="text-[11px] text-sky-600 font-normal">
                      {paymentBreakdown.cartao_debito.count} vendas
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-sky-950 font-mono">
                    R$ {paymentBreakdown.cartao_debito.total.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                {/* Cartão Crédito */}
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <div className="flex items-center justify-between text-xs text-indigo-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Cartão Crédito
                    </span>
                    <span className="text-[11px] text-indigo-600 font-normal">
                      {paymentBreakdown.cartao_credito.count} vendas
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-indigo-950 font-mono">
                    R$ {paymentBreakdown.cartao_credito.total.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            </div>

            {/* Sabores Mais Vendidos no Período */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Sabores Mais Vendidos no Período</span>
              </h3>

              {topFlavors.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Nenhum sabor registrado para o período filtrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {topFlavors.map((item, idx) => {
                    const maxCount = topFlavors[0]?.count || 1;
                    const percentage = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {item.name}
                          </span>
                          <span className="font-bold text-stone-800 font-mono">
                            {item.count} un.
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sales History Table */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-800">
                  Histórico de Vendas ({filteredSales.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Vendas do período com opção de visualização de cupom e cancelamento/exclusão
                </p>
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-semibold text-stone-600">Nenhuma venda encontrada</p>
                <p className="text-xs text-stone-400">
                  Tente alterar os filtros de data, método de pagamento ou o termo de busca.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">ID Venda</th>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Itens & Sabores</th>
                      <th className="py-3 px-4">Pagamento</th>
                      <th className="py-3 px-4 text-right">Valor Total</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-stone-800">
                          {sale.id}
                        </td>
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {formatBrazilDateTime(sale.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {sale.customerName || 'Consumidor Final'}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="space-y-0.5">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="text-[11px] truncate">
                                <span className="font-semibold text-stone-800">{it.quantity}x</span>{' '}
                                <span>{it.productName}</span>
                                {it.selectedFlavors.length > 0 && (
                                  <span className="text-stone-400 ml-1">
                                    ({it.selectedFlavors.join(', ')})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getMethodBadge(sale.paymentMethod)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 whitespace-nowrap text-sm">
                          R$ {sale.total.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ver Cupom */}
                            <button
                              type="button"
                              onClick={() => setSelectedSaleForView(sale)}
                              title="Visualizar cupom"
                              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Excluir Venda */}
                            <button
                              type="button"
                              onClick={() => setSaleToDelete(sale)}
                              title="Excluir / Cancelar venda permanentemente"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ABERTURA & FECHAMENTO DE CAIXA                                     */}
      {/* ========================================================================= */}
      {activeTab === 'caixa' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Active Shift Card or Open Caixa Prompt */}
          {activeShift ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Unlock className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-stone-800">
                        Turno de Caixa em Aberto
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                        {activeShift.id}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-400" /> {activeShift.operatorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" /> Aberto às{' '}
                        {formatBrazilTime(activeShift.openedAt, false)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Shift Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCashModalMode('suprimento'); setCashModalOpen(true); }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    + Suprimento (Troco)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCashModalMode('sangria'); setCashModalOpen(true); }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    - Sangria (Retirada)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCashModalMode('close'); setCashModalOpen(true); }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    🔒 Fechar Caixa
                  </button>
                </div>
              </div>

              {/* Real-time Shift Cash Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Saldo Esperado em Gaveta (Dinheiro) */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                    Saldo Esperado em Gaveta
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
                    R$ {activeShift.expectedCash.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    Fundo inicial + vendas dinheiro ± mov.
                  </span>
                </div>

                {/* Vendas em Dinheiro */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Vendas em Dinheiro
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                    R$ {activeShift.totalCashSales.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Entradas em espécie no turno
                  </span>
                </div>

                {/* Vendas em Cartões & Pix */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Vendas Pix & Cartões
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
                    R$ {(activeShift.totalPixSales + activeShift.totalDebitSales + activeShift.totalCreditSales).toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Pix: R$ {activeShift.totalPixSales.toFixed(2).replace('.', ',')} | Cartões: R$ {(activeShift.totalDebitSales + activeShift.totalCreditSales).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Faturamento Total do Turno */}
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                    Faturamento do Turno
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-950 font-mono">
                    R$ {activeShift.totalSalesAmount.toFixed(2).replace('.', ',')}
                  </div>
                  <span className="text-[10px] text-rose-600 mt-1 block">
                    {activeShift.totalSalesCount} vendas concluídas
                  </span>
                </div>
              </div>

              {/* Movements list of active shift */}
              {activeShift.movements.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-700 mb-2">
                    Movimentações Manuais do Turno (Suprimentos / Sangrias)
                  </h4>
                  <div className="space-y-1.5">
                    {activeShift.movements.map((mov) => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {mov.type === 'suprimento' ? (
                            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-amber-100 text-amber-800 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="font-semibold text-stone-800">
                            {mov.type === 'suprimento' ? 'Suprimento de Troco' : 'Sangria de Caixa'}
                          </span>
                          <span className="text-stone-400 text-[11px]">({mov.reason})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-stone-400 text-[10px]">
                            {formatBrazilTime(mov.timestamp, true)}
                          </span>
                          <span className={`font-mono font-bold ${
                            mov.type === 'suprimento' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {mov.type === 'suprimento' ? '+' : '-'}R$ {mov.amount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-800">
                  O caixa está fechado no momento
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                  Inicie um novo turno para registrar o fundo de troco inicial, controlar entradas em dinheiro e acompanhar o saldo de gaveta em tempo real.
                </p>
              </div>
              <button
                type="button"
                id="btn-open-shift-start"
                onClick={() => { setCashModalMode('open'); setCashModalOpen(true); }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                Abrir Caixa Agora
              </button>
            </div>
          )}

          {/* Previous Closed Shifts History */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-800">
                  Histórico de Fechamentos de Caixa ({shiftsHistory.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Turnos encerrados com conferência de gaveta e comprovante de fechamento
                </p>
              </div>
            </div>

            {shiftsHistory.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Coins className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-semibold text-stone-600">Nenhum fechamento registrado ainda</p>
                <p className="text-xs text-stone-400">
                  Após encerrar um turno de caixa, o comprovante e os dados de conferência ficarão arquivados aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-100">
                    <tr>
                      <th className="py-3 px-4">Turno ID</th>
                      <th className="py-3 px-4">Abertura</th>
                      <th className="py-3 px-4">Fechamento</th>
                      <th className="py-3 px-4">Operador</th>
                      <th className="py-3 px-4 text-right">Fundo Inicial</th>
                      <th className="py-3 px-4 text-right">Vendas Dinheiro</th>
                      <th className="py-3 px-4 text-right">Faturamento Total</th>
                      <th className="py-3 px-4 text-right">Saldo Esperado</th>
                      <th className="py-3 px-4 text-right">Dinheiro Contado</th>
                      <th className="py-3 px-4 text-center">Diferença</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {shiftsHistory.map((shift) => (
                      <tr key={shift.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-stone-800">
                          {shift.id}
                        </td>
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {formatBrazilDateTime(shift.openedAt)}
                        </td>
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                          {shift.closedAt ? formatBrazilDateTime(shift.closedAt) : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {shift.operatorName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          R$ {shift.initialCash.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                          R$ {shift.totalCashSales.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                          R$ {shift.totalSalesAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-800">
                          R$ {shift.expectedCash.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-800">
                          {shift.countedCash !== undefined ? (
                            `R$ ${shift.countedCash.toFixed(2).replace('.', ',')}`
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-semibold">
                          {shift.difference !== undefined ? (
                            <span className={
                              shift.difference === 0 
                                ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md' 
                                : shift.difference > 0 
                                ? 'text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md' 
                                : 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md'
                            }>
                              {shift.difference > 0 && '+'}
                              R$ {shift.difference.toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setShiftForReceipt(shift);
                              setCashModalMode('receipt');
                              setCashModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Comprovante
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RELATÓRIOS GRAVADOS AUTOMATICAMENTE NO BANCO DE DADOS (FIRESTORE)  */}
      {/* ========================================================================= */}
      {activeTab === 'relatorios_banco' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
                <span>Relatórios no Banco</span>
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-stone-800">
                {salesReports.length}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Coleção Firestore: <code className="font-mono">sales_reports</code>
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
                <span>Faturamento Consolidado</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-stone-800">
                R$ {salesReports
                  .filter((r) => r.type === 'diario' || (r as any).periodType === 'diario')
                  .reduce((sum, r) => sum + (Number(r?.totalRevenue) || 0), 0)
                  .toFixed(2)
                  .replace('.', ',')}
              </p>
              <p className="text-[11px] text-stone-400">
                Soma dos relatórios diários
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
                <span>Vendas Registradas</span>
                <ShoppingBag className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-stone-800">
                {salesReports
                  .filter((r) => r.type === 'diario' || (r as any).periodType === 'diario')
                  .reduce((sum, r) => sum + (Number(r?.totalSalesCount) || 0), 0)}
              </p>
              <p className="text-[11px] text-stone-400">
                Transações consolidadas
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
                <span>Itens Comercializados</span>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-2xl font-bold text-stone-800">
                {salesReports
                  .filter((r) => r.type === 'diario' || (r as any).periodType === 'diario')
                  .reduce((sum, r) => sum + (Number(r?.totalItemsSold) || 0), 0)}
              </p>
              <p className="text-[11px] text-stone-400">
                Unidades vendidas gravadas
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Histórico de Relatórios Gravados no Banco Firestore
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Os dados são atualizados automaticamente a cada venda em tempo real e mantidos permanentemente na nuvem.
              </p>
            </div>
            <button
              type="button"
              id="btn-force-sync-all-reports"
              onClick={handleSaveReportsToDatabase}
              disabled={isSavingReport}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{isSavingReport ? 'Gravando no Banco...' : 'Gravar / Recalcular Todos no Banco'}</span>
            </button>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {salesReports.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-800">
                    Nenhum relatório gravado no banco ainda
                  </h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Ao registrar qualquer venda, o relatório é gerado e salvo automaticamente no Firestore. Você também pode consolidar agora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveReportsToDatabase}
                  disabled={isSavingReport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  Gravar Relatórios das Vendas Atuais
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Período / ID</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Vendas</th>
                      <th className="py-3 px-4">Itens</th>
                      <th className="py-3 px-4">Ticket Médio</th>
                      <th className="py-3 px-4">Faturamento</th>
                      <th className="py-3 px-4">Formas de Pagamento</th>
                      <th className="py-3 px-4">Sincronizado em</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {salesReports.map((report) => {
                      const isDaily = report.type === 'diario' || (report as any).periodType === 'diario';
                      const pay = getSafeReportPayments(report);
                      return (
                        <tr key={report.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-800">
                              {isDaily
                                ? (report.periodDate.includes('-') ? report.periodDate.split('-').reverse().join('/') : report.periodDate)
                                : (report.periodDate.includes('-') ? `${report.periodDate.split('-')[1]}/${report.periodDate.split('-')[0]}` : report.periodDate)}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono">
                              {report.id}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isDaily ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                                Diário
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                Mensal
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-700">
                            {report.totalSalesCount}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            {report.totalItemsSold}
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            R$ {(Number(report.averageTicket) || 0).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                            R$ {(Number(report.totalRevenue) || 0).toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {pay.dinheiro.total > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                  Din: R$ {pay.dinheiro.total.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              {pay.pix.total > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                                  Pix: R$ {pay.pix.total.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              {pay.cartao_debito.total > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                                  Déb: R$ {pay.cartao_debito.total.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              {pay.cartao_credito.total > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                                  Créd: R$ {pay.cartao_credito.total.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                            {formatBrazilDateTime(report.updatedAt)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedReportForView(report)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone-600" />
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 0: DETALHES DO RELATÓRIO CONSOLIDADO DO BANCO (SALES REPORT)       */}
      {/* ========================================================================= */}
      {selectedReportForView && (() => {
        const isModalDaily = selectedReportForView.type === 'diario' || (selectedReportForView as any).periodType === 'diario';
        const modalPay = getSafeReportPayments(selectedReportForView);
        const topFlavors = Array.isArray(selectedReportForView.topFlavors) ? selectedReportForView.topFlavors : [];
        const topProducts = Array.isArray(selectedReportForView.topProducts) ? selectedReportForView.topProducts : [];

        return (
          <div 
            id="report-detail-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
          >
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-800">
                      Relatório {isModalDaily ? 'Diário' : 'Mensal'} - {isModalDaily ? (selectedReportForView.periodDate.includes('-') ? selectedReportForView.periodDate.split('-').reverse().join('/') : selectedReportForView.periodDate) : selectedReportForView.periodDate}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">
                      ID: {selectedReportForView.id} • Coleção Firestore: sales_reports
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReportForView(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Faturamento</span>
                  <p className="text-lg font-bold text-emerald-700">
                    R$ {(Number(selectedReportForView.totalRevenue) || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Total Vendas</span>
                  <p className="text-lg font-bold text-stone-800">
                    {selectedReportForView.totalSalesCount}
                  </p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Itens Vendidos</span>
                  <p className="text-lg font-bold text-stone-800">
                    {selectedReportForView.totalItemsSold}
                  </p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Ticket Médio</span>
                  <p className="text-lg font-bold text-stone-800">
                    R$ {(Number(selectedReportForView.averageTicket) || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              {/* Payments breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Distribuição por Meio de Pagamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-900">Dinheiro</span>
                      <p className="text-[11px] text-emerald-700">
                        {modalPay.dinheiro.count} vendas ({modalPay.dinheiro.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-800">
                      R$ {modalPay.dinheiro.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-teal-900">Pix</span>
                      <p className="text-[11px] text-teal-700">
                        {modalPay.pix.count} vendas ({modalPay.pix.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="text-sm font-bold text-teal-800">
                      R$ {modalPay.pix.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-900">Cartão de Débito</span>
                      <p className="text-[11px] text-sky-700">
                        {modalPay.cartao_debito.count} vendas ({modalPay.cartao_debito.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="text-sm font-bold text-sky-800">
                      R$ {modalPay.cartao_debito.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-900">Cartão de Crédito</span>
                      <p className="text-[11px] text-indigo-700">
                        {modalPay.cartao_credito.count} vendas ({modalPay.cartao_credito.percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <span className="text-sm font-bold text-indigo-800">
                      R$ {modalPay.cartao_credito.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Flavors and Products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Sabores Mais Vendidos
                  </h4>
                  {topFlavors.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">Nenhum sabor registrado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topFlavors.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded-lg border border-stone-200">
                          <span className="font-semibold text-stone-700">{i + 1}. {(f as any).flavorName || f.name}</span>
                          <span className="text-stone-500 font-bold">{(f as any).quantity ?? f.count} un.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Produtos Mais Vendidos
                  </h4>
                  {topProducts.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">Nenhum produto registrado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topProducts.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-stone-50 rounded-lg border border-stone-200">
                          <span className="font-semibold text-stone-700">{i + 1}. {(p as any).productName || p.name}</span>
                          <span className="text-emerald-700 font-bold">R$ {(Number(p.revenue) || 0).toFixed(2).replace('.', ',')} ({(p as any).quantity || 0} un)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                <span>Atualizado em: {formatBrazilDateTime(selectedReportForView.updatedAt)}</span>
                <button
                  type="button"
                  onClick={() => setSelectedReportForView(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW RECEIPT MODAL                                               */}
      {/* ========================================================================= */}
      {selectedSaleForView && (
        <ReceiptModal
          sale={selectedSaleForView}
          onClose={() => setSelectedSaleForView(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CASH SHIFT MODAL (OPEN / CLOSE / MOVEMENTS / RECEIPT)             */}
      {/* ========================================================================= */}
      <CashShiftModal
        isOpen={cashModalOpen}
        onClose={() => {
          setCashModalOpen(false);
          setShiftForReceipt(null);
        }}
        initialMode={cashModalMode}
        shiftForReceipt={shiftForReceipt}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM DELETE SINGLE SALE                                       */}
      {/* ========================================================================= */}
      {saleToDelete && (
        <div 
          id="confirm-delete-sale-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                Confirmar Exclusão da Venda
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Tem certeza que deseja cancelar e excluir a venda{' '}
                <span className="font-mono font-bold text-stone-800">{saleToDelete.id}</span> (R${' '}
                {saleToDelete.total.toFixed(2).replace('.', ',')})? Ela será removida permanentemente do banco de dados.
              </p>
            </div>

            {/* Restore Stock Checkbox */}
            <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="rounded-sm text-rose-600 focus:ring-rose-400"
              />
              <span>Devolver itens vendidos de volta ao estoque da sorveteria</span>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-sale-action"
                disabled={isDeletingSale}
                onClick={handleConfirmDeleteSale}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingSale ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM DELETE ALL TEST SALES                                    */}
      {/* ========================================================================= */}
      {deleteAllConfirmOpen && (
        <div 
          id="confirm-delete-all-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                Excluir Todas as Vendas de Teste?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Esta ação apagará <strong>todas as {sales.length} vendas</strong> atualmente salvas no banco de dados Firestore e na memória local do aplicativo.
              </p>
              <p className="text-xs text-rose-600 font-semibold mt-2">
                O cardápio de produtos e o estoque permanecerão intactos!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAllConfirmOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-action"
                disabled={isDeletingAll}
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {isDeletingAll ? 'Excluindo Todas...' : 'Sim, Excluir Todas as Vendas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESET DEMO CONFIRMATION                                          */}
      {/* ========================================================================= */}
      {resetConfirmOpen && (
        <div 
          id="confirm-reset-demo-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-stone-800">
                Restaurar Dados Demo
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Deseja redefinir todo o banco de dados e produtos para a versão padrão de demonstração da Eliza Sorvetes?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-reset-action"
                onClick={handleConfirmResetDemo}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
