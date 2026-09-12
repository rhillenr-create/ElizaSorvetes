import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sale } from '../../types';
import { usePos } from '../../context/PosContext';
import { formatBrazilDateTime } from '../../utils/dateUtils';
import { safeStorage } from '../../utils/storage';
import { 
  CheckCircle, 
  Printer, 
  X, 
  ShoppingBag, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Info,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Type,
  SlidersHorizontal
} from 'lucide-react';

type PrintFontSize = 'normal' | 'large' | 'xlarge';
type PrintFontFamily = 'modern' | 'mono';
type PrintPaperWidth = '80mm' | '58mm';
type PrintCopies = 1 | 2;

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
  onSaleCancelled?: (saleId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, onSaleCancelled }) => {
  if (!sale) return null;

  const { deleteSale } = usePos();
  const [copied, setCopied] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [showPopupWarning, setShowPopupWarning] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);

  // Number of copies: strictly 1 single copy per user specification
  const printCopies = 1;

  // Print typography and layout preferences (saved in local storage)
  const [fontSize, setFontSize] = useState<PrintFontSize>(() => 
    safeStorage.get<PrintFontSize>('eliza_receipt_font_size', 'large')
  );
  const [fontFamily, setFontFamily] = useState<PrintFontFamily>(() => 
    safeStorage.get<PrintFontFamily>('eliza_receipt_font_family', 'modern')
  );
  const [paperWidth, setPaperWidth] = useState<PrintPaperWidth>(() => 
    safeStorage.get<PrintPaperWidth>('eliza_receipt_paper_width', '80mm')
  );

  const handleSetFontSize = (size: PrintFontSize) => {
    setFontSize(size);
    safeStorage.set('eliza_receipt_font_size', size);
  };

  const handleSetFontFamily = (family: PrintFontFamily) => {
    setFontFamily(family);
    safeStorage.set('eliza_receipt_font_family', family);
  };

  const handleSetPaperWidth = (width: PrintPaperWidth) => {
    setPaperWidth(width);
    safeStorage.set('eliza_receipt_paper_width', width);
  };

  const handleConfirmCancelSale = () => {
    deleteSale(sale.id, true);
    if (onSaleCancelled) {
      onSaleCancelled(sale.id);
    }
    onClose();
  };

  // Check if app is running inside a preview iframe
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const formattedDate = formatBrazilDateTime(sale.timestamp);

  const getPaymentName = (method: string) => {
    switch (method) {
      case 'dinheiro':
        return 'Dinheiro';
      case 'pix':
        return 'Pix';
      case 'cartao_debito':
        return 'Cartão de Débito';
      case 'cartao_credito':
        return 'Cartão de Crédito';
      default:
        return method;
    }
  };

  const generateReceiptHtml = (
    currentFontSize: PrintFontSize = fontSize,
    currentFontFamily: PrintFontFamily = fontFamily,
    currentPaperWidth: PrintPaperWidth = paperWidth
  ) => {
    const customer = sale.customerName?.trim() || 'Consumidor Final';

    const renderTicketBody = () => `
      <div class="text-center">
        <div class="store-title">ELIZA SORVETES</div>
        <div class="store-sub bold">Sorvetes & Picolés Artesanais</div>
        <div class="store-sub meta-row">CNPJ: 63.817.939/0001-63</div>
        <div class="store-sub meta-row">Cupom Não Fiscal: <b>${sale.id}</b></div>
        <div class="store-sub meta-row">${formattedDate}</div>
      </div>

      <div class="dashed-line"></div>

      <div>
        <div class="row meta-row">
          <span class="bold">CLIENTE:</span>
          <span class="bold">${customer}</span>
        </div>
        <div class="row meta-row">
          <span>Operador(a):</span>
          <span class="bold">${sale.cashierName || 'Eliza'}</span>
        </div>
      </div>

      <div class="dashed-line"></div>

      <div class="bold" style="margin-bottom: 6px; letter-spacing: 0.3px;">ITENS DA VENDA:</div>
      <div>
        ${sale.items.map((item) => `
          <div class="item-group">
            <div class="item-row">
              <span class="item-name"><b>${item.quantity}x</b> ${item.productName}</span>
              <span class="item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
            ${item.selectedFlavors.length > 0 ? `
              <div class="item-flavor">• Sabor: ${item.selectedFlavors.join(' + ')}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="dashed-line"></div>

      <div>
        <div class="row">
          <span>Subtotal:</span>
          <span class="bold">R$ ${sale.subtotal.toFixed(2).replace('.', ',')}</span>
        </div>
        
        <div class="total-box">
          <span class="total-val bold">TOTAL A PAGAR:</span>
          <span class="total-val extra-bold">R$ ${sale.total.toFixed(2).replace('.', ',')}</span>
        </div>

        <div class="row">
          <span>Forma de Pagamento:</span>
          <span class="bold">${getPaymentName(sale.paymentMethod)}</span>
        </div>

        ${sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined ? `
          <div class="row">
            <span>Valor Recebido:</span>
            <span class="bold">R$ ${sale.amountReceived.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="row bold">
            <span>Troco Devolvido:</span>
            <span class="bold">R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}</span>
          </div>
        ` : ''}
      </div>

      <div class="dashed-line"></div>

      <div class="footer">
        <div>Obrigado pela preferência!</div>
        <div class="bold" style="margin-top: 2px;">Volte Sempre!</div>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cupom - ${sale.id} - Eliza Sorvetes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: #f1f5f9;
      color: #000000;
      padding: 16px 8px;
      -webkit-font-smoothing: antialiased;
    }

    /* Font Family options */
    body.font-modern {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body.font-mono {
      font-family: 'Consolas', 'Courier New', Courier, monospace;
    }

    .action-bar {
      max-width: 82mm;
      margin: 0 auto 14px auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #ffffff;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .action-row-primary {
      display: flex;
      gap: 8px;
    }

    .print-main-btn {
      flex: 1;
      background: #047857;
      color: #ffffff;
      border: none;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      transition: background 0.15s;
    }
    .print-main-btn:hover {
      background: #065f46;
    }

    .close-btn {
      background: #e2e8f0;
      color: #334155;
      border: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .close-btn:hover {
      background: #cbd5e1;
    }

    .settings-toolbar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }

    .toolbar-label {
      color: #475569;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .btn-group {
      display: flex;
      gap: 4px;
    }

    .tool-btn {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #1e293b;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tool-btn.active {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    /* Ticket Card Container */
    .ticket-card {
      margin: 0 auto;
      background: #ffffff;
      color: #000000;
      padding: 16px 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.1);
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    /* Paper Widths */
    .ticket-card.width-80mm {
      width: 78mm;
      max-width: 100%;
    }
    .ticket-card.width-58mm {
      width: 56mm;
      max-width: 100%;
    }

    /* Font Sizes - High readability scales */
    .ticket-card.size-normal {
      font-size: 13.5px;
      line-height: 1.4;
    }
    .ticket-card.size-normal .store-title { font-size: 18px; }
    .ticket-card.size-normal .store-sub { font-size: 12px; }
    .ticket-card.size-normal .item-row { font-size: 13.5px; }
    .ticket-card.size-normal .item-flavor { font-size: 11.5px; }
    .ticket-card.size-normal .total-val { font-size: 16.5px; }
    .ticket-card.size-normal .meta-row { font-size: 12px; }

    .ticket-card.size-large {
      font-size: 15.5px;
      line-height: 1.42;
    }
    .ticket-card.size-large .store-title { font-size: 21px; }
    .ticket-card.size-large .store-sub { font-size: 13.5px; }
    .ticket-card.size-large .item-row { font-size: 15px; }
    .ticket-card.size-large .item-flavor { font-size: 13px; }
    .ticket-card.size-large .total-val { font-size: 19px; }
    .ticket-card.size-large .meta-row { font-size: 13.5px; }

    .ticket-card.size-xlarge {
      font-size: 17.5px;
      line-height: 1.45;
    }
    .ticket-card.size-xlarge .store-title { font-size: 24px; }
    .ticket-card.size-xlarge .store-sub { font-size: 15px; }
    .ticket-card.size-xlarge .item-row { font-size: 17px; }
    .ticket-card.size-xlarge .item-flavor { font-size: 14.5px; }
    .ticket-card.size-xlarge .total-val { font-size: 22px; }
    .ticket-card.size-xlarge .meta-row { font-size: 15px; }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: 700; }
    .extra-bold { font-weight: 800; }
    
    .dashed-line {
      border-bottom: 1.5px dashed #000000;
      margin: 10px 0;
    }

    .solid-line {
      border-bottom: 2px solid #000000;
      margin: 10px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .store-title {
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .store-sub {
      color: #000000;
      font-weight: 500;
    }

    .item-group {
      margin-bottom: 6px;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-weight: 600;
    }

    .item-name {
      word-break: break-word;
      padding-right: 6px;
    }

    .item-price {
      white-space: nowrap;
      font-weight: 700;
    }

    .item-flavor {
      color: #000000;
      font-weight: 600;
      padding-left: 8px;
      margin-top: 1px;
    }

    .total-box {
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 6px 0;
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
    }

    .footer {
      text-align: center;
      margin-top: 12px;
      font-weight: 600;
    }

    .via-badge {
      display: inline-block;
      margin: 4px auto;
      padding: 2px 8px;
      background: #000000;
      color: #ffffff !important;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .cut-divider {
      margin: 14px 0;
      padding: 6px 0;
      border-top: 2px dashed #000000;
      border-bottom: 2px dashed #000000;
      text-align: center;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        color: #000000 !important;
      }

      .action-bar, .no-print {
        display: none !important;
      }

      .ticket-card {
        width: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        padding: 2px 0 !important;
        margin: 0 !important;
        color: #000000 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      * {
        color: #000000 !important;
        text-shadow: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        size: auto;
        margin: 0mm;
      }
    }
  </style>
</head>
<body class="${currentFontFamily === 'modern' ? 'font-modern' : 'font-mono'}">

  <!-- Top Action & Typography Controls Bar (Hidden automatically when printing) -->
  <div class="action-bar no-print">
    <div class="action-row-primary">
      <button class="print-main-btn" onclick="window.print()">
        🖨️ <span id="main-print-label">Imprimir Cupom (1 Cópia)</span>
      </button>
      <button class="close-btn" onclick="window.close()">
        ✕ Fechar
      </button>
    </div>

    <div class="settings-toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">Vias:</span>
        <span style="font-weight: 700; font-size: 11px; background: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 6px;">1 Cópia</span>
      </div>

      <div class="toolbar-group">
        <span class="toolbar-label">Tamanho da Letra:</span>
        <div class="btn-group">
          <button class="tool-btn ${currentFontSize === 'normal' ? 'active' : ''}" id="btn-size-normal" onclick="changeSize('normal')">Padrão</button>
          <button class="tool-btn ${currentFontSize === 'large' ? 'active' : ''}" id="btn-size-large" onclick="changeSize('large')">Grande</button>
          <button class="tool-btn ${currentFontSize === 'xlarge' ? 'active' : ''}" id="btn-size-xlarge" onclick="changeSize('xlarge')">Extra (+)</button>
        </div>
      </div>

      <div class="toolbar-group">
        <span class="toolbar-label">Tipo de Letra:</span>
        <div class="btn-group">
          <button class="tool-btn ${currentFontFamily === 'modern' ? 'active' : ''}" id="btn-font-modern" onclick="changeFont('modern')">Nítida (Moderna)</button>
          <button class="tool-btn ${currentFontFamily === 'mono' ? 'active' : ''}" id="btn-font-mono" onclick="changeFont('mono')">Mono</button>
        </div>
      </div>

      <div class="toolbar-group">
        <span class="toolbar-label">Bobina / Papel:</span>
        <div class="btn-group">
          <button class="tool-btn ${currentPaperWidth === '80mm' ? 'active' : ''}" id="btn-width-80" onclick="changeWidth('80mm')">80mm</button>
          <button class="tool-btn ${currentPaperWidth === '58mm' ? 'active' : ''}" id="btn-width-58" onclick="changeWidth('58mm')">58mm</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Printable Receipt Card - Strictly 1 Single Copy -->
  <div id="receipt-card" class="ticket-card width-${currentPaperWidth} size-${currentFontSize}">
    ${renderTicketBody()}
  </div>

  <script>
    function changeSize(size) {
      const card = document.getElementById('receipt-card');
      card.classList.remove('size-normal', 'size-large', 'size-xlarge');
      card.classList.add('size-' + size);

      document.querySelectorAll('#btn-size-normal, #btn-size-large, #btn-size-xlarge').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-size-' + size);
      if (activeBtn) activeBtn.classList.add('active');

      try {
        localStorage.setItem('eliza_receipt_font_size', JSON.stringify(size));
      } catch(e) {}
    }

    function changeFont(font) {
      if (font === 'modern') {
        document.body.classList.remove('font-mono');
        document.body.classList.add('font-modern');
      } else {
        document.body.classList.remove('font-modern');
        document.body.classList.add('font-mono');
      }

      document.querySelectorAll('#btn-font-modern, #btn-font-mono').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-font-' + font);
      if (activeBtn) activeBtn.classList.add('active');

      try {
        localStorage.setItem('eliza_receipt_font_family', JSON.stringify(font));
      } catch(e) {}
    }

    function changeWidth(w) {
      const card = document.getElementById('receipt-card');
      card.classList.remove('width-80mm', 'width-58mm');
      card.classList.add('width-' + w);

      document.querySelectorAll('#btn-width-80, #btn-width-58').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(w === '80mm' ? 'btn-width-80' : 'btn-width-58');
      if (activeBtn) activeBtn.classList.add('active');

      try {
        localStorage.setItem('eliza_receipt_paper_width', JSON.stringify(w));
      } catch(e) {}
    }

    // Auto print on load
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.warn('Auto-print blocked', e);
        }
      }, 400);
    });
  </script>
</body>
</html>`;
  };

  // Generate Blob URL for instant, unblockable navigation & printing
  const receiptBlobUrl = useMemo(() => {
    try {
      const html = generateReceiptHtml(fontSize, fontFamily, paperWidth);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Error generating receipt blob url', e);
      return '';
    }
  }, [sale, fontSize, fontFamily, paperWidth]);

  useEffect(() => {
    return () => {
      if (receiptBlobUrl) {
        URL.revokeObjectURL(receiptBlobUrl);
      }
    };
  }, [receiptBlobUrl]);

  const getReceiptPlainText = () => {
    const customer = sale.customerName?.trim() || 'Consumidor Final';
    const line = '------------------------------------------';
    const doubleLine = '==========================================';

    const itemsText = sale.items.map((item) => {
      let t = `${item.quantity}x ${item.productName} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`;
      if (item.selectedFlavors.length > 0) {
        t += `\n   Sabores: ${item.selectedFlavors.join(' + ')}`;
      }
      return t;
    }).join('\n');

    let finance = `Subtotal: R$ ${sale.subtotal.toFixed(2).replace('.', ',')}\nTOTAL: R$ ${sale.total.toFixed(2).replace('.', ',')}\nPagamento: ${getPaymentName(sale.paymentMethod)}`;
    if (sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined) {
      finance += `\nValor Recebido: R$ ${sale.amountReceived.toFixed(2).replace('.', ',')}\nTroco: R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}`;
    }

    return `${doubleLine}
              ELIZA SORVETES
       Sorvetes & Picolés Artesanais
         CNPJ: 63.817.939/0001-63
${line}
Cupom Não Fiscal: ${sale.id}
Data: ${formattedDate}
Cliente: ${customer}
Operador(a): ${sale.cashierName || 'Eliza'}
${line}
ITENS:
${itemsText}
${line}
${finance}
${line}
   Obrigado pela preferência! Volte sempre!
${doubleLine}`;
  };

  const handleCopyReceipt = async () => {
    const text = getReceiptPlainText();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadTxt = () => {
    const text = getReceiptPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cupom-${sale.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = (e?: React.MouseEvent) => {
    // If inside an iframe (like AI Studio preview), standard window.print() is blocked by the iframe sandbox.
    // We open the standalone Blob URL in a new tab where window.print() is allowed!
    if (isInIframe) {
      setPrintStatus('Abrindo cupom em nova aba para impressão...');
      try {
        const win = window.open(receiptBlobUrl, '_blank');
        if (!win) {
          setShowPopupWarning(true);
        } else {
          setTimeout(() => setPrintStatus(null), 4000);
        }
      } catch (err) {
        console.warn('window.open blocked, fallback to direct anchor', err);
        setShowPopupWarning(true);
      }
      return;
    }

    // If running in top-level window (not in iframe), execute native browser print
    try {
      setPrintStatus('Abrindo diálogo de impressão...');
      window.print();
      setPrintStatus(null);
    } catch (err) {
      console.warn('Native window.print failed, opening new tab instead', err);
      window.open(receiptBlobUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-100 overflow-hidden flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Celebration Banner */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 p-4 sm:p-5 text-white text-center relative">
          <button
            id="close-receipt-btn"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar cupom"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-md mb-2">
            <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold font-['Quicksand',sans-serif]">Venda Finalizada com Sucesso!</h3>
          <p className="text-xs text-emerald-100 mt-0.5">Estoque e relatórios atualizados automaticamente</p>
        </div>

        {/* Status notification */}
        {printStatus && (
          <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 text-xs text-teal-900 text-center font-medium animate-pulse flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>{printStatus}</span>
          </div>
        )}

        {/* Popup Warning Helper if browser suppressed window.open */}
        {showPopupWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 text-center font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-left">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>O navegador bloqueou a abertura automática. Clique ao lado:</span>
            </div>
            <a
              href={receiptBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir Cupom</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Print Typography & Legibility Toolbar */}
        <div className="px-4 py-2.5 bg-stone-100/90 border-b border-stone-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
              Opções de Impressão & Legibilidade
            </span>
            <span className="text-[11px] text-stone-500">
              1 Cópia • {fontSize === 'xlarge' ? 'Extra Grande' : fontSize === 'large' ? 'Grande' : 'Padrão'} • {fontFamily === 'modern' ? 'Nítida' : 'Mono'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Vias (1 Cópia única) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Copy className="w-3 h-3" /> Vias
              </label>
              <div className="flex bg-stone-200/80 rounded-lg px-2.5 py-1 text-[11px] font-bold text-stone-800 border border-stone-300/60 shadow-2xs items-center justify-center">
                1 Cópia
              </div>
            </div>

            {/* Tamanho da Letra */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase flex items-center gap-1">
                <Type className="w-3 h-3" /> Letra
              </label>
              <div className="flex bg-white rounded-lg p-0.5 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  id="modal-size-normal-btn"
                  onClick={() => handleSetFontSize('normal')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    fontSize === 'normal' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Padrão
                </button>
                <button
                  type="button"
                  id="modal-size-large-btn"
                  onClick={() => handleSetFontSize('large')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    fontSize === 'large' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Grande
                </button>
                <button
                  type="button"
                  id="modal-size-xlarge-btn"
                  onClick={() => handleSetFontSize('xlarge')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    fontSize === 'xlarge' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Extra
                </button>
              </div>
            </div>

            {/* Tipo de Letra */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase">
                Fonte
              </label>
              <div className="flex bg-white rounded-lg p-0.5 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  id="modal-font-modern-btn"
                  onClick={() => handleSetFontFamily('modern')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    fontFamily === 'modern' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Nítida
                </button>
                <button
                  type="button"
                  id="modal-font-mono-btn"
                  onClick={() => handleSetFontFamily('mono')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all font-mono ${
                    fontFamily === 'mono' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Mono
                </button>
              </div>
            </div>

            {/* Bobina */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase">
                Bobina
              </label>
              <div className="flex bg-white rounded-lg p-0.5 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  id="modal-paper-80-btn"
                  onClick={() => handleSetPaperWidth('80mm')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    paperWidth === '80mm' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  id="modal-paper-58-btn"
                  onClick={() => handleSetPaperWidth('58mm')}
                  className={`flex-1 py-1 text-[11px] rounded font-semibold transition-all ${
                    paperWidth === '58mm' 
                      ? 'bg-stone-900 text-white shadow-2xs' 
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  58mm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-4 sm:p-5 bg-stone-100 flex flex-col items-center overflow-y-auto max-h-[50vh]">
          <div 
            id="printable-receipt"
            className={`bg-white p-4 rounded-xl border border-stone-300 shadow-sm text-black space-y-3 transition-all ${
              paperWidth === '58mm' ? 'w-full max-w-[260px] print-paper-58mm' : 'w-full max-w-[340px]'
            } ${
              fontFamily === 'modern' ? 'font-sans' : 'font-mono print-font-mono'
            } ${
              fontSize === 'xlarge' 
                ? 'text-base leading-relaxed print-size-xlarge' 
                : fontSize === 'large' 
                  ? 'text-sm leading-normal print-size-large' 
                  : 'text-xs leading-normal'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-black">
              <p className={`font-black tracking-wider uppercase ${fontSize === 'xlarge' ? 'text-lg' : fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
                Eliza Sorvetes
              </p>
              <p className="text-xs font-semibold text-black">Sorvetes & Picolés Artesanais</p>
              <p className="text-[11px] font-medium text-black mt-0.5">CNPJ: 63.817.939/0001-63</p>
              <p className="text-[11px] font-bold text-black mt-0.5">Cupom Não Fiscal: {sale.id}</p>
              <p className="text-[11px] font-medium text-black">{formattedDate}</p>
              <div className="mt-2 pt-1.5 border-t border-dashed border-black text-left">
                <p className="text-xs text-black">
                  <span className="font-bold">Cliente:</span>{' '}
                  <span className="font-extrabold">{sale.customerName || 'Consumidor Final'}</span>
                </p>
                <p className="text-[11px] text-black">
                  <span>Operador(a):</span>{' '}
                  <span className="font-bold">{sale.cashierName || 'Eliza'}</span>
                </p>
              </div>
            </div>

            {/* Item list */}
            <div className="space-y-2 py-1 border-b-2 border-dashed border-black">
              <div className="font-extrabold text-[11px] tracking-wider uppercase text-black">
                Itens da Venda:
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-black">
                    <span className="pr-2">
                      <b>{item.quantity}x</b> {item.productName}
                    </span>
                    <span className="whitespace-nowrap font-black">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {item.selectedFlavors.length > 0 && (
                    <p className="text-xs text-black font-medium pl-2">
                      • Sabor: {item.selectedFlavors.join(' + ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Details */}
            <div className="space-y-1.5 pt-1 text-black">
              <div className="flex justify-between text-xs font-semibold">
                <span>Subtotal:</span>
                <span>R$ {sale.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className={`flex justify-between font-black border-y-2 border-black py-1.5 my-1 ${
                fontSize === 'xlarge' ? 'text-lg' : fontSize === 'large' ? 'text-base' : 'text-sm'
              }`}>
                <span>TOTAL:</span>
                <span>R$ {sale.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Pagamento:</span>
                <span className="font-extrabold">{getPaymentName(sale.paymentMethod)}</span>
              </div>

              {sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined && (
                <>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Valor Recebido:</span>
                    <span>R$ {sale.amountReceived.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-xs bg-stone-100 border border-black/30 px-2 py-1 rounded">
                    <span>Troco:</span>
                    <span className="font-black">R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer note */}
            <div className="text-center pt-2 text-xs font-bold text-black border-t border-dashed border-black">
              <div>Obrigado pela preferência!</div>
              <div className="font-extrabold mt-0.5">Volte Sempre!</div>
            </div>
          </div>

          {/* Quick utility actions row: Copiar Cupom, Abrir em Nova Aba, Baixar TXT */}
          <div className="mt-3 flex items-center justify-between gap-1.5 text-stone-500">
            <button
              type="button"
              id="copy-receipt-btn"
              onClick={handleCopyReceipt}
              className={`flex-1 py-2 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold' 
                  : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600'
              }`}
              title="Copiar texto para enviar no WhatsApp ou colar no computador"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar (WhatsApp)'}</span>
            </button>

            {/* Direct unblockable HTML Anchor link for New Tab Print */}
            <a
              id="open-tab-receipt-btn"
              href={receiptBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-medium text-stone-600 flex items-center gap-1 transition-colors cursor-pointer"
              title="Abrir cupom térmico em nova aba limpa para imprimir"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Nova Aba</span>
            </a>

            <button
              type="button"
              id="download-receipt-btn"
              onClick={handleDownloadTxt}
              className="py-2 px-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-medium text-stone-600 flex items-center gap-1 transition-colors cursor-pointer"
              title="Baixar comprovante como arquivo .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.txt</span>
            </button>

            {/* Cancel / Delete Sale Button */}
            <button
              type="button"
              id="cancel-sale-from-receipt-btn"
              onClick={() => setShowCancelConfirm(true)}
              className="py-2 px-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Cancelar ou excluir esta venda e devolver itens ao estoque"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Cancelar Venda</span>
            </button>
          </div>

          {/* Inline Cancel Confirmation Box */}
          {showCancelConfirm && (
            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-950">
                  <p className="font-bold">Deseja cancelar esta venda ({sale.id})?</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    A venda será excluída do faturamento e todos os itens serão devolvidos ao estoque automaticamente.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-medium text-xs cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  id="confirm-cancel-sale-btn"
                  onClick={handleConfirmCancelSale}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Cancelar Venda</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Primary Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center gap-2.5">
          {/* If in iframe, render as a direct unblockable anchor tag so popup blockers never interfere! */}
          {isInIframe ? (
            <a
              id="print-receipt-btn"
              href={receiptBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-[0.99] text-center"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom (1 Cópia)</span>
            </a>
          ) : (
            <button
              type="button"
              id="print-receipt-btn"
              onClick={handlePrint}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom (1 Cópia)</span>
            </button>
          )}

          <button
            type="button"
            id="new-sale-btn"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Portal dedicated 1-page receipt directly into #print-root for isolated, single-page print */}
      {typeof document !== 'undefined' && document.getElementById('print-root') && createPortal(
        <div 
          className={`pos-receipt-print ${paperWidth === '58mm' ? 'print-paper-58mm' : ''} ${
            fontFamily === 'modern' ? 'font-sans' : 'print-font-mono font-mono'
          } ${
            fontSize === 'xlarge' ? 'print-size-xlarge' : fontSize === 'large' ? 'print-size-large' : ''
          }`}
        >
          {/* Store Header */}
          <div className="text-center pb-2 border-b-2 border-dashed border-black">
            <p className="font-black text-sm tracking-wider uppercase">
              Eliza Sorvetes
            </p>
            <p className="text-xs font-semibold text-black">Sorvetes & Picolés Artesanais</p>
            <p className="text-[11px] font-medium text-black mt-0.5">CNPJ: 63.817.939/0001-63</p>
            <p className="text-[11px] font-bold text-black mt-0.5">Cupom Não Fiscal: {sale.id}</p>
            <p className="text-[11px] font-medium text-black">{formattedDate}</p>
            <div className="mt-1.5 pt-1.5 border-t border-dashed border-black text-left">
              <p className="text-xs text-black">
                <span className="font-bold">Cliente:</span>{' '}
                <span className="font-extrabold">{sale.customerName || 'Consumidor Final'}</span>
              </p>
              <p className="text-[11px] text-black">
                <span>Operador(a):</span>{' '}
                <span className="font-bold">{sale.cashierName || 'Eliza'}</span>
              </p>
            </div>
          </div>

          {/* Item list */}
          <div className="space-y-1.5 py-2 border-b-2 border-dashed border-black">
            <div className="font-extrabold text-[11px] tracking-wider uppercase text-black">
              Itens da Venda:
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-black">
                  <span className="pr-2">
                    <b>{item.quantity}x</b> {item.productName}
                  </span>
                  <span className="whitespace-nowrap font-black">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                {item.selectedFlavors.length > 0 && (
                  <p className="text-xs text-black font-medium pl-2">
                    • Sabor: {item.selectedFlavors.join(' + ')}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Financial Details */}
          <div className="space-y-1.5 pt-2 text-black">
            <div className="flex justify-between text-xs font-semibold">
              <span>Subtotal:</span>
              <span>R$ {sale.subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between font-black border-y-2 border-black py-1.5 my-1 text-sm">
              <span>TOTAL:</span>
              <span>R$ {sale.total.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Pagamento:</span>
              <span className="font-extrabold">{getPaymentName(sale.paymentMethod)}</span>
            </div>

            {sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined && (
              <>
                <div className="flex justify-between text-xs font-semibold">
                  <span>Valor Recebido:</span>
                  <span>R$ {sale.amountReceived.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs border border-black/40 px-2 py-1">
                  <span>Troco:</span>
                  <span className="font-black">R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 text-xs font-bold text-black border-t border-dashed border-black mt-2">
            <div>Obrigado pela preferência!</div>
            <div className="font-extrabold mt-0.5">Volte Sempre!</div>
          </div>
        </div>,
        document.getElementById('print-root')!
      )}
    </div>
  );
};
