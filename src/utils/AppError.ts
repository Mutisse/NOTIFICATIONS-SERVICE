export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (error: any, req: any, res: any, next: any) => {
  let handledError = error;

  if (!(error instanceof AppError)) {
    // Log error para debugging
    console.error('Erro não tratado:', error);

    // Mensagens genéricas para diferentes tipos de erro
    if (error.name === 'ValidationError') {
      handledError = new AppError('Dados de entrada inválidos', 400, 'VALIDATION_ERROR');
    } else if (error.name === 'CastError') {
      handledError = new AppError('Recurso não encontrado', 404, 'NOT_FOUND');
    } else if (error.code === 11000) {
      handledError = new AppError('Recurso já existe', 409, 'DUPLICATE_RESOURCE');
    } else if (error.name === 'JsonWebTokenError') {
      handledError = new AppError('Token inválido', 401, 'INVALID_TOKEN');
    } else if (error.name === 'TokenExpiredError') {
      handledError = new AppError('Token expirado', 401, 'TOKEN_EXPIRED');
    } else {
      handledError = new AppError(
        'Erro interno do servidor',
        500,
        'INTERNAL_SERVER_ERROR'
      );
    }
  }

  res.status(handledError.statusCode).json({
    success: false,
    error: {
      message: handledError.message,
      code: handledError.errorCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: handledError.stack,
        originalError: error.message
      })
    },
    timestamp: new Date().toISOString()
  });
};