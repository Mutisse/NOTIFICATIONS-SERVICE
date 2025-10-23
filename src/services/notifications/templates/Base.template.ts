export abstract class BaseTemplate {
  protected static generateBaseTemplate(
    title: string,
    content: string,
    headerColor: string = "linear-gradient(135deg, #10B981, #059669)"
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
            background: ${headerColor};
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
            background: #10B981;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: all 0.3s ease;
          }
          .button:hover {
            background: #059669;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
          }
          .code {
            font-size: 42px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #10B981;
            letter-spacing: 8px;
            background: #f0fdf4;
            padding: 20px;
            border-radius: 12px;
            border: 2px dashed #10B981;
          }
          .info-box {
            background: #F3F4F6;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 4px solid #10B981;
          }
          @media (max-width: 600px) {
            body { padding: 10px; }
            .container { border-radius: 10px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .code { font-size: 32px; letter-spacing: 6px; padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💅 BeautyTime</div>
            <h1 class="title">${title}</h1>
          </div>
          
          <div class="content">
            ${content}
          </div>
          
          <div class="footer">
            <p><strong>© 2024 BeautyTime Platform</strong></p>
            <p>Email: ${process.env.SMTP_USER || 'contato@beautytime.com'}</p>
            <p>Desenvolvido por Edilson Mutisse</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9CA3AF;">
              Se você não reconhece esta atividade, por favor ignore este email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}