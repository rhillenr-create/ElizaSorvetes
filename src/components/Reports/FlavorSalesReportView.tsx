import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePos } from '../../context/PosContext';
import { Sale } from '../../types';
import { 
  generateFlavorSalesReport, 
  exportFlavorReportToCsv, 
  exportFlavorReportToExcel,
  exportFlavorReportToPdf,
  FlavorSaleReportItem, 
  FlavorReportSummary 
} from '../../utils/flavorReportHelper';
import { 
  getBrazilDateString, 
  getBrazilMonthString, 
  getBrazilYesterdayDateString, 
  formatBrazilDateDisplay 
} from '../../utils/dateUtils';
import { 
  Search, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Sparkles, 
  ArrowUpDown, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  X, 
  Flame, 
  Layers,
  ChevronDown,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export type FlavorPeriodFilter = 
  | 'hoje' 
  | 'ontem' 
  | 'ultimos_7_dias' 
  | 'este_mes' 
  | 'mes_anterior' 
  | 'dia_especifico' 
  | 'mes_especifico' 
  | 'todos';

export type FlavorCategoryFilter = 'todos' | 'sorvete' | 'picole';

export type FlavorSortOption = 'qtd_desc' | 'fat_desc' | 'qtd_asc' | 'nome_asc';

export const FlavorSalesReportView: React.FC = () => {
  const { sales, products, stock } = usePos();

  const [todayStr, setTodayStr] = useState<string>(() => getBrazilDateString());
  const [currentMonthStr, setCurrentMonthStr] = useState<string>(() => getBrazilMonthString());
  const [yesterdayStr, setYesterdayStr] = useState<string>(() => getBrazilYesterdayDateString());

  // Contagens rápidas por período para transparência total
  const countHoje = useMemo(() => sales.filter((s) => getBrazilDateString(s.timestamp) === todayStr).length, [sales, todayStr]);
  const countOntem = useMemo(() => sales.filter((s) => getBrazilDateString(s.timestamp) === yesterdayStr).length, [sales, yesterdayStr]);
  const revenueOntem = useMemo(() => sales.filter((s) => getBrazilDateString(s.timestamp) === yesterdayStr).reduce((sum, s) => sum + s.total, 0), [sales, yesterdayStr]);

  const count7Dias = useMemo(() => {
    const nowTs = Date.now();
    return sales.filter((s) => {
      const saleTs = new Date(s.timestamp).getTime();
      const diff = (nowTs - saleTs) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
  }, [sales]);

  const countEsteMes = useMemo(() => sales.filter((s) => getBrazilMonthString(s.timestamp) === currentMonthStr).length, [sales, currentMonthStr]);

  // Se o dia de hoje ainda não tiver vendas registradas mas ontem tiver, inicializa com 'ontem'
  const userSelectedPeriodRef = useRef<boolean>(false);
  const [periodFilter, setPeriodFilter] = useState<FlavorPeriodFilter>(() => {
    const todaySalesExist = sales.some((s) => getBrazilDateString(s.timestamp) === getBrazilDateString());
    if (!todaySalesExist && sales.some((s) => getBrazilDateString(s.timestamp) === getBrazilYesterdayDateString())) {
      return 'ontem';
    }
    return 'hoje';
  });

  // Atualização automática para 'ontem' quando as vendas chegam do Firestore caso hoje esteja sem vendas
  useEffect(() => {
    if (userSelectedPeriodRef.current) return;
    if (sales.length === 0) return;

    const countHoje = sales.filter((s) => getBrazilDateString(s.timestamp) === todayStr).length;
    const countOntem = sales.filter((s) => getBrazilDateString(s.timestamp) === yesterdayStr).length;

    if (countHoje === 0 && countOntem > 0 && periodFilter === 'hoje') {
      setPeriodFilter('ontem');
    }
  }, [sales, todayStr, yesterdayStr, periodFilter]);

  // Dynamic date pickers
  const [selectedDate, setSelectedDate] = useState<string>(() => countHoje > 0 ? todayStr : yesterdayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // View & Category filters
  const [categoryFilter, setCategoryFilter] = useState<FlavorCategoryFilter>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<FlavorSortOption>('qtd_desc');
  const [includeZeroSales, setIncludeZeroSales] = useState<boolean>(true);

  // Toast feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto update today string at midnight
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

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr?.text === text ? null : curr));
    }, 5000);
  };

  // Human readable label for the active period
  const periodLabel = useMemo(() => {
    switch (periodFilter) {
      case 'hoje':
        return `Hoje (${formatBrazilDateDisplay(todayStr)})`;
      case 'ontem':
        return `Ontem (${formatBrazilDateDisplay(yesterdayStr)})`;
      case 'ultimos_7_dias':
        return 'Últimos 7 Dias';
      case 'este_mes': {
        const [y, m] = currentMonthStr.split('-');
        return `Este Mês (${m}/${y})`;
      }
      case 'mes_anterior': {
        const [y, m] = currentMonthStr.split('-');
        let prevM = parseInt(m, 10) - 1;
        let prevY = parseInt(y, 10);
        if (prevM === 0) {
          prevM = 12;
          prevY -= 1;
        }
        return `Mês Anterior (${String(prevM).padStart(2, '0')}/${prevY})`;
      }
      case 'dia_especifico':
        return `Dia: ${formatBrazilDateDisplay(selectedDate)}`;
      case 'mes_especifico': {
        const [y, m] = selectedMonth.split('-');
        return `Mês: ${m}/${y}`;
      }
      case 'todos':
        return 'Todo o Histórico de Vendas';
    }
  }, [periodFilter, todayStr, yesterdayStr, currentMonthStr, selectedDate, selectedMonth]);

  // Filter sales array according to selected period
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const sDate = getBrazilDateString(s.timestamp);
      const sMonth = getBrazilMonthString(s.timestamp);

      if (periodFilter === 'hoje') return sDate === todayStr;
      if (periodFilter === 'ontem') return sDate === yesterdayStr;
      if (periodFilter === 'este_mes') return sMonth === currentMonthStr;
      if (periodFilter === 'dia_especifico') return sDate === selectedDate;
      if (periodFilter === 'mes_especifico') return sMonth === selectedMonth;

      if (periodFilter === 'ultimos_7_dias') {
        const saleTs = new Date(s.timestamp).getTime();
        const nowTs = Date.now();
        const diffDays = (nowTs - saleTs) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }

      if (periodFilter === 'mes_anterior') {
        const [y, m] = currentMonthStr.split('-');
        let prevM = parseInt(m, 10) - 1;
        let prevY = parseInt(y, 10);
        if (prevM === 0) {
          prevM = 12;
          prevY -= 1;
        }
        const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
        return sMonth === prevMonthStr;
      }

      return true; // 'todos'
    });
  }, [sales, periodFilter, todayStr, yesterdayStr, currentMonthStr, selectedDate, selectedMonth]);

  // Generate complete flavor report data
  const reportSummary: FlavorReportSummary = useMemo(() => {
    return generateFlavorSalesReport(filteredSales, products, stock, {
      periodLabel,
      includeZeroSales
    });
  }, [filteredSales, products, stock, periodLabel, includeZeroSales]);

  // Apply search and sorting
  const processList = (items: FlavorSaleReportItem[]): FlavorSaleReportItem[] => {
    let result = [...items];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          i.categoryLabel.toLowerCase().includes(term) ||
          (i.isRegional && 'regional paraense pará'.includes(term)) ||
          (i.isNutella && 'nutella'.includes(term))
      );
    }

    // Sort options
    result.sort((a, b) => {
      switch (sortOption) {
        case 'qtd_desc':
          if (b.quantitySold !== a.quantitySold) return b.quantitySold - a.quantitySold;
          return b.totalRevenue - a.totalRevenue;
        case 'fat_desc':
          if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
          return b.quantitySold - a.quantitySold;
        case 'qtd_asc':
          if (a.quantitySold !== b.quantitySold) return a.quantitySold - b.quantitySold;
          return a.totalRevenue - b.totalRevenue;
        case 'nome_asc':
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  };

  const displayedIceCream = useMemo(
    () => processList(reportSummary.iceCreamFlavors),
    [reportSummary.iceCreamFlavors, searchTerm, sortOption]
  );

  const displayedPopsicle = useMemo(
    () => processList(reportSummary.popsicleFlavors),
    [reportSummary.popsicleFlavors, searchTerm, sortOption]
  );

  const displayedAll = useMemo(
    () => processList(reportSummary.allFlavors),
    [reportSummary.allFlavors, searchTerm, sortOption]
  );

  // Excel Export handler (.xlsx)
  const handleExportExcel = async () => {
    let itemsToExport = reportSummary.allFlavors;
    if (categoryFilter === 'sorvete') itemsToExport = reportSummary.iceCreamFlavors;
    if (categoryFilter === 'picole') itemsToExport = reportSummary.popsicleFlavors;

    try {
      await exportFlavorReportToExcel(itemsToExport, periodLabel, reportSummary);
      showToast('Planilha Excel (.xlsx) de sabores gerada com sucesso!');
    } catch (e: any) {
      showToast(e.message || 'Erro ao exportar Excel', 'error');
    }
  };

  // PDF Export handler (.pdf)
  const handleExportPdf = async () => {
    let itemsToExport = reportSummary.allFlavors;
    if (categoryFilter === 'sorvete') itemsToExport = reportSummary.iceCreamFlavors;
    if (categoryFilter === 'picole') itemsToExport = reportSummary.popsicleFlavors;

    try {
      await exportFlavorReportToPdf(itemsToExport, periodLabel, reportSummary);
      showToast('Relatório em PDF de sabores baixado com sucesso!');
    } catch (e: any) {
      showToast(e.message || 'Erro ao exportar PDF', 'error');
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    let itemsToExport = reportSummary.allFlavors;
    if (categoryFilter === 'sorvete') itemsToExport = reportSummary.iceCreamFlavors;
    if (categoryFilter === 'picole') itemsToExport = reportSummary.popsicleFlavors;

    exportFlavorReportToCsv(itemsToExport, periodLabel, reportSummary);
    showToast('Planilha CSV gerada e baixada com sucesso!');
  };

  // Print Report handler
  const handlePrint = () => {
    window.print();
  };

  // Max quantities for progress bars
  const maxIceCreamSold = reportSummary.iceCreamFlavors[0]?.quantitySold || 1;
  const maxPopsicleSold = reportSummary.popsicleFlavors[0]?.quantitySold || 1;

  // Render individual flavor table
  const renderFlavorTable = (
    items: FlavorSaleReportItem[],
    category: 'sorvete' | 'picole',
    title: string,
    badgeColor: string,
    maxSold: number
  ) => {
    const isIceCream = category === 'sorvete';
    const totalSold = isIceCream ? reportSummary.totalIceCreamSold : reportSummary.totalPopsicleSold;
    const totalRev = isIceCream ? reportSummary.totalIceCreamRevenue : reportSummary.totalPopsicleRevenue;

    return (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Header / Subheader */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-white via-stone-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs ${badgeColor}`}>
              {isIceCream ? '🍨' : '🍡'}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-800 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold border border-stone-200">
                  {items.length} sabores
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Total acumulado no período: <strong className="text-stone-700">{totalSold} {isIceCream ? 'bolas' : 'unidades'}</strong> • Faturamento:{' '}
                <strong className="text-emerald-700 font-mono">R$ {totalRev.toFixed(2).replace('.', ',')}</strong>
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-2 self-start sm:self-center">
            <span className="text-[11px] text-stone-500 bg-stone-100 px-3 py-1 rounded-xl font-medium">
              Líder: <strong className="text-stone-800">{items[0]?.quantitySold > 0 ? items[0].name : 'Nenhum'}</strong> ({items[0]?.quantitySold || 0} un)
            </span>
          </div>
        </div>

        {/* Table Body */}
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            Nenhum sabor encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/90 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200 text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Sabor</th>
                  <th className="py-3 px-4 text-center">Qtd Vendida</th>
                  <th className="py-3 px-4">Desempenho Visual</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  <th className="py-3 px-4 text-right">Preço Médio</th>
                  <th className="py-3 px-4 text-center">% Categoria</th>
                  {isIceCream && <th className="py-3 px-4 text-center">Recipiente</th>}
                  <th className="py-3 px-4 text-center">Pedidos</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {items.map((item, idx) => {
                  const percentOfMax = maxSold > 0 ? Math.round((item.quantitySold / maxSold) * 100) : 0;
                  const isTop1 = item.rank === 1 && item.quantitySold > 0;
                  const isTop2 = item.rank === 2 && item.quantitySold > 0;
                  const isTop3 = item.rank === 3 && item.quantitySold > 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-stone-50/70 transition-colors ${
                        item.quantitySold === 0 ? 'opacity-60 bg-stone-50/30' : ''
                      }`}
                    >
                      {/* Ranking badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isTop1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs inline-flex items-center justify-center shadow-2xs">
                            🥇
                          </span>
                        ) : isTop2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs inline-flex items-center justify-center shadow-2xs">
                            🥈
                          </span>
                        ) : isTop3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-900 border border-amber-700/30 font-bold text-xs inline-flex items-center justify-center shadow-2xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono font-medium text-xs">
                            #{item.rank || idx + 1}
                          </span>
                        )}
                      </td>

                      {/* Flavor name & badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Color dot */}
                          <div 
                            className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-2xs"
                            style={{ backgroundColor: item.color || '#E5E7EB' }}
                          />
                          <div>
                            <div className="font-bold text-stone-800 text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{item.name}</span>
                              {item.isRegional && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                  Pará
                                </span>
                              )}
                              {item.isNutella && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-800/15 text-amber-950 border border-amber-800/30 text-[10px] font-bold">
                                  Nutella
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {item.categoryLabel}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity Sold */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono font-black text-sm ${
                          item.quantitySold > 0 ? 'text-stone-900' : 'text-stone-400'
                        }`}>
                          {item.quantitySold}
                        </span>
                        <span className="text-[10px] text-stone-400 ml-1">
                          {isIceCream ? 'bolas' : 'un'}
                        </span>
                      </td>

                      {/* Visual progress bar */}
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            <span>{percentOfMax}% do líder</span>
                            <span>{item.percentageOfCategory}% do total</span>
                          </div>
                          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isIceCream
                                  ? isTop1 ? 'bg-amber-500' : 'bg-rose-500'
                                  : isTop1 ? 'bg-emerald-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${percentOfMax}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold text-xs sm:text-sm ${
                          item.totalRevenue > 0 ? 'text-emerald-700' : 'text-stone-400'
                        }`}>
                          R$ {item.totalRevenue.toFixed(2).replace('.', ',')}
                        </span>
                      </td>

                      {/* Average Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-stone-600">
                        {item.quantitySold > 0 
                          ? `R$ ${item.averagePrice.toFixed(2).replace('.', ',')}` 
                          : '-'}
                      </td>

                      {/* Category % */}
                      <td className="py-3.5 px-4 text-center font-semibold text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                          item.percentageOfCategory >= 15
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : item.percentageOfCategory >= 5
                            ? 'bg-stone-100 text-stone-700'
                            : 'text-stone-400'
                        }`}>
                          {item.percentageOfCategory.toFixed(1).replace('.', ',')}%
                        </span>
                      </td>

                      {/* Container Breakdown (Ice cream only) */}
                      {isIceCream && (
                        <td className="py-3.5 px-4 text-center">
                          {item.quantitySold > 0 ? (
                            <div className="flex items-center justify-center gap-1 text-[10px]">
                              <span 
                                title="Casquinha"
                                className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium"
                              >
                                🍦 {item.casquinhaCount}
                              </span>
                              <span 
                                title="Copinho"
                                className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-900 border border-rose-200 font-medium"
                              >
                                🍨 {item.copinhoCount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      )}

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600 text-xs">
                        {item.salesCount > 0 ? `${item.salesCount} ped.` : '-'}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.currentStock !== undefined ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={`font-mono font-bold text-xs ${
                              item.stockStatus === 'zerado'
                                ? 'text-rose-600'
                                : item.stockStatus === 'baixo'
                                ? 'text-amber-600'
                                : 'text-stone-800'
                            }`}>
                              {item.currentStock} {item.stockUnit}
                            </span>
                            {item.stockStatus === 'zerado' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                                Esgotado
                              </span>
                            ) : item.stockStatus === 'baixo' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                                Estoque Baixo
                              </span>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-medium">
                                Regular
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300 text-[10px]">N/C</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div 
          className={`px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 border ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
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

      {/* Header & Main Actions */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍦</span>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Quicksand',sans-serif]">
                Relatório de Vendas por Sabor
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                Sorvetes & Picolés
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Desempenho detalhado de cada sabor: quantidade vendida, receita total gerada, participação no mix e estoque.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              id="btn-export-flavor-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Baixar planilha nativa do Excel (.xlsx) com abas de ranking e resumo executivo"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              id="btn-export-flavor-pdf"
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Baixar relatório oficial de vendas por sabor em arquivo PDF"
            >
              <FileText className="w-4 h-4" />
              <span>Baixar PDF</span>
            </button>

            <button
              type="button"
              id="btn-print-flavor-report"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Imprimir relatório completo de sabores ou salvar pelo navegador"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              id="btn-export-flavor-csv"
              onClick={handleExportCsv}
              className="px-2.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Baixar dados em formato CSV"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Bar: Period presets */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          {/* Informative banner when today has no sales yet */}
          {countHoje === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs">
                  O dia de hoje (<strong>{formatBrazilDateDisplay(todayStr)}</strong>) ainda não possui novas vendas registradas.
                  {countOntem > 0 && (
                    <span> Vendas do último turno concluído em <strong>{formatBrazilDateDisplay(yesterdayStr)}</strong>: <strong>{countOntem} vendas</strong> • <strong className="text-emerald-800">R$ {revenueOntem.toFixed(2).replace('.', ',')}</strong>.</span>
                  )}
                </span>
              </div>
              {periodFilter !== 'ontem' && countOntem > 0 && (
                <button
                  type="button"
                  onClick={() => setPeriodFilter('ontem')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer shrink-0 transition-colors shadow-2xs"
                >
                  Ver Vendas de Ontem ({formatBrazilDateDisplay(yesterdayStr)})
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Period Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: 'hoje', label: `Hoje (${formatBrazilDateDisplay(todayStr).slice(0, 5)})`, count: countHoje },
                { id: 'ontem', label: `Ontem (${formatBrazilDateDisplay(yesterdayStr).slice(0, 5)})`, count: countOntem },
                { id: 'ultimos_7_dias', label: 'Últimos 7 Dias', count: count7Dias },
                { id: 'este_mes', label: 'Este Mês', count: countEsteMes },
                { id: 'mes_anterior', label: 'Mês Anterior' },
                { id: 'dia_especifico', label: 'Dia Específico' },
                { id: 'mes_especifico', label: 'Mês Específico' },
                { id: 'todos', label: 'Todas as Vendas', count: sales.length },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    userSelectedPeriodRef.current = true;
                    setPeriodFilter(p.id as FlavorPeriodFilter);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    periodFilter === p.id
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <span>{p.label}</span>
                  {p.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      periodFilter === p.id ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {p.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Day / Month Pickers */}
            {periodFilter === 'dia_especifico' && (
              <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                <Calendar className="w-4 h-4 text-stone-500" />
                <label htmlFor="flavor-filter-date" className="text-xs text-stone-600 font-medium">
                  Selecione o Dia:
                </label>
                <input
                  id="flavor-filter-date"
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
                <label htmlFor="flavor-filter-month" className="text-xs text-stone-600 font-medium">
                  Selecione o Mês:
                </label>
                <input
                  id="flavor-filter-month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-semibold text-stone-800 bg-white px-2 py-1 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                />
              </div>
            )}
          </div>

          {/* Secondary Row: Category Selector, Search, Sort & Zero-sales Toggle */}
          <div className="pt-2 border-t border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Category Segment Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-stone-500 mr-1">Exibir:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'todos'
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                🍦 Todos os Sabores ({reportSummary.allFlavors.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('sorvete')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'sorvete'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                🍨 Sorvetes ({reportSummary.iceCreamFlavors.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('picole')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'picole'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                }`}
              >
                🍡 Picolés ({reportSummary.popsicleFlavors.length})
              </button>
            </div>

            {/* Controls: Search, Sort, IncludeZero */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por sabor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 text-stone-800 bg-stone-50"
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

              {/* Sort Selector */}
              <div className="flex items-center gap-1 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as FlavorSortOption)}
                  className="bg-transparent font-medium text-stone-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="qtd_desc">Mais Vendidos (Qtd)</option>
                  <option value="fat_desc">Maior Faturamento (R$)</option>
                  <option value="qtd_asc">Menor Giro (Menos Vendidos)</option>
                  <option value="nome_asc">Ordem Alfabética (A-Z)</option>
                </select>
              </div>

              {/* Include Zero Sales Toggle */}
              <label 
                className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors select-none"
                title="Quando marcado, mostra todos os sabores cadastrados no cardápio mesmo que não tenham vendido no período"
              >
                <input
                  type="checkbox"
                  checked={includeZeroSales}
                  onChange={(e) => setIncludeZeroSales(e.target.checked)}
                  className="rounded-sm text-rose-600 focus:ring-rose-400"
                />
                <span className="font-medium">Sabores sem venda</span>
              </label>
            </div>
          </div>
        </div>

        {/* Selected Period Info */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <span className="font-semibold text-stone-700">
            Período Apurado: <span className="text-rose-600 font-bold">{periodLabel}</span>
          </span>
          <span>
            {filteredSales.length} venda(s) analisada(s)
          </span>
        </div>
      </div>

      {/* KPI Cards: Executive Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Faturamento Geral */}
        <div className="bg-white rounded-3xl p-5 border border-rose-200/80 shadow-xs relative overflow-hidden bg-linear-to-br from-rose-50/50 via-white to-white">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <span>💰</span> Faturamento Geral
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
              {reportSummary.totalSalesCount} vendas
            </span>
          </div>
          <div className="text-2xl font-black text-stone-800 font-mono">
            R$ {reportSummary.totalSalesRevenue.toFixed(2).replace('.', ',')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>Total de produtos:</span>
            <strong className="text-rose-900 font-bold font-mono">{reportSummary.totalProductsSold} un.</strong>
          </div>
        </div>

        {/* Card 2: Sorvetes Total */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-xs relative overflow-hidden bg-linear-to-br from-amber-50/50 via-white to-white">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <span>🍨</span> Sorvetes de Massa
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              {reportSummary.iceCreamPercentage}% do mix
            </span>
          </div>
          <div className="text-2xl font-black text-stone-800 font-mono">
            R$ {reportSummary.totalIceCreamRevenue.toFixed(2).replace('.', ',')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>Bolas / Unidades:</span>
            <strong className="text-amber-900 font-bold font-mono">{reportSummary.totalIceCreamSold} bolas ({reportSummary.totalIceCreamUnits} un.)</strong>
          </div>
        </div>

        {/* Card 3: Picolés Total */}
        <div className="bg-white rounded-3xl p-5 border border-teal-200/80 shadow-xs relative overflow-hidden bg-linear-to-br from-teal-50/50 via-white to-white">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
              <span>🍡</span> Picolés Artesanais
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
              {reportSummary.popsiclePercentage}% do mix
            </span>
          </div>
          <div className="text-2xl font-black text-stone-800 font-mono">
            R$ {reportSummary.totalPopsicleRevenue.toFixed(2).replace('.', ',')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <span>Picolés vendidos:</span>
            <strong className="text-teal-900 font-bold font-mono">{reportSummary.totalPopsicleSold} un.</strong>
          </div>
        </div>

        {/* Card 4: Sabor Campeão Geral */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-amber-500 mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Sabor Campeão Geral
            </span>
          </div>
          {reportSummary.topOverallFlavor && reportSummary.topOverallFlavor.totalQuantity > 0 ? (
            <div>
              <div className="text-lg font-black text-stone-800 truncate" title={reportSummary.topOverallFlavor.name}>
                {reportSummary.topOverallFlavor.name}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold font-mono">
                  R$ {reportSummary.topOverallFlavor.totalRevenue.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-stone-500 font-medium">
                  {reportSummary.topOverallFlavor.totalQuantity} un.
                </span>
              </div>
              <div className="mt-1 text-[11px] text-stone-400 truncate">
                {reportSummary.topOverallFlavor.categoryDetail}
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-400 py-2">Nenhuma venda no período</div>
          )}
        </div>
      </div>

      {/* Proportional Mix Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-amber-800 flex items-center gap-1">
            <span>🍨</span> Sorvetes: R$ {reportSummary.totalIceCreamRevenue.toFixed(2).replace('.', ',')} ({reportSummary.iceCreamPercentage}%)
          </span>
          <span className="text-stone-500 font-normal">
            Total do Período: <strong className="text-stone-800 font-mono">R$ {reportSummary.totalSalesRevenue.toFixed(2).replace('.', ',')}</strong> ({reportSummary.totalProductsSold} produtos • {reportSummary.totalSalesCount} vendas)
          </span>
          <span className="text-teal-800 flex items-center gap-1">
            <span>🍡</span> Picolés: R$ {reportSummary.totalPopsicleRevenue.toFixed(2).replace('.', ',')} ({reportSummary.popsiclePercentage}%)
          </span>
        </div>
        <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden flex">
          <div 
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${reportSummary.iceCreamPercentage}%` }}
            title={`Sorvetes: ${reportSummary.iceCreamPercentage}%`}
          />
          <div 
            className="bg-teal-500 h-full transition-all duration-500"
            style={{ width: `${reportSummary.popsiclePercentage}%` }}
            title={`Picolés: ${reportSummary.popsiclePercentage}%`}
          />
        </div>
      </div>

      {/* Tables Section based on Category Filter */}
      {categoryFilter === 'todos' && (
        <div className="space-y-6">
          {/* Seção 1: Sorvetes de Massa */}
          {renderFlavorTable(
            displayedIceCream,
            'sorvete',
            'Relatório Completo: Sabores de Sorvete de Massa & Açaí',
            'bg-amber-100 text-amber-900 border border-amber-300',
            maxIceCreamSold
          )}

          {/* Seção 2: Picolés Artesanais */}
          {renderFlavorTable(
            displayedPopsicle,
            'picole',
            'Relatório Completo: Sabores de Picolé Artesanais & Frutas Tropicais',
            'bg-teal-100 text-teal-900 border border-teal-300',
            maxPopsicleSold
          )}
        </div>
      )}

      {categoryFilter === 'sorvete' && (
        <div>
          {renderFlavorTable(
            displayedIceCream,
            'sorvete',
            'Relatório Completo: Sabores de Sorvete de Massa & Açaí',
            'bg-amber-100 text-amber-900 border border-amber-300',
            maxIceCreamSold
          )}
        </div>
      )}

      {categoryFilter === 'picole' && (
        <div>
          {renderFlavorTable(
            displayedPopsicle,
            'picole',
            'Relatório Completo: Sabores de Picolé Artesanais & Frutas Tropicais',
            'bg-teal-100 text-teal-900 border border-teal-300',
            maxPopsicleSold
          )}
        </div>
      )}

      {/* Printable Report Document Portaled to #print-root */}
      {typeof document !== 'undefined' && document.getElementById('print-root') && createPortal(
        <div className="pos-flavor-report-print">
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
              Eliza Sorvetes Artesanais
            </h1>
            <h2 style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0 0 0', textTransform: 'uppercase' }}>
              Relatório Completo de Vendas por Sabor
            </h2>
            <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#4b5563' }}>
              <strong>Período Apurado:</strong> {periodLabel} • <strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Executive Summary Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Faturamento Total</span>
              <strong style={{ fontSize: '14px', color: '#065f46' }}>R$ {reportSummary.totalRevenue.toFixed(2).replace('.', ',')}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Total Itens Vendidos</span>
              <strong style={{ fontSize: '14px' }}>{reportSummary.totalItemsSold} un/bolas</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Sorvetes de Massa</span>
              <strong style={{ fontSize: '13px' }}>R$ {reportSummary.totalIceCreamRevenue.toFixed(2).replace('.', ',')} ({reportSummary.totalIceCreamSold} bolas • {reportSummary.iceCreamPercentage}%)</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Picolés Artesanais</span>
              <strong style={{ fontSize: '13px' }}>R$ {reportSummary.totalPopsicleRevenue.toFixed(2).replace('.', ',')} ({reportSummary.totalPopsicleSold} un • {reportSummary.popsiclePercentage}%)</strong>
            </div>
          </div>

          {/* Table: Sorvetes */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px 0', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
              1. Sabores de Sorvete de Massa (Bolas, Copinhos e Casquinhas)
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                  <th>Sabor</th>
                  <th style={{ textAlign: 'center' }}>Qtd Bolas</th>
                  <th style={{ textAlign: 'right' }}>Faturamento (R$)</th>
                  <th style={{ textAlign: 'right' }}>Preço Médio</th>
                  <th style={{ textAlign: 'center' }}>% Categoria</th>
                  <th style={{ textAlign: 'center' }}>Casq. / Cop.</th>
                  <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.iceCreamFlavors.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.rank || idx + 1}</td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.isRegional && ' (Pará)'}
                      {item.isNutella && ' (Nutella)'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantitySold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>R$ {item.totalRevenue.toFixed(2).replace('.', ',')}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantitySold > 0 ? `R$ ${item.averagePrice.toFixed(2).replace('.', ',')}` : '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.percentageOfCategory.toFixed(1).replace('.', ',')}%</td>
                    <td style={{ textAlign: 'center' }}>{item.casquinhaCount} / {item.copinhoCount}</td>
                    <td style={{ textAlign: 'center' }}>{item.currentStock !== undefined ? `${item.currentStock} ${item.stockUnit}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table: Picolés */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px 0', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
              2. Sabores de Picolé Artesanais & Frutas Tropicais
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                  <th>Sabor</th>
                  <th style={{ textAlign: 'center' }}>Qtd Vendida</th>
                  <th style={{ textAlign: 'right' }}>Faturamento (R$)</th>
                  <th style={{ textAlign: 'right' }}>Preço Médio</th>
                  <th style={{ textAlign: 'center' }}>% Categoria</th>
                  <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.popsicleFlavors.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.rank || idx + 1}</td>
                    <td>
                      <strong>{item.name}</strong>
                      {item.isRegional && ' (Pará)'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantitySold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>R$ {item.totalRevenue.toFixed(2).replace('.', ',')}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantitySold > 0 ? `R$ ${item.averagePrice.toFixed(2).replace('.', ',')}` : '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.percentageOfCategory.toFixed(1).replace('.', ',')}%</td>
                    <td style={{ textAlign: 'center' }}>{item.currentStock !== undefined ? `${item.currentStock} ${item.stockUnit}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #9ca3af', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '4px' }}></div>
              <span>Responsável / Operador</span>
            </div>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', height: '30px', marginBottom: '4px' }}></div>
              <span>Gerência Eliza Sorvetes</span>
            </div>
          </div>
        </div>,
        document.getElementById('print-root')!
      )}
    </div>
  );
};
