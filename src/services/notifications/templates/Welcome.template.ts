import { UserRole } from "../../../models/interfaces/Notification.interface";

export const generateWelcomeTemplate = (userRole: UserRole, userData: any): string => {
  const { name, salonName, employeeCode } = userData;
  const roleContent = getRoleSpecificContent(userRole, userData);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #10B981, #059669); padding: 40px; border-radius: 10px 10px 0 0; color: white; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 20px 0; }
        .cta-button { 
          display: inline-block; 
          background: #8B5CF6; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold;
          margin: 20px 0;
        }
        .steps { margin: 30px 0; }
        .step { 
          background: #F8FAFC; 
          padding: 15px; 
          margin: 10px 0; 
          border-radius: 8px;
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
          <div class="logo">🎉 BeautyTime</div>
          <h1 style="margin: 10px 0 0 0; font-size: 28px;">Bem-vindo ao BeautyTime!</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Sua jornada de beleza começa aqui</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #374151;">Olá <strong>${name || 'usuário'}</strong>,</p>
          
          <p style="color: #6B7280; line-height: 1.6; font-size: 16px;">
            Estamos muito felizes em ter você na nossa plataforma! 
            Sua conta <strong>${getRoleDisplayName(userRole)}</strong> foi criada com sucesso.
          </p>

          ${roleContent}

          <div class="steps">
            <h3 style="color: #374151; margin-bottom: 15px;">🎯 Primeiros Passos:</h3>
            
            ${getRoleSteps(userRole)}
          </div>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL || 'https://beautytime.com'}" class="cta-button">
              🔥 Começar a Usar
            </a>
          </div>

          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>💡 Dica:</strong> Baixe nosso app móvel para uma experiência ainda melhor!
          </div>
        </div>
        
        <div class="footer">
          <p>© 2024 BeautyTime. Todos os direitos reservados.</p>
          <p>Suporte: ${process.env.SMTP_USER} | Desenvolvido por Edilson Mutisse</p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 10px;">
            Este é um email automático, por favor não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getRoleDisplayName = (userRole: UserRole): string => {
  switch (userRole) {
    case UserRole.ADMIN_SYSTEM: return 'Administrador do Sistema';
    case UserRole.SALON_OWNER: return 'Proprietário de Salão';
    case UserRole.EMPLOYEE: return 'Profissional';
    case UserRole.CLIENT: return 'Cliente';
    default: return 'Usuário';
  }
};

const getRoleSpecificContent = (userRole: UserRole, userData: any): string => {
  switch (userRole) {
    case UserRole.SALON_OWNER:
      return `
        <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1E40AF;">💼 Configuração do Seu Salão</h4>
          <p style="margin: 5px 0; color: #374151;">Agora você pode:</p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Adicionar serviços e preços</li>
            <li>Convidar profissionais</li>
            <li>Configurar horários de funcionamento</li>
            <li>Visualizar relatórios financeiros</li>
          </ul>
        </div>
      `;
    
    case UserRole.EMPLOYEE:
      return `
        <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #065F46;">✂️ Painel do Profissional</h4>
          <p style="margin: 5px 0; color: #374151;">
            ${userData.employeeCode ? `Seu código de profissional: <strong>${userData.employeeCode}</strong>` : 'Sua conta de profissional está ativa!'}
          </p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Visualizar sua agenda</li>
            <li>Gerenciar seus serviços</li>
            <li>Acompanhar seus rendimentos</li>
            <li>Receber notificações de agendamentos</li>
          </ul>
        </div>
      `;
    
    case UserRole.CLIENT:
      return `
        <div style="background: #FEF7CD; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #854D0E;">💅 Serviços de Beleza</h4>
          <p style="margin: 5px 0; color: #374151;">Descubra uma variedade de serviços:</p>
          <ul style="color: #374151; margin: 10px 0;">
            <li>Agendamento online 24/7</li>
            <li>Lembretes automáticos</li>
            <li>Avaliações de profissionais</li>
            <li>Promoções exclusivas</li>
          </ul>
        </div>
      `;
    
    default:
      return '';
  }
};

const getRoleSteps = (userRole: UserRole): string => {
  const steps = {
    [UserRole.CLIENT]: [
      'Complete seu perfil com suas preferências',
      'Explore serviços e profissionais disponíveis',
      'Faça seu primeiro agendamento',
      'Avalie sua experiência'
    ],
    [UserRole.EMPLOYEE]: [
      'Complete seu perfil profissional',
      'Defina seus serviços e preços',
      'Configure sua disponibilidade',
      'Comece a receber agendamentos'
    ],
    [UserRole.SALON_OWNER]: [
      'Configure as informações do seu salão',
      'Adicione serviços ao seu catálogo',
      'Convide profissionais para sua equipe',
      'Defina horários de funcionamento'
    ],
    [UserRole.ADMIN_SYSTEM]: [
      'Revise as configurações do sistema',
      'Monitore o desempenho da plataforma',
      'Gerencie usuários e permissões',
      'Acompanhe métricas importantes'
    ]
  };

  const userSteps = steps[userRole] || steps[UserRole.CLIENT];

  return userSteps.map(step => `
    <div class="step">
      <strong>${step}</strong>
    </div>
  `).join('');
};