// src/config/database.ts
import mongoose from 'mongoose';
import chalk from 'chalk';

// Configuração inicial do Mongoose
mongoose.set('strictQuery', false);

const getTimestamp = () => chalk.gray(`[${new Date().toISOString()}]`);

let isConnected = false;

/**
 * Extrai nome do banco de dados da URI
 */
const extractDatabaseName = (uri: string): string => {
  try {
    const url = new URL(uri);
    const dbName = url.pathname.replace("/", "") || "beautytime-users";
    return dbName.split('?')[0] || "beautytime-users";
  } catch {
    return "beautytime-users";
  }
};

/**
 * Texto descritivo do estado da conexão
 */
const getReadyStateText = (state: number): string => {
  const states: { [key: number]: string } = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting', 
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

/**
 * Configura os event listeners do Mongoose
 */
const setupMongooseEventListeners = (): void => {
  mongoose.connection.on('connected', () => {
    console.log(`${getTimestamp()} ${chalk.green('✅')} MongoDB connected event`);
    isConnected = true;
  });

  mongoose.connection.on('error', (err) => {
    console.error(`${getTimestamp()} ${chalk.red('❌')} MongoDB connection error:`, err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log(`${getTimestamp()} ${chalk.yellow('⚠️')} MongoDB disconnected`);
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log(`${getTimestamp()} ${chalk.green('🔗')} MongoDB reconnected`);
    isConnected = true;
  });
};

/**
 * Inicializa os modelos do Mongoose
 */
const initializeModels = async (): Promise<void> => {
  try {
    // ✅ Se você tem modelos, importe-os aqui
    // Exemplo: await import('../models/User.model');
    console.log(`${getTimestamp()} ${chalk.green('✅')} Models initialized`);
  } catch (error) {
    console.error(`${getTimestamp()} ${chalk.red('❌')} Error initializing models:`, error);
  }
};

/**
 * Conecta ao banco de dados MongoDB e inicializa os modelos
 */
export const connectDB = async (): Promise<void> => {
  // ✅ CORREÇÃO: Usar números diretamente para evitar problemas de tipo
  const readyState = mongoose.connection.readyState;
  
  if (readyState === 1) { // connected
    console.log(`${getTimestamp()} ${chalk.yellow('ℹ️')} MongoDB already connected`);
    isConnected = true;
    return;
  }

  if (readyState === 2) { // connecting
    console.log(`${getTimestamp()} ${chalk.yellow('ℹ️')} MongoDB connection in progress...`);
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não definida no .env');
    }

    const databaseName = extractDatabaseName(mongoUri);
    
    console.log(`${getTimestamp()} ${chalk.blue('🔍')} Connecting to MongoDB...`);
    console.log(`${getTimestamp()} ${chalk.gray('📊')} Database: ${databaseName}`);

    // ✅ CORREÇÃO: Configurar event listeners ANTES de conectar
    setupMongooseEventListeners();

    // Configuração de conexão
    const options = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(mongoUri, options);
    
    // ✅ CORREÇÃO: Verificação simplificada sem problemas de tipo
    if (mongoose.connection.readyState !== 1) {
      console.log(`${getTimestamp()} ${chalk.blue('⏳')} Waiting for connection to be ready...`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MongoDB connection timeout'));
        }, 10000);

        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            mongoose.connection.off('connected', checkConnection);
            mongoose.connection.off('error', onError);
            resolve();
          }
        };

        const onError = (err: any) => {
          clearTimeout(timeout);
          mongoose.connection.off('connected', checkConnection);
          mongoose.connection.off('error', onError);
          reject(err);
        };

        mongoose.connection.on('connected', checkConnection);
        mongoose.connection.on('error', onError);
        
        // Verificar imediatamente caso já esteja conectado
        if (mongoose.connection.readyState === 1) {
          checkConnection();
        }
      });
    }

    await initializeModels();
    
    console.log(`${getTimestamp()} ${chalk.green('🎯')} Database connection established`);
    
  } catch (error) {
    console.error(`${getTimestamp()} ${chalk.red('❌')} MongoDB connection error:`, error);
    isConnected = false;
    throw error;
  }
};

/**
 * Desconecta do banco de dados MongoDB
 */
export const disconnectDB = async (): Promise<void> => {
  // ✅ CORREÇÃO: Usar números diretamente
  if (mongoose.connection.readyState === 0) { // disconnected
    console.log(`${getTimestamp()} ${chalk.yellow('ℹ️')} MongoDB already disconnected`);
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log(`${getTimestamp()} ${chalk.green('✅')} MongoDB disconnected`);
  } catch (error) {
    console.error(`${getTimestamp()} ${chalk.red('❌')} MongoDB disconnection error:`, error);
    throw error;
  }
};

/**
 * Verifica o estado da conexão
 */
export const checkConnection = (): boolean => {
  return mongoose.connection.readyState === 1; // connected
};

/**
 * Retorna a instância atual do Mongoose
 */
export const getMongooseInstance = (): typeof mongoose => mongoose;

// Interface para o status do banco
interface DatabaseStatus {
  isConnected: boolean;
  readyState: number;
  readyStateDescription: string;
  database: string;
  host: string;
}

/**
 * Retorna o status detalhado da conexão
 */
export const getDatabaseStatus = (): DatabaseStatus => {
  const mongoUri = process.env.MONGODB_URI || "not configured";
  const currentReadyState = mongoose.connection.readyState;
  
  // ✅ CORREÇÃO: Usar números diretamente
  const actuallyConnected = currentReadyState === 1; // connected
  
  // ✅ CORREÇÃO: Sincronizar isConnected com readyState
  if (actuallyConnected !== isConnected) {
    isConnected = actuallyConnected;
  }
  
  return {
    isConnected: actuallyConnected,
    readyState: currentReadyState,
    readyStateDescription: getReadyStateText(currentReadyState),
    database: extractDatabaseName(mongoUri),
    host: mongoUri,
  };
};

// Interface para health check
interface HealthCheckResult {
  status: string;
  database: string;
  ping: boolean;
  timestamp: string;
  error?: string;
}

/**
 * Health check completo do banco
 */
export const healthCheck = async (): Promise<HealthCheckResult> => {
  try {
    const dbStatus = getDatabaseStatus();
    
    // ✅ CORREÇÃO: Lógica melhorada para health check
    if (dbStatus.readyState === 1) { // connected
      // Verificar se temos acesso ao db antes do ping
      if (mongoose.connection.db) {
        try {
          // Testar ping no banco
          await mongoose.connection.db.admin().ping();
          return { 
            status: 'connected', 
            database: dbStatus.database,
            ping: true,
            timestamp: new Date().toISOString()
          };
        } catch (pingError) {
          return { 
            status: 'error', 
            database: dbStatus.database,
            ping: false,
            timestamp: new Date().toISOString(),
            error: 'Ping failed'
          };
        }
      } else {
        return { 
          status: 'connecting', 
          database: dbStatus.database,
          ping: false,
          timestamp: new Date().toISOString()
        };
      }
    } else if (dbStatus.readyState === 2) { // connecting
      return { 
        status: 'connecting', 
        database: dbStatus.database,
        ping: false,
        timestamp: new Date().toISOString()
      };
    } else {
      return { 
        status: 'disconnected', 
        database: dbStatus.database,
        ping: false,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return { 
      status: 'error', 
      database: extractDatabaseName(process.env.MONGODB_URI || ""),
      ping: false,
      timestamp: new Date().toISOString(),
      error: errorMessage
    };
  }
};

/**
 * Aguarda até a conexão estar realmente pronta
 */
export const waitForConnection = async (timeoutMs: number = 10000): Promise<boolean> => {
  const startTime = Date.now();
  
  // ✅ CORREÇÃO: Usar números diretamente
  while (mongoose.connection.readyState !== 1) { // connected
    if (Date.now() - startTime > timeoutMs) {
      console.error(`${getTimestamp()} ${chalk.red('⏰')} Timeout waiting for MongoDB connection`);
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return true;
};