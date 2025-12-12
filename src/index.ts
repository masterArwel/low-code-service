import Koa from 'koa';
import cors from '@koa/cors';
import koaBody from 'koa-body';
import router from './routes';
import {
  log,
  checkToken,
  errorHandler,
} from './middleware';
import { UserInfo } from './types';
import { env } from './config';
import { initAllTemplates } from './services/template';

const app = new Koa<{
  userInfo: UserInfo;
}>();
const PORT = process.env.PORT || 3000;

// 跨域中间件过滤options请求
app.use(cors());
// 简单打印请求日志
app.use(log);
// 错误处理兜底
app.use(errorHandler);
// 解析请求体
app.use(koaBody({
  multipart: true,
  urlencoded: true,
  json: true,
}));
// 校验token
app.use(checkToken());
// 路由
app.use(router.routes());
app.use(router.allowedMethods());

const init = async () => {
  try {
    await initAllTemplates();
  } catch (error) {
    console.error('-- 同步模板失败 --', error);
  } 
}

init().then(() => {
  // 启动服务器
  app.listen(PORT, () => {
    console.log(`🚀 当前环境: ${env}，服务器运行在 http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('服务启动失败', error);
  process.exit(1);
});

export default app; 