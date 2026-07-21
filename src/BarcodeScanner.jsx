import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

/**
 * Componente para leitura de códigos de barras via câmera.
 * @param {function} onScan - Callback chamado quando um código é lido com sucesso. Recebe o código (string).
 * @param {function} onError - Callback chamado em caso de erro ao acessar a câmera.
 * @param {function} onClose - Callback para fechar o modal (chamado quando o usuário clica em "Fechar" ou similar).
 */
export default function BarcodeScanner({ onScan, onError, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    // Cria uma instância do leitor de códigos de barras
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startScanner = async () => {
      try {
        const videoInput = videoRef.current;
        if (!videoInput) {
          console.warn('Elemento de vídeo não encontrado.');
          return;
        }

        // Inicia a decodificação contínua do feed de vídeo
        // O primeiro parâmetro null indica que queremos usar a câmera padrão
        // O segundo parâmetro é o elemento de vídeo onde o feed será exibido
        // O terceiro é a função callback que processa cada quadro
        await reader.decodeFromVideoDevice(null, videoInput, (result, err) => {
          if (result) {
            const code = result.getText();
            if (code) {
              // Chama o callback com o código lido
              onScan(code);
            }
          }
          // Ignora erros de "no barcode found" para não poluir o console
          // Esses erros são comuns e não indicam um problema real
          if (err && !(err instanceof Error)) {
            // Silenciosamente ignora
          }
        });
      } catch (error) {
        console.error('Erro ao iniciar o scanner:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    startScanner();

    // Cleanup: para o scanner quando o componente for desmontado
    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (e) {
          // Ignora erros no reset
        }
        readerRef.current = null;
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Elemento de vídeo onde a câmera será exibida */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
      />
      
      {/* Overlay visual para ajudar o usuário a posicionar o código */}
      <div 
        className="absolute inset-0 border-4 border-blue-500 pointer-events-none rounded-lg"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.3)' }}
      />
      
      {/* Linhas guia no centro (estilo "quadro de leitura") */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-4/5 h-1/2 border-2 border-blue-400/50 rounded-lg"></div>
      </div>
      
      {/* Instrução para o usuário */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="bg-black/70 text-white text-xs font-medium py-2 px-4 rounded-full mx-4 inline-block">
          📷 Posicione o código de barras no centro
        </div>
      </div>
      
      {/* Botão de cancelar (opcional, pode ser usado pelo modal pai) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          aria-label="Fechar scanner"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
