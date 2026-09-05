import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  X, 
  Check, 
  Copy, 
  User, 
  Sparkles, 
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface PixModalProps {
  isOpen: boolean;
  amount: number;
  customerName: string;
  onConfirmPix: () => void;
  onClose: () => void;
}

export const PixModal: React.FC<PixModalProps> = ({
  isOpen,
  amount,
  customerName,
  onConfirmPix,
  onClose
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const formattedAmount = amount.toFixed(2).replace('.', ',');
  const displayCustomer = customerName.trim() || 'Consumidor Final';

  // Pix key data
  const pixKey = '63.817.939/0001-63';
  const pixPayload = `00020126580014br.gov.bcb.pix011463817939000163520400005303986540${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}5802BR5914ELIZA SORVETES6009SAO PAULO62070503***6304`;

  useEffect(() => {
    if (isOpen && amount > 0) {
      QRCode.toDataURL(pixPayload, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#0f766e', // Deep Teal / Pix color
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen, amount, pixPayload]);

  if (!isOpen) return null;

  const handleCopyPixCode = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pixPayload);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = pixPayload;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy Pix payload', e);
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      onConfirmPix();
      setIsConfirming(false);
    }, 300);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-teal-100 flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-5 py-4 text-white relative">
          <button
            id="close-pix-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <QrCode className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Quicksand',sans-serif] leading-tight">
                Pagamento via Pix
              </h3>
              <p className="text-xs text-teal-100">
                Apresente o QR Code ao cliente
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Amount and Customer Card */}
          <div className="flex items-center justify-between p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl">
            <div>
              <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider block">
                Valor a Receber
              </span>
              <span className="text-2xl font-extrabold text-teal-900 font-mono">
                R$ {formattedAmount}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block">
                Cliente
              </span>
              <div className="inline-flex items-center gap-1 font-bold text-stone-800 text-xs sm:text-sm bg-white/80 px-2.5 py-1 rounded-xl border border-teal-200 max-w-[170px] truncate">
                <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{displayCustomer}</span>
              </div>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-stone-50 rounded-2xl border border-stone-200 relative">
            {qrCodeDataUrl ? (
              <div className="relative p-2 bg-white rounded-2xl shadow-sm border border-stone-200/80">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code Pix"
                  className="w-40 h-40 sm:w-52 sm:h-52 object-contain rounded-xl" 
                />
                {/* Center Pix Logo Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center text-teal-600">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            )}

            {/* Merchant Details Pill */}
            <div className="mt-2.5 sm:mt-3 text-center text-xs space-y-0.5">
              <p className="font-bold text-stone-800 text-xs sm:text-sm">Eliza Sorvetes</p>
              <p className="text-[10px] sm:text-[11px] font-mono text-stone-500">CNPJ: {pixKey}</p>
            </div>
          </div>

          {/* Copia e Cola / Key Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-600">Código Pix Copia e Cola:</span>
              <span className="text-[11px] text-teal-700 font-medium">Chave CNPJ</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pixPayload}
                className="flex-1 px-3 py-2 text-[11px] font-mono bg-stone-100 text-stone-600 border border-stone-200 rounded-xl focus:outline-none select-all truncate"
              />
              <button
                type="button"
                id="copy-pix-payload-btn"
                onClick={handleCopyPixCode}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Awaiting Payment Status Alert */}
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping mt-1.5 shrink-0" />
            <div>
              <span className="font-semibold block">Aguardando confirmação do cliente</span>
              <span className="text-[11px] text-amber-800">
                Peça ao cliente para ler o código no aplicativo do banco. Assim que o pagamento for realizado, clique no botão verde abaixo para gerar a notinha.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            id="cancel-pix-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-stone-300 hover:bg-stone-200/70 text-stone-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar / Cancelar</span>
          </button>

          {/* The primary button requested by user: Pix Realizado */}
          <button
            type="button"
            id="confirm-pix-done-btn"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {isConfirming ? (
              <span>Confirmando pagamento...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Pix Realizado (Gerar Notinha)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
