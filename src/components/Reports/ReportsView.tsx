import React, { useState, useMemo } from 'react';
import { usePos } from '../../context/PosContext';
import { Sale } from '../../types';
import { ReceiptModal } from '../PDV/ReceiptModal';
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
  Sparkles,
  Calendar,
  User
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sales, resetAllData } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  // Financial Metrics
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const totalSalesCount = sales.length;

  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  const totalItemsSold = useMemo(() => {
    return sales.reduce((acc, sale) => {
      return acc + sale.items.reduce((iSum, item) => iSum + item.quantity, 0);
    }, 0);
  }, [sales]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {
      dinheiro: { total: 0, count: 0 },
      pix: { total: 0, count: 0 },
      cartao_debito: { total: 0, count: 0 },
      cartao_credito: { total: 0, count: 0 }
    };

    sales.forEach((s) => {
      if (map[s.paymentMethod]) {
        map[s.paymentMethod].total += s.total;
        map[s.paymentMethod].count += 1;
      }
    });

    return map;
  }, [sales]);

  // Top Flavors Ranking
  const topFlavors = useMemo(() => {
    const flavorCounts: Record<string, number> = {};

    sales.forEach((sale) => {
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
  }, [sales]);

  // Filtered sales history
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter((s) => {
      const matchesId = s.id.toLowerCase().includes(term);
      const matchesCustomer = s.customerName ? s.customerName.toLowerCase().includes(term) : false;
      const matchesMethod = s.paymentMethod.toLowerCase().includes(term);
      const matchesItem = s.items.some(
        (i) =>
          i.productName.toLowerCase().includes(term) ||
          i.selectedFlavors.some((f) => f.toLowerCase().includes(term))
      );
      return matchesId || matchesCustomer || matchesMethod || matchesItem;
    });
  }, [sales, searchTerm]);

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

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-5 overflow-y-auto pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Quicksand',sans-serif]">
            Relatórios & Resumo de Vendas
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhe o faturamento, meios de pagamento e sabores com maior saída
          </p>
        </div>

        <button
          id="reset-demo-btn"
          onClick={() => {
            if (window.confirm('Deseja restaurar os dados de demonstração do sistema?')) {
              resetAllData();
            }
          }}
          className="self-start sm:self-auto px-3.5 py-2 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Dados Demo</span>
        </button>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Faturamento Total */}
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
            + Total acumulado
          </span>
        </div>

        {/* Quantidade de Vendas */}
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
            Transações registradas
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
            Por cliente atendido
          </span>
        </div>

        {/* Itens Vendidos */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100/40 rounded-full blur-xl -mr-6 -mt-6"></div>
          <div className="flex items-center gap-2 text-purple-500 mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Unidades Vendidas
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-800 font-mono">
            {totalItemsSold}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 inline-block">
            Sorvetes, picolés & água
          </span>
        </div>
      </div>

      {/* Grid: Payment Breakdown & Top Flavors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment breakdown */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs">
          <h3 className="text-base font-bold text-stone-800 font-['Quicksand',sans-serif] mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            <span>Faturamento por Meio de Pagamento</span>
          </h3>

          <div className="space-y-3">
            {[
              { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-emerald-500', bgSoft: 'bg-emerald-50' },
              { id: 'pix', label: 'Pix Instantâneo', icon: QrCode, color: 'bg-teal-500', bgSoft: 'bg-teal-50' },
              { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard, color: 'bg-sky-500', bgSoft: 'bg-sky-50' },
              { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard, color: 'bg-indigo-500', bgSoft: 'bg-indigo-50' }
            ].map((method) => {
              const data = paymentBreakdown[method.id] || { total: 0, count: 0 };
              const percentage = totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0;
              const IconComp = method.icon;

              return (
                <div key={method.id} className="p-3 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-lg ${method.bgSoft} flex items-center justify-center text-stone-700`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-stone-700">{method.label}</span>
                      <span className="text-stone-400">({data.count} vendas)</span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-stone-800 font-mono">
                        R$ {data.total.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-stone-400 text-[11px] ml-1.5">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className={`h-full ${method.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Flavors Ranking */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs flex flex-col">
          <h3 className="text-base font-bold text-stone-800 font-['Quicksand',sans-serif] mb-3 flex items-center gap-2">
            <span>🍧</span>
            <span>Sabores Mais Pedidos</span>
          </h3>

          {topFlavors.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-xs py-8">
              Ainda não há vendas de sabores registradas.
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {topFlavors.map((flavor, index) => {
                const maxCount = topFlavors[0]?.count || 1;
                const ratio = (flavor.count / maxCount) * 100;

                return (
                  <div
                    key={flavor.name}
                    className="p-2.5 rounded-2xl bg-amber-50/40 border border-amber-100/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {index + 1}º
                      </span>
                      <span className="font-semibold text-stone-800 truncate">
                        {flavor.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 sm:w-28 h-2 rounded-full bg-amber-200/50 overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-rose-400 rounded-full"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                      <span className="font-bold text-stone-700 font-mono">
                        {flavor.count} {flavor.count === 1 ? 'saída' : 'saídas'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-stone-800 text-base font-['Quicksand',sans-serif]">
              Histórico de Vendas
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              id="search-sales-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, ID, item ou sabor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">ID / Horário</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Itens e Sabores</th>
                <th className="py-2.5 px-3">Pagamento</th>
                <th className="py-2.5 px-3 text-right">Valor Total</th>
                <th className="py-2.5 px-3 text-center">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const dateStr = new Date(sale.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-800 font-mono text-[11px]">
                          {sale.id}
                        </div>
                        <div className="text-[10px] text-stone-400">{dateStr}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={sale.customerName || 'Consumidor Final'}>
                            {sale.customerName || 'Consumidor Final'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <div className="space-y-0.5">
                          {sale.items.map((item, iIdx) => (
                            <div key={iIdx} className="text-xs">
                              <span className="font-semibold text-stone-800">
                                {item.quantity}x {item.productName}
                              </span>
                              {item.selectedFlavors.length > 0 && (
                                <span className="text-[11px] text-stone-500 block truncate">
                                  ({item.selectedFlavors.join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {getMethodBadge(sale.paymentMethod)}
                      </td>

                      <td className="py-3 px-3 text-right font-extrabold text-stone-800 font-mono text-sm">
                        R$ {sale.total.toFixed(2).replace('.', ',')}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          id={`view-receipt-${sale.id}`}
                          onClick={() => setSelectedSaleForView(sale)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-600 hover:text-rose-600 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Receipt Modal if user clicks 'Ver' */}
      {selectedSaleForView && (
        <ReceiptModal
          sale={selectedSaleForView}
          onClose={() => setSelectedSaleForView(null)}
        />
      )}
    </div>
  );
};
