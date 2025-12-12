import { Context, Next } from 'koa';
export * from './checkToken';
import logger from '../utils/logger';
import { BusinessError } from '../utils/error';
import { env } from '../config';

const getErrorString = (err: unknown) => {
  if (err instanceof Error) {
    return JSON.stringify({
      message: err.message,
      stack: err.stack,
    })
  }
  if (typeof err === 'string') {
    return err
  }
  return JSON.stringify(err)
}

// 错误处理中间件
export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err: unknown) {
    if (err instanceof BusinessError) {
      ctx.status = 200
      ctx.body = {
        code: err.code,
        message: err.message,
        data: err.payload,
      }
      return
    }

    ctx.status = 500;
    let message = '服务器内部错误'
    let stack = undefined
    if (err instanceof Error) {
      message = err.message
      if (env !== 'pro') {
        stack = err.stack
      }
    }
    ctx.body = {
      message,
      error: stack,
    };
  }
};

// 日志中间件
export const log = async (ctx: Context, next: Next) => {
  const start = Date.now();
  
  await next();

  logger.info({
    request: {
      url: ctx.url,
      method: ctx.method,
      body: JSON.stringify(ctx.request.body),
      headers: JSON.stringify(ctx.headers),
    },
    response: JSON.stringify(ctx.body),
  })
  
  const ms = Date.now() - start;
  const method = ctx.method;
  const url = ctx.url;
  const status = ctx.status;
  
  console.log(`${method} ${url} - ${status} - ${ms}ms`);
};
