import React, { useState, useMemo, useEffect } from 'react';
import { Sale } from '../../types';
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
  AlertCircle
} from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const [copied, setCopied] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [showPopupWarning, setShowPopupWarning] = useState<boolean>(false);

  // Check if app is running inside a preview iframe
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const formattedDate = new Date(sale.timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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

  const generateReceiptHtml = () => {
    const customer = sale.customerName?.trim() || 'Consumidor Final';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cupom - ${sale.id} - Eliza Sorvetes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.35;
      color: #000;
      background: #f5f5f4;
      padding: 16px;
    }
    .action-bar {
      max-width: 80mm;
      margin: 0 auto 12px auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .print-main-btn {
      background: #0f766e;
      color: #ffffff;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .print-main-btn:hover {
      background: #115e59;
    }
    .close-btn {
      background: #e7e5e4;
      color: #44403c;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
    }
    .ticket-card {
      width: 78mm;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      padding: 16px 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border-radius: 4px;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .dashed-line {
      border-bottom: 1px dashed #000;
      margin: 8px 0;
    }
    .double-line {
      border-bottom: 2px solid #000;
      margin: 8px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .store-title {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0.5px;
      font-family: Arial, Helvetica, sans-serif;
    }
    .store-sub {
      font-size: 11px;
    }
    .item-flavors {
      font-size: 11px;
      font-style: italic;
      padding-left: 8px;
      margin-bottom: 4px;
    }
    .total-row {
      font-size: 15px;
      font-weight: bold;
      margin: 6px 0;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 12px;
    }
    @media print {
      body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .action-bar, .no-print {
        display: none !important;
      }
      .ticket-card {
        width: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 4px 0 !important;
      }
      @page {
        size: 80mm auto;
        margin: 2mm;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <button class="print-main-btn" onclick="window.print()">
      🖨️ Imprimir Cupom Térmico
    </button>
    <button class="close-btn" onclick="window.close()">
      ✕ Fechar Aba
    </button>
  </div>

  <div class="ticket-card">
    <div class="text-center">
      <div class="store-title">ELIZA SORVETES</div>
      <div class="store-sub">Sorvetes & Picolés Artesanais</div>
      <div class="store-sub">CNPJ: 63.817.939/0001-63</div>
      <div class="store-sub">Cupom Não Fiscal: ${sale.id}</div>
      <div class="store-sub">${formattedDate}</div>
    </div>

    <div class="dashed-line"></div>

    <div>
      <div class="row">
        <span class="bold">CLIENTE:</span>
        <span>${customer}</span>
      </div>
      <div class="row">
        <span>Operador(a):</span>
        <span>${sale.cashierName || 'Eliza'}</span>
      </div>
    </div>

    <div class="dashed-line"></div>

    <div class="bold" style="margin-bottom: 4px;">ITENS DA VENDA:</div>
    <div>
      ${sale.items.map((item) => `
        <div class="row">
          <span><b>${item.quantity}x</b> ${item.productName}</span>
          <span>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
        </div>
        ${item.selectedFlavors.length > 0 ? `
          <div class="item-flavors">Sabor: ${item.selectedFlavors.join(' + ')}</div>
        ` : ''}
      `).join('')}
    </div>

    <div class="dashed-line"></div>

    <div>
      <div class="row">
        <span>Subtotal:</span>
        <span>R$ ${sale.subtotal.toFixed(2).replace('.', ',')}</span>
      </div>
      <div class="row total-row">
        <span>TOTAL:</span>
        <span>R$ ${sale.total.toFixed(2).replace('.', ',')}</span>
      </div>
      <div class="row">
        <span>Forma Pagamento:</span>
        <span class="bold">${getPaymentName(sale.paymentMethod)}</span>
      </div>
      ${sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined ? `
        <div class="row">
          <span>Valor Recebido:</span>
          <span>R$ ${sale.amountReceived.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="row bold">
          <span>Troco Devolvido:</span>
          <span>R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}</span>
        </div>
      ` : ''}
    </div>

    <div class="dashed-line"></div>

    <div class="footer">
      <div>Obrigado pela preferência!</div>
      <div class="bold">Volte Sempre!</div>
    </div>
  </div>

  <script>
    // Dispara a caixa de impressão assim que carregar
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.warn('Auto-print blocked', e);
        }
      }, 300);
    });
  </script>
</body>
</html>`;
  };

  // Generate Blob URL for instant, unblockable navigation & printing
  const receiptBlobUrl = useMemo(() => {
    try {
      const html = generateReceiptHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Error generating receipt blob url', e);
      return '';
    }
  }, [sale]);

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

        {/* Printable Receipt Paper Container */}
        <div className="p-4 sm:p-5 bg-stone-50 overflow-y-auto max-h-[50vh]">
          <div 
            id="printable-receipt"
            className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs font-mono text-xs text-stone-700 space-y-3"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-300">
              <p className="font-bold text-sm tracking-wider uppercase font-sans">Eliza Sorvetes</p>
              <p className="text-[10px] text-stone-500 font-sans">Sorvetes & Picolés Artesanais</p>
              <p className="text-[10px] text-stone-400 mt-1 font-mono">CNPJ: 63.817.939/0001-63</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Cupom Não Fiscal: {sale.id}</p>
              <p className="text-[10px] text-stone-400">{formattedDate}</p>
              <div className="mt-2 pt-1.5 border-t border-dashed border-stone-200 text-left">
                <p className="text-[11px] font-sans text-stone-700">
                  <span className="font-semibold text-stone-500">Cliente:</span>{' '}
                  <span className="font-bold text-stone-800">{sale.customerName || 'Consumidor Final'}</span>
                </p>
              </div>
            </div>

            {/* Item list */}
            <div className="space-y-2 py-1 border-b border-dashed border-stone-300">
              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                  {item.selectedFlavors.length > 0 && (
                    <p className="text-[10px] text-stone-500 italic pl-2">
                      Sabor: {item.selectedFlavors.join(' + ')}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Details */}
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {sale.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-stone-200">
                <span>TOTAL:</span>
                <span>R$ {sale.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between pt-1 text-stone-600">
                <span>Pagamento:</span>
                <span className="font-semibold">{getPaymentName(sale.paymentMethod)}</span>
              </div>

              {sale.paymentMethod === 'dinheiro' && sale.amountReceived !== undefined && (
                <>
                  <div className="flex justify-between text-stone-600">
                    <span>Valor Recebido:</span>
                    <span>R$ {sale.amountReceived.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <span>Troco:</span>
                    <span>R$ ${(sale.change || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer note */}
            <div className="text-center pt-2 text-[10px] text-stone-400 font-sans">
              Obrigado pela preferência! Volte sempre!
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
          </div>
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
              <span>Imprimir Cupom (Térmica)</span>
            </a>
          ) : (
            <button
              type="button"
              id="print-receipt-btn"
              onClick={handlePrint}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom</span>
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
    </div>
  );
};
