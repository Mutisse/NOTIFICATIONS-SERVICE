import { UserRole } from "../../../models/interfaces/Notification.interface";

export const generatePasswordResetTemplate = (resetToken: string, name?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #EF4444, #DC2626); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .reset-button { 
          display: inline-block; 
          background: #EF4444; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold;
          margin: 20px 0;
        }
        .warning { 
          background: #FEF3C7; 
          border-left: 4px solid #F59E0B; 
          padding: 15px; 
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #6B7280; 
          font-size: 14px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛡️ BeautyTime</div>
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">Redefinição de Senha</h1>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Olá <strong>${name || 'usuário'}</strong>,</p>
        
        <p style="color: #6B7280; line-height: 1.6;">
          Recebemos uma solicitação para redefinir a senha da sua conta BeautyTime. 
          Clique no botão abaixo para criar uma nova senha:
        </p>
        
        <div style="text-align: center;">
          <a href="${process.env.APP_URL || 'https://beautytime.com'}/reset-password?token=${resetToken}" class="reset-button">
            🔐 Redefinir Senha
          </a>
        </div>
        
        <p style="color: #6B7280; text-align: center;">
          Este link expira em <strong style="color: #EF4444;">1 hora</strong>.
        </p>
        
        <div class="warning">
          <strong>⚠️ Segurança:</strong> 
          Se não foi você que solicitou esta redefinição, ignore este email e verifique 
          a segurança da sua conta. Sua senha atual continuará funcionando.
        </div>
        
        <p style="color: #9CA3AF; font-size: 14px;">
          Dica de segurança: Use senhas fortes e únicas para cada serviço.
        </p>
        
        <div class="footer">
          <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
          <p>Suporte: ${process.env.SMTP_USER} | Desenvolvido por Edilson Mutisse</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateAppointmentReminderTemplate = (appointmentData: any): string => {
  const { name, service, date, time, professional, location } = appointmentData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #8B5CF6, #7C3AED); padding: 30px; border-radius: 10px 10px 0 0; color: white; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .appointment-details { 
          background: #F8FAFC; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0;
          border-left: 4px solid #8B5CF6;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #6B7280; 
          font-size: 14px;
          border-top: 1px solid #E5E7EB;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⏰ BeautyTime</div>
          <h1 style="margin: 10px 0 0 0; font-size: 24px;">Lembrete de Agendamento</h1>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Olá <strong>${name}</strong>,</p>
        
        <p style="color: #6B7280; line-height: 1.6;">
          Este é um lembrete do seu agendamento no BeautyTime. 
          Esperamos por você!
        </p>
        
        <div class="appointment-details">
          <h3 style="margin: 0 0 15px 0; color: #374151;">📅 Detalhes do Agendamento</h3>
          <p style="margin: 8px 0; color: #6B7280;"><strong>Serviço:</strong> ${service}</p>
          <p style="margin: 8px 0; color: #6B7280;"><strong>Data:</strong> ${date}</p>
          <p style="margin: 8px 0; color: #6B7280;"><strong>Horário:</strong> ${time}</p>
          <p style="margin: 8px 0; color: #6B7280;"><strong>Profissional:</strong> ${professional}</p>
          ${location ? `<p style="margin: 8px 0; color: #6B7280;"><strong>Local:</strong> ${location}</p>` : ''}
        </div>
        
        <p style="color: #6B7280;">
          <strong>💡 Lembrete:</strong> Chegue com 10 minutos de antecedência. 
          Cancelamentos devem ser feitos com pelo menos 2 horas de antecedência.
        </p>
        
        <div style="background: #F0FDF4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>📱 Gerenciar Agendamento:</strong> 
          Acesse nosso app ou site para ver detalhes, remarcar ou cancelar.
        </div>
        
        <div class="footer">
          <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
          <p>Email: ${process.env.SMTP_USER} | Desenvolvido por Edilson Mutisse</p>
        </div>
      </div>
    </body>
    </html>
  `;
};