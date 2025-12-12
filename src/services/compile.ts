import { globalTaskPool } from '../utils/compilerTaskPool';
import { downloadAndInstallTemplate, getCurrentTemplateInfo } from './template';
import logger from '../utils/logger';

export const compile = async ({
  schema,
  templateId,
  buildId,
  env,
  namespace,
}: {
  schema: string,
  templateId: string,
  buildId: string,
  env: string,
  namespace: string,
}) => {
  const {
    latestTemplateVersion,
    templatePath,
    isExists,
  } = await getCurrentTemplateInfo({
    namespace,
    templateId,
  });
  // 检查模板目录是否存在，不存在则同步
  if (!isExists) {
    logger.log('模板目录不存在，准备同步');
    await downloadAndInstallTemplate({
      namespace,
      version: latestTemplateVersion,
    });
  }
  return globalTaskPool.addTask({
    schema,
    buildId,
    templatePath,
    env,
  });
};