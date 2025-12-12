import Router from 'koa-router';
import os from 'node:os';
import { UserInfo } from '../types';
import {
  downloadAndInstallTemplate,
  getCurrentTemplateInfo,
  listTemplateVersions,
  checkLocalTemplateExists
} from '../services/template';
import { getLatestTemplateVersion } from '../utils/remoteConfig';

const router = new Router<{ userInfo: UserInfo }>();

// 获取模板列表
router.get('/list', async (ctx) => {
  const namespace = String(ctx.query.namespace || 'loomstellar');
  const res = await listTemplateVersions({
    namespace,
  });
  ctx.body = {
    code: 0,
    msg: res,
  };
});

/**
 * 检查当前配置的模板版本，以及本地是否存在该模板
 */
router.get('/check', async (ctx) => {
  const {
    namespace = 'loomstellar',
    templateId,
  } = ctx.query;
  const templateInfo = await getCurrentTemplateInfo({
    namespace: String(namespace),
    templateId: String(templateId),
  });
  ctx.body = {
    code: 0,
    data: templateInfo,
    host: os.hostname(),
  };
});

// 同步最新模板
router.post('/sync', async (ctx) => {
  const { namespace } = ctx.request.body || {};
  let version = ctx.request.body.version;
  if (!version) {
    // 不指定版本，获取设置的最新版本
    version = await getLatestTemplateVersion({
      namespace,
    });
  }

  // 校验模板版本是否存在
  const isExists = checkLocalTemplateExists({
    namespace,
    version,
  });
  if (isExists) {
    ctx.body = {
      code: 0,
      host: os.hostname(),
      msg: `本地已存在 ${namespace}/${version} 模板`,
    };
    return;
  }

  await downloadAndInstallTemplate({
    namespace,
    version,
  });
  ctx.body = {
    code: 0,
    msg: `同步 ${namespace}/${version} 模板成功`,
    host: os.hostname(),
  };
});

export default router;