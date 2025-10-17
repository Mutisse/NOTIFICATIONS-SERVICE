import { Router } from "express";

const router = Router();

// ✅ ROTAS INTERNAS SIMPLIFICADAS (para testes)
router.post('/notifications/otp', async (req, res) => {
  try {
    const { email, otpCode, name, purpose } = req.body;
    
    console.log(`[INTERNAL] OTP enviado para: ${email}, código: ${otpCode}`);
    
    res.json({ 
      success: true,
      message: "OTP enviado com sucesso (simulado)"
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.post('/notifications/welcome', async (req, res) => {
  try {
    const { email, userRole, userData } = req.body;
    
    console.log(`[INTERNAL] Welcome enviado para: ${email}, role: ${userRole}`);
    
    res.json({ 
      success: true,
      message: "Email de boas-vindas enviado (simulado)"
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.post('/notifications/send', async (req, res) => {
  try {
    const { email, channel, type, userRole, data, metadata } = req.body;
    
    console.log(`[INTERNAL] Notificação: ${type} via ${channel} para ${email}`);
    
    res.json({ 
      success: true,
      notificationId: "simulated-" + Date.now(),
      message: "Notificação enviada com sucesso (simulado)"
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/users/:email/preferences', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`[INTERNAL] Buscando preferências para: ${email}`);
    
    const preferences = {
      channels: {
        email: true,
        whatsapp: true,
        sms: false,
        push: true,
        system: true
      },
      globalOptIn: true
    };
    
    res.json({ preferences });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// ✅ HEALTH CHECK INTERNO
router.get('/health', (req, res) => {
  res.json({
    service: "internal-routes",
    status: "healthy",
    timestamp: new Date().toISOString(),
    routes: [
      '/notifications/otp',
      '/notifications/welcome', 
      '/notifications/send',
      '/users/:email/preferences'
    ]
  });
});

export { router as default };