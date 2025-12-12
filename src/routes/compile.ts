import Router from 'koa-router';
import { env } from '../config';
import { UserInfo } from '../types';
import { compile } from '../services/compile';
import { BusinessError } from '../utils/error';

const router = new Router<{ userInfo: UserInfo }>();

// 编译
router.post('/', async (ctx) => {
  const {
    buildId,
    namespace = 'loomstellar',
    templateId,
    schema,
  } = ctx.request.body;
  if (!buildId || !schema) {
    throw new BusinessError('buildId、schema不能为空', 104);
  }
  const schemaStr = typeof schema === 'string' ? schema : JSON.stringify(schema);
  const buildResult = await compile({
    schema: schemaStr,
    templateId: templateId || 'simple',
    namespace, 
    buildId,
    env: env as any,
  });
  ctx.body = {
    // 编译失败时code置为1
    code: buildResult.url ? 0 : 1,
    data: buildResult,
  };
});

export default router; 