import { Sale, SalesReport } from '../types';
import { formatBrazilDateTime, getBrazilDateString } from './dateUtils';


/**
 * Retorna o rótulo legível do método de pagamento
 */
function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'cartao_debito':
      return 'Cartão Débito';
    case 'cartao_credito':
      return 'Cartão Crédito';
    default:
      return method || 'Não especificado';
  }
}

/**
 * Retorna descrição clara e legível dos itens de uma venda
 */
export function formatSaleItemsDescription(sale: Sale, separator = ' + '): string {
  if (!sale.items || sale.items.length === 0) {
    return 'Nenhum item registrado';
  }

  return sale.items
    .map((item) => {
      const qty = item.quantity || 1;
      const flavors = item.selectedFlavors && item.selectedFlavors.length > 0
        ? ` (${item.selectedFlavors.join(', ')})`
        : '';
      const container = item.container
        ? ` [${item.container === 'casquinha' ? 'Casquinha' : 'Copinho'}]`
        : '';
      return `${qty}x ${item.productName}${container}${flavors}`;
    })
    .join(separator);
}

/**
 * Exporta o extrato analítico de vendas completo para planilha genuína do Microsoft Excel (.xlsx)
 * com abas separadas:
 * 1. Extrato de Vendas (Visão Geral por Venda com Cliente e O Que Foi Vendido em colunas dedicadas)
 * 2. Itens Detalhados (Cada produto e sabor vendido linha a linha com preços)
 */
export async function exportSalesExtractToExcel(
  sales: Sale[],
  periodLabel = 'Período Completo'
): Promise<void> {
  if (!sales || sales.length === 0) {
    throw new Error('Nenhuma venda para exportar no período selecionado.');
  }

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // ==========================================
  // ABA 1: EXTRATO CONSOLIDADO DE VENDAS
  // ==========================================
  let totalRevenue = 0;
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalItemsCount = 0;

  const salesRows = sales.map((sale) => {
    const rev = Number(sale.total) || 0;
    const sub = Number(sale.subtotal) || rev;
    const disc = Number(sale.discount) || 0;
    const itemsCount = (sale.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

    totalRevenue += rev;
    totalSubtotal += sub;
    totalDiscount += disc;
    totalItemsCount += itemsCount;

    const customer = (sale.customerName && sale.customerName.trim()) 
      ? sale.customerName.trim() 
      : 'Consumidor Final';

    const itemsDesc = formatSaleItemsDescription(sale, ' | ');

    return {
      'ID Venda': sale.id,
      'Data e Hora': formatBrazilDateTime(sale.timestamp),
      'Cliente': customer,
      'O Que Foi Vendido (Produtos e Sabores)': itemsDesc,
      'Qtd Itens': itemsCount,
      'Forma de Pagamento': getPaymentMethodLabel(sale.paymentMethod),
      'Subtotal (R$)': Number(sub.toFixed(2)),
      'Desconto (R$)': Number(disc.toFixed(2)),
      'Valor Total (R$)': Number(rev.toFixed(2)),
      'Atendente / Caixa': sale.cashierName || 'Eliza',
      'Turno de Caixa': sale.shiftId || '-'
    };
  });

  // Linha de totais
  const summaryRow = {
    'ID Venda': `TOTAL (${sales.length} vendas)`,
    'Data e Hora': '',
    'Cliente': '',
    'O Que Foi Vendido (Produtos e Sabores)': '',
    'Qtd Itens': totalItemsCount,
    'Forma de Pagamento': '',
    'Subtotal (R$)': Number(totalSubtotal.toFixed(2)),
    'Desconto (R$)': Number(totalDiscount.toFixed(2)),
    'Valor Total (R$)': Number(totalRevenue.toFixed(2)),
    'Atendente / Caixa': '',
    'Turno de Caixa': ''
  };

  const wsSales = XLSX.utils.json_to_sheet([...salesRows, summaryRow]);

  // Largura das colunas da Aba 1
  wsSales['!cols'] = [
    { wch: 24 }, // ID Venda
    { wch: 20 }, // Data e Hora
    { wch: 28 }, // Cliente
    { wch: 55 }, // O Que Foi Vendido
    { wch: 12 }, // Qtd Itens
    { wch: 18 }, // Forma de Pagamento
    { wch: 15 }, // Subtotal
    { wch: 15 }, // Desconto
    { wch: 16 }, // Valor Total
    { wch: 20 }, // Atendente / Caixa
    { wch: 22 }  // Turno de Caixa
  ];

  XLSX.utils.book_append_sheet(wb, wsSales, 'Extrato de Vendas');

  // ==========================================
  // ABA 2: ITENS DETALHADOS VENDIDOS (LINHA A LINHA)
  // ==========================================
  const itemRows: any[] = [];
  sales.forEach((sale) => {
    const customer = (sale.customerName && sale.customerName.trim()) 
      ? sale.customerName.trim() 
      : 'Consumidor Final';
    const dateFormatted = formatBrazilDateTime(sale.timestamp);
    const payment = getPaymentMethodLabel(sale.paymentMethod);

    (sale.items || []).forEach((item) => {
      const q = Number(item.quantity) || 1;
      const unit = Number(item.price) || 0;
      const total = unit * q;
      const flavors = item.selectedFlavors && item.selectedFlavors.length > 0
        ? item.selectedFlavors.join(', ')
        : 'Nenhum / Não aplicável';
      const container = item.container
        ? (item.container === 'casquinha' ? 'Casquinha' : 'Copinho')
        : 'Padrão';

      itemRows.push({
        'ID Venda': sale.id,
        'Data e Hora': dateFormatted,
        'Cliente': customer,
        'Produto Vendido': item.productName,
        'Recipiente': container,
        'Sabores Escolhidos': flavors,
        'Quantidade': q,
        'Preço Unitário (R$)': Number(unit.toFixed(2)),
        'Total do Item (R$)': Number(total.toFixed(2)),
        'Forma de Pagamento': payment,
        'Atendente': sale.cashierName || 'Eliza'
      });
    });
  });

  if (itemRows.length > 0) {
    const wsItems = XLSX.utils.json_to_sheet(itemRows);
    wsItems['!cols'] = [
      { wch: 24 }, // ID Venda
      { wch: 20 }, // Data e Hora
      { wch: 28 }, // Cliente
      { wch: 30 }, // Produto Vendido
      { wch: 16 }, // Recipiente
      { wch: 35 }, // Sabores Escolhidos
      { wch: 12 }, // Quantidade
      { wch: 18 }, // Preço Unitário
      { wch: 18 }, // Total do Item
      { wch: 18 }, // Forma de Pagamento
      { wch: 18 }  // Atendente
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Itens e Sabores Detalhados');
  }

  // Grava e dispara o download do arquivo .xlsx
  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  XLSX.writeFile(wb, `eliza_extrato_vendas_${safeDate}.xlsx`);
}

/**
 * Exporta o extrato analítico de vendas completo diretamente em formato PDF oficial
 * com layout paisagem (landscape), cabeçalho empresarial, cartões de resumo
 * e tabela detalhada de vendas mostrando claramente o Cliente e O Que Foi Vendido.
 */
export async function exportSalesExtractToPdf(
  sales: Sale[],
  periodLabel = 'Período Completo'
): Promise<void> {
  if (!sales || sales.length === 0) {
    throw new Error('Nenhuma venda para exportar no período selecionado.');
  }

  const { default: jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule.default || autoTableModule) as any;

  // Inicia jsPDF no formato Paisagem A4 (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalItemsCount = sales.reduce(
    (sum, s) => sum + (s.items || []).reduce((subSum, it) => subSum + (Number(it.quantity) || 1), 0),
    0
  );
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  const emissionDate = new Date().toLocaleString('pt-BR');

  // Cabeçalho da Empresa
  doc.setFillColor(190, 18, 60); // rose-700
  doc.rect(14, 10, 269, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(159, 18, 57); // rose-800
  doc.text('ELIZA SORVETES ARTESANAIS', 14, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55); // stone-800
  doc.text('EXTRATO ANALÍTICO DE VENDAS', 14, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128); // stone-500
  doc.text(`Período Apurado: ${periodLabel}   •   Data de Emissão: ${emissionDate}   •   Total: ${sales.length} vendas`, 14, 31);

  // Faixa de Resumo / KPI Boxes
  const kpiY = 34;
  const kpiH = 14;

  // Box 1: Faturamento Total
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, kpiY, 62, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('FATURAMENTO TOTAL', 18, kpiY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(`R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, 18, kpiY + 10.5);

  // Box 2: Total de Vendas
  doc.roundedRect(82, kpiY, 58, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('TOTAL DE VENDAS', 86, kpiY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text(`${sales.length} vendas`, 86, kpiY + 10.5);

  // Box 3: Total Itens Vendidos
  doc.roundedRect(146, kpiY, 62, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('ITENS / PRODUTOS VENDIDOS', 150, kpiY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text(`${totalItemsCount} unidades`, 150, kpiY + 10.5);

  // Box 4: Ticket Médio
  doc.roundedRect(214, kpiY, 69, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('TICKET MÉDIO POR VENDA', 218, kpiY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text(`R$ ${averageTicket.toFixed(2).replace('.', ',')}`, 218, kpiY + 10.5);

  // Preparação da Tabela
  const tableHeaders = [
    ['Data / Hora', 'ID Venda', 'Cliente', 'O Que Foi Vendido (Produtos & Sabores)', 'Qtd', 'Pagamento', 'Valor Total']
  ];

  const tableBody = sales.map((sale) => {
    const customer = (sale.customerName && sale.customerName.trim()) 
      ? sale.customerName.trim() 
      : 'Consumidor Final';

    const itemsDesc = formatSaleItemsDescription(sale, '\n');
    const itemsCount = (sale.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    const totalVal = Number(sale.total) || 0;

    return [
      formatBrazilDateTime(sale.timestamp),
      sale.id,
      customer,
      itemsDesc,
      String(itemsCount),
      getPaymentMethodLabel(sale.paymentMethod),
      `R$ ${totalVal.toFixed(2).replace('.', ',')}`
    ];
  });

  // Linha de Rodapé com Totais
  const footRow = [
    [
      'TOTAL DO PERÍODO',
      `${sales.length} vendas`,
      '',
      '',
      String(totalItemsCount),
      '',
      `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`
    ]
  ];

  // Gera a tabela com autotable
  autoTable(doc, {
    startY: 52,
    head: tableHeaders,
    body: tableBody,
    foot: footRow,
    theme: 'striped',
    headStyles: {
      fillColor: [190, 18, 60], // rose-700
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [55, 65, 81],
      cellPadding: 2,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [255, 248, 248]
    },
    columnStyles: {
      0: { cellWidth: 26 }, // Data / Hora
      1: { cellWidth: 32, fontStyle: 'bold' }, // ID Venda
      2: { cellWidth: 34, fontStyle: 'bold', textColor: [159, 18, 57] }, // Cliente (destaque!)
      3: { cellWidth: 'auto' }, // O Que Foi Vendido
      4: { cellWidth: 12, halign: 'center' }, // Qtd
      5: { cellWidth: 24 }, // Pagamento
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [6, 95, 70] } // Total
    },
    didDrawPage: (data) => {
      // Rodapé da página
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Eliza Sorvetes Artesanais • Sistema de PDV e Gestão   •   Página ${currentPage} de ${pageCount}`,
        14,
        202
      );
    }
  });

  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  doc.save(`eliza_extrato_vendas_${safeDate}.pdf`);
}

/**
 * Exporta o extrato analítico de vendas em formato CSV estritamente compatível com o Microsoft Excel
 * com o delimitador especificado (sep=;) na primeira linha para evitar que o Excel agrupe tudo na coluna A.
 */
export function exportSalesExtractToCsv(
  sales: Sale[],
  periodLabel = 'Período Completo'
): void {
  const headers = [
    'ID Venda',
    'Data / Hora',
    'Nome do Cliente',
    'O Que Foi Vendido (Produtos e Sabores)',
    'Quantidade de Itens',
    'Forma de Pagamento',
    'Subtotal (R$)',
    'Desconto (R$)',
    'Valor Total (R$)',
    'Atendente / Caixa',
    'Turno de Caixa'
  ];

  let totalRevenue = 0;
  let totalItemsCount = 0;

  const rows = sales.map((sale) => {
    totalRevenue += Number(sale.total) || 0;
    const itemsCount = (sale.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    totalItemsCount += itemsCount;

    const customer = (sale.customerName && sale.customerName.trim()) 
      ? sale.customerName.trim() 
      : 'Consumidor Final';

    const itemsDesc = formatSaleItemsDescription(sale, ' + ');
    const dateFormatted = formatBrazilDateTime(sale.timestamp);
    const paymentLabel = getPaymentMethodLabel(sale.paymentMethod);

    return [
      sale.id,
      dateFormatted,
      `"${customer.replace(/"/g, '""')}"`,
      `"${itemsDesc.replace(/"/g, '""')}"`,
      itemsCount,
      paymentLabel,
      (Number(sale.subtotal) || Number(sale.total) || 0).toFixed(2).replace('.', ','),
      (Number(sale.discount) || 0).toFixed(2).replace('.', ','),
      (Number(sale.total) || 0).toFixed(2).replace('.', ','),
      `"${(sale.cashierName || 'Eliza').replace(/"/g, '""')}"`,
      sale.shiftId || '-'
    ];
  });

  const summaryRow = [
    `"TOTAL GERAL (${sales.length} vendas)"`,
    '""',
    '""',
    '""',
    totalItemsCount,
    '""',
    '""',
    '""',
    totalRevenue.toFixed(2).replace('.', ','),
    '""',
    '""'
  ];

  // Adicionamos 'sep=;\r\n' no topo para que o Microsoft Excel reconheça automaticamente o separador ponto e vírgula
  const csvContent =
    '\uFEFFsep=;\r\n' +
    headers.join(';') +
    '\r\n' +
    rows.map((row) => row.join(';')).join('\r\n') +
    '\r\n' +
    summaryRow.join(';');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeDate = periodLabel.replace(/[/\\?%*:|"<> ]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `eliza_extrato_vendas_${safeDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Abre o extrato formatado para impressão direta ou Salvamento em PDF pelo navegador,
 * utilizando um documento HTML standalone totalmente estilizado.
 */
export function openSalesExtractPrintDocument(
  sales: Sale[],
  periodLabel = 'Período Completo'
): void {
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalItemsCount = sales.reduce(
    (sum, s) => sum + (s.items || []).reduce((subSum, it) => subSum + (Number(it.quantity) || 1), 0),
    0
  );
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  const emissionDate = new Date().toLocaleString('pt-BR');

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Extrato de Vendas - Eliza Sorvetes</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 10px;
      color: #1f2937;
      background: #ffffff;
      font-size: 11px;
    }
    .header {
      border-bottom: 3px solid #be123c;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      color: #be123c;
      text-transform: uppercase;
      font-weight: 900;
    }
    .header h2 {
      margin: 2px 0 0 0;
      font-size: 13px;
      color: #374151;
      font-weight: 700;
    }
    .header p {
      margin: 4px 0 0 0;
      color: #6b7280;
      font-size: 10px;
    }
    .kpi-container {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-box {
      flex: 1;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #6b7280;
      display: block;
    }
    .kpi-value {
      font-size: 14px;
      font-weight: 800;
      color: #111827;
      margin-top: 2px;
    }
    .kpi-value.green {
      color: #065f46;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 14px;
    }
    th {
      background-color: #be123c;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
    }
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 6px 8px;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #fff1f2;
    }
    .customer-name {
      font-weight: 700;
      color: #be123c;
    }
    .items-list {
      line-height: 1.35;
    }
    .item-bullet {
      display: block;
    }
    .total-val {
      font-weight: 800;
      color: #065f46;
      text-align: right;
    }
    .tfoot-row td {
      background-color: #f3f4f6;
      font-weight: 800;
      border-top: 2px solid #9ca3af;
      font-size: 10px;
    }
    .no-print-bar {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #be123c;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>Visualização de Impressão do Extrato de Vendas (${sales.length} vendas)</span>
    <button class="btn-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>

  <div class="header">
    <h1>Eliza Sorvetes Artesanais</h1>
    <h2>Extrato Analítico de Vendas</h2>
    <p>Período: <strong>${periodLabel}</strong> &bull; Emissão: <strong>${emissionDate}</strong> &bull; Total: <strong>${sales.length} vendas</strong></p>
  </div>

  <div class="kpi-container">
    <div class="kpi-box">
      <span class="kpi-label">Faturamento Total</span>
      <div class="kpi-value green">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</div>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Vendas Realizadas</span>
      <div class="kpi-value">${sales.length} vendas</div>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Itens Vendidos</span>
      <div class="kpi-value">${totalItemsCount} unidades</div>
    </div>
    <div class="kpi-box">
      <span class="kpi-label">Ticket Médio</span>
      <div class="kpi-value">R$ ${averageTicket.toFixed(2).replace('.', ',')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 110px;">Data / Hora</th>
        <th style="width: 140px;">ID Venda</th>
        <th style="width: 140px;">Cliente</th>
        <th>O Que Foi Vendido (Produtos & Sabores)</th>
        <th style="width: 40px; text-align: center;">Qtd</th>
        <th style="width: 100px;">Pagamento</th>
        <th style="width: 90px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${sales.map((sale) => {
        const customer = (sale.customerName && sale.customerName.trim()) 
          ? sale.customerName.trim() 
          : 'Consumidor Final';
        const items = (sale.items || []).map((it) => {
          const q = it.quantity || 1;
          const flvs = it.selectedFlavors?.length ? ` (${it.selectedFlavors.join(', ')})` : '';
          const cont = it.container ? ` [${it.container === 'casquinha' ? 'Casquinha' : 'Copinho'}]` : '';
          return `<span class="item-bullet">&bull; <strong>${q}x</strong> ${it.productName}${cont}${flvs}</span>`;
        }).join('');
        const itemsCount = (sale.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const total = Number(sale.total) || 0;

        return `<tr>
          <td>${formatBrazilDateTime(sale.timestamp)}</td>
          <td style="font-family: monospace; font-weight: bold;">${sale.id}</td>
          <td class="customer-name">${customer}</td>
          <td class="items-list">${items || 'Nenhum item'}</td>
          <td style="text-align: center; font-weight: bold;">${itemsCount}</td>
          <td>${getPaymentMethodLabel(sale.paymentMethod)}</td>
          <td class="total-val">R$ ${total.toFixed(2).replace('.', ',')}</td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr class="tfoot-row">
        <td>TOTAL DO PERÍODO</td>
        <td>${sales.length} vendas</td>
        <td></td>
        <td></td>
        <td style="text-align: center;">${totalItemsCount}</td>
        <td></td>
        <td style="text-align: right; color: #065f46;">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.addEventListener('load', function() {
      // Executa print automático se solicitado
      try {
        setTimeout(function() { window.print(); }, 400);
      } catch (e) {
        console.warn('Auto-print blocked', e);
      }
    });
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Tenta abrir a nova janela com o documento
  const win = window.open(blobUrl, '_blank');
  if (!win) {
    // Se popup foi bloqueado pelo navegador, baixa como HTML ou dispara impressão nativa
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
