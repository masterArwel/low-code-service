import Router from 'koa-router';
import os from 'node:os';
import { globalTaskPool } from '../utils/compilerTaskPool';
import { UserInfo } from '../types';

const router = new Router<{ userInfo: UserInfo }>();

router.get('/', async (ctx) => {
  ctx.body = {
    code: 0,
  };
});

// 健康检查
router.get('/health', async (ctx) => {
  ctx.body = {
    code: 0,
    data: {
      timestamp: new Date().toISOString(),
      message: `运行中任务数: ${globalTaskPool.runningTaskCount}，排队任务数: ${globalTaskPool.taskCount}`,
      host: os.hostname(),
    }
  };
});

export default router;