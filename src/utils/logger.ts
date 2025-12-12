import log4js from 'log4js';

// 配置 log4js
log4js.configure({
  appenders: {
    // 控制台输出
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m'
      }
    },
    // 文件输出
    file: {
      type: 'file',
      filename: 'logs/app.log',
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m'
      },
      maxLogSize: 10485760, // 10MB
      backups: 5,
      compress: true
    },
    // 错误日志文件
    errorFile: {
      type: 'file',
      filename: 'logs/error.log',
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %c - %m%n%s'
      },
      maxLogSize: 10485760, // 10MB
      backups: 5,
      compress: true
    }
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    },
    error: {
      appenders: ['console', 'errorFile'],
      level: 'error'
    }
  }
});

// 获取 logger 实例
const logger = log4js.getLogger();
const errorLogger = log4js.getLogger('error');

export default {
  /**
   * 打印 info 级别日志
   */
  info: (message: string | Record<string, any>, ...args: any[]) => {
    if (typeof message === 'object') {
      logger.info(JSON.stringify(message), ...args);
    } else {
      logger.info(message, ...args);
    }
  },

  /**
   * 打印 debug 级别日志
   */
  debug: (message: string | Record<string, any>, ...args: any[]) => {
    if (typeof message === 'object') {
      logger.debug(JSON.stringify(message), ...args);
    } else {
      logger.debug(message, ...args);
    }
  },

  /**
   * 打印 warn 级别日志
   */
  warn: (message: string | Record<string, any>, ...args: any[]) => {
    if (typeof message === 'object') {
      logger.warn(JSON.stringify(message), ...args);
    } else {
      logger.warn(message, ...args);
    }
  },

  /**
   * 打印 error 级别日志
   */
  error: (message: string | Record<string, any> | Error, ...args: any[]) => {
    if (message instanceof Error) {
      errorLogger.error(message.message, message.stack, ...args);
    } else if (typeof message === 'object') {
      errorLogger.error(JSON.stringify(message), ...args);
    } else {
      errorLogger.error(message, ...args);
    }
  },

  /**
   * 打印 fatal 级别日志
   */
  fatal: (message: string | Record<string, any> | Error, ...args: any[]) => {
    if (message instanceof Error) {
      errorLogger.fatal(message.message, message.stack, ...args);
    } else if (typeof message === 'object') {
      errorLogger.fatal(JSON.stringify(message), ...args);
    } else {
      errorLogger.fatal(message, ...args);
    }
  },

  /**
   * 兼容原有的 log 方法
   */
  log: (message: string) => {
    logger.info(message);
  },

  /**
   * 获取原始 log4js logger 实例，用于高级用法
   */
  getLogger: (category?: string) => {
    return log4js.getLogger(category);
  },

  /**
   * 关闭 log4js（在应用退出时调用）
   */
  shutdown: () => {
    log4js.shutdown();
  }
};