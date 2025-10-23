import { UserRole } from "../../../models/interfaces/Notification.interface";

export const generatePasswordResetTemplate = (
  resetToken: string,
  name?: string
): string => {
  const resetLink = `${
    process.env.FRONTEND_URL || "https://beautytime.com"
  }/reset-password?token=${resetToken}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0; 
          padding: 20px; 
          min-height: 100vh;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 15px; 
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
        }
        .header { 
          text-align: center; 
          padding: 40px 30px; 
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white; 
        }
        .logo { 
          font-size: 32px; 
          font-weight: bold; 
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .title { 
          margin: 15px 0 0 0; 
          font-size: 24px; 
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
          color: #374151;
          line-height: 1.6;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #6B7280; 
          font-size: 14px; 
          border-top: 1px solid #E5E7EB; 
          padding: 25px 30px;
          background: #f9fafb;
        }
        .button {
          display: inline-block;
          background: #EF4444;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #DC2626;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
        }
        .info-box {
          background: #FEF2F2;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          border-left: 4px solid #EF4444;
        }
        .warning {
          background: #FEF3C7;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #F59E0B;
        }
        @media (max-width: 600px) {
          body { padding: 10px; }
          .container { border-radius: 10px; }
          .header { padding: 30px 20px; }
          .content { padding: 30px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛡️ BeautyTime</div>
          <h1 class="title">Redefinição de Senha</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #374151;">Olá <strong>${
            name || "usuário"
          }</strong>,</p>
          
          <p style="color: #6B7280; margin-bottom: 25px;">
            Detectamos uma solicitação de redefinição de senha para sua conta BeautyTime.
            Se você não solicitou esta ação, por favor ignore este email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" class="button">
              🔒 Redefinir Senha
            </a>
          </div>
          
          <div class="info-box">
            <h3 style="margin: 0 0 10px 0; color: #374151;">🛡️ Informações de Segurança</h3>
            <p style="margin: 8px 0; color: #6B7280;">
              <strong>⏰ Link expira em:</strong> 1 hora
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
              <strong>📧 Solicitado por:</strong> ${name || "Usuário"}
            </p>
            <p style="margin: 8px 0; color: #6B7280;">
              <strong>🕒 Data/hora:</strong> ${new Date().toLocaleString(
                "pt-BR"
              )}
            </p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Atenção:</strong> 
            Se você não reconhece esta atividade, entre em contato conosco imediatamente!
          </div>
          
          <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 20px;">
            Ou copie e cole este link no seu navegador:<br>
            <code style="background: #F3F4F6; padding: 8px 12px; border-radius: 6px; font-size: 12px; word-break: break-all;">
              ${resetLink}
            </code>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>© 2024 BeautyTime Platform</strong></p>
          <p>Email: ${process.env.SMTP_USER || "contato@beautytime.com"}</p>
          <p>Desenvolvido por Edilson Mutisse</p>
          <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
            Este é um email automático de segurança. Não responda a este email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateSecurityAlertTemplate = (
  name?: string,
  alertData?: any
): string => {
  const alertType = alertData?.type || "atividade suspeita";
  const alertMessage =
    alertData?.message || "Detectamos uma atividade incomum na sua conta.";
  const actionRequired =
    alertData?.actionRequired || "Verifique sua conta imediatamente.";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0; 
          padding: 20px; 
          min-height: 100vh;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          border-radius: 15px; 
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
        }
        .header { 
          text-align: center; 
          padding: 40px 30px; 
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: white; 
        }
        .logo { 
          font-size: 32px; 
          font-weight: bold; 
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .title { 
          margin: 15px 0 0 0; 
          font-size: 24px; 
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
          color: #374151;
          line-height: 1.6;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #6B7280; 
          font-size: 14px; 
          border-top: 1px solid #E5E7EB; 
          padding: 25px 30px;
          background: #f9fafb;
        }
        .alert-box {
          background: #FEF3C7;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          border-left: 4px solid #F59E0B;
        }
        .action-box {
          background: #FEF2F2;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          border-left: 4px solid #EF4444;
        }
        .button {
          display: inline-block;
          background: #F59E0B;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #D97706;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(245, 158, 11, 0.3);
        }
        @media (max-width: 600px) {
          body { padding: 10px; }
          .container { border-radius: 10px; }
          .header { padding: 30px 20px; }
          .content { padding: 30px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚨 BeautyTime</div>
          <h1 class="title">Alerta de Segurança</h1>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #374151;">Olá <strong>${
            name || "usuário"
          }</strong>,</p>
          
          <div class="alert-box">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">⚠️ ${alertType.toUpperCase()}</h3>
            <p style="color: #92400e; margin: 0;">${alertMessage}</p>
          </div>
          
          <div class="action-box">
            <h4 style="margin: 0 0 10px 0; color: #DC2626;">🛡️ Ação Requerida</h4>
            <p style="color: #DC2626; margin: 0;">${actionRequired}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.FRONTEND_URL || "https://beautytime.com"
            }/security" class="button">
              🔒 Verificar Minha Conta
            </a>
          </div>
          
          <div style="background: #F3F4F6; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">💡 O que fazer agora:</h4>
            <ul style="color: #6B7280; padding-left: 20px;">
              <li>Verifique suas atividades recentes</li>
              <li>Altere sua senha se necessário</li>
              <li>Revise dispositivos conectados</li>
              <li>Entre em contato conosco se houver dúvidas</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>© 2024 BeautyTime Platform</strong></p>
          <p>Email: ${process.env.SMTP_USER || "contato@beautytime.com"}</p>
          <p>Desenvolvido por Edilson Mutisse</p>
          <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
            Este é um email automático de segurança. Não responda a este email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
