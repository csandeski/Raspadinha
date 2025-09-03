import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface WithdrawalReceiptData {
  id: string | number;
  amount: string;
  netAmount?: string;
  fee?: string;
  pixKey: string;
  pixKeyType: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  endToEndId?: string;
  type?: 'player' | 'affiliate';
}

export async function generateWithdrawalReceipt(data: WithdrawalReceiptData) {
  // Format currency
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", 
                   "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day} de ${month} de ${year} às ${hours}:${minutes}:${seconds}`;
  };

  // Format PIX key
  const formatPixKey = (key: string, type: string) => {
    if (!key) return "---";
    
    switch (type.toLowerCase()) {
      case "cpf":
        if (key.length === 11) {
          return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        return key;
      case "cnpj":
        if (key.length === 14) {
          return key.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        }
        return key;
      case "telefone":
      case "phone":
        return key.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      case "email":
      case "e-mail":
        return key.toLowerCase();
      default:
        return key;
    }
  };

  // Create a beautiful HTML receipt matching admin's design
  const receiptContainer = document.createElement('div');
  receiptContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 672px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  receiptContainer.innerHTML = `
    <div style="background: linear-gradient(to bottom right, rgb(24, 24, 27), rgb(0, 0, 0), rgb(24, 24, 27)); padding: 32px; color: white; min-height: 900px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgb(39, 39, 42);">
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(to bottom right, rgb(34, 197, 94), rgb(22, 163, 74)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Comprovante de Transferência PIX</h2>
        <p style="color: rgb(161, 161, 170);">Transação realizada com sucesso</p>
      </div>

      <!-- Amount -->
      <div style="background: rgba(39, 39, 42, 0.5); border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 12px; color: rgb(161, 161, 170); margin-bottom: 4px;">Valor da Transferência</p>
        <p style="font-size: 30px; font-weight: bold; color: rgb(74, 222, 128);">
          ${formatCurrency(data.amount)}
        </p>
      </div>

      <!-- Transaction Info -->
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
        <div style="background: rgba(39, 39, 42, 0.3); border-radius: 8px; padding: 16px;">
          <p style="font-size: 11px; color: rgb(161, 161, 170); margin-bottom: 4px;">Identificação</p>
          <p style="font-size: 14px; font-family: monospace; word-break: break-all;">
            ${data.endToEndId || "---"}
          </p>
        </div>

        <div style="background: rgba(39, 39, 42, 0.3); border-radius: 8px; padding: 16px;">
          <p style="font-size: 11px; color: rgb(161, 161, 170); margin-bottom: 4px;">Data e Hora do Pagamento</p>
          <p style="font-size: 14px;">
            ${data.processedAt ? formatDate(data.processedAt) : "---"}
          </p>
        </div>
      </div>

      <!-- Origin -->
      <div style="border-top: 1px solid rgb(39, 39, 42); padding-top: 16px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: rgb(212, 212, 216); margin-bottom: 12px;">Dados do Pagador</h3>
        <div style="background: rgba(39, 39, 42, 0.3); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: rgb(161, 161, 170);">Nome/Razão Social:</span>
            <span style="font-size: 14px; font-weight: 500;">Mania Brasil</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 11px; color: rgb(161, 161, 170);">CNPJ:</span>
            <span style="font-size: 14px; font-family: monospace;">62.134.421/0001-62</span>
          </div>
        </div>
      </div>

      <!-- Destination -->
      <div style="border-top: 1px solid rgb(39, 39, 42); padding-top: 16px; margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: rgb(212, 212, 216); margin-bottom: 12px;">Dados do Recebedor</h3>
        <div style="background: rgba(39, 39, 42, 0.3); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: rgb(161, 161, 170);">Tipo de Chave:</span>
            <span style="font-size: 14px; text-transform: uppercase;">${data.pixKeyType}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 11px; color: rgb(161, 161, 170);">Chave PIX:</span>
            <span style="font-size: 14px; word-break: break-all;">
              ${formatPixKey(data.pixKey, data.pixKeyType)}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid rgb(39, 39, 42); padding-top: 24px; margin-top: 24px;">
        <div style="text-align: center;">
          <p style="font-size: 11px; color: rgb(113, 113, 122); margin-bottom: 4px;">
            Este comprovante é válido como recibo de transferência PIX
          </p>
          <p style="font-size: 11px; color: rgb(113, 113, 122); margin-bottom: 16px;">
            Guarde este comprovante para sua segurança
          </p>
          <div style="padding-top: 16px;">
            <p style="font-size: 11px; color: rgb(82, 82, 91);">
              © 2025 Mania Brasil - Todos os direitos reservados
            </p>
            <p style="font-size: 11px; color: rgb(82, 82, 91);">
              CNPJ: 62.134.421/0001-62
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add to document temporarily
  document.body.appendChild(receiptContainer);

  try {
    // Capture the receipt as canvas
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      backgroundColor: "#000000",
      logging: false,
      useCORS: true,
    });

    // Create PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    
    // Save the PDF
    const fileName = `comprovante_saque_${data.id}_${Date.now()}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    // Remove the temporary element
    document.body.removeChild(receiptContainer);
  }
}
