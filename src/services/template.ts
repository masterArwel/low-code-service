import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import client from "../utils/oss";
import { concurrentTasks } from '../utils/task';
import logger from '../utils/logger';
import { getLatestTemplateVersion } from '../utils/remoteConfig'

// 列出oss上指定namespace下的所有模板版本
export const listTemplateVersions = async ({
  namespace,
}: {
  namespace: string;
}) => {
  const res = await client.listV2({
    prefix: `lowcode-templates/${namespace}/`,
  }, {
    timeout: 10000,
  });
  const reg = new RegExp(`^lowcode-templates/${namespace}/(\\d+\\.\\d+\\.\\d+)/`);
  const versions: Record<string, number> = {}
  res.objects.forEach((item) => {
    const version = item.name.match(reg)?.[1];
    if (version && !versions[version]) {
      versions[version] = 1;
    }
  });
  return Object.keys(versions);
};

const getTemplatePath = ({
  namespace,
  version,
  templateId,
}: {
  namespace: string;
  version: string;
  templateId?: string;
}) => {
  return path.join('./lowcode-templates', namespace, version, templateId || '');
}

// 确认本地是否存在指定的模板
export const checkLocalTemplateExists = ({
  namespace,
  version,
}: {
  namespace: string;
  version: string;
}) => {
  const templatePath = getTemplatePath({ namespace, version });
  if (existsSync(templatePath)) {
    return true;
  }
  return false;
}

// 获取指定namespace下的指定模板类型是否存在
export const getCurrentTemplateInfo = async ({
  namespace,
  templateId,
}: {
  namespace: string;
  templateId: string;
}) => {
  const latestTemplateVersion = await getLatestTemplateVersion({
    namespace,
  });
  const templatePath = getTemplatePath({
    namespace,
    version: latestTemplateVersion,
    templateId,
  });
  return {
    latestTemplateVersion,
    templatePath,
    isExists: existsSync(templatePath),
  };
}

/**
 * 下载模板
 * 
 * 目标目录为： https://m.xxx-app.com/lowcode-templates/<namespace>/<version>
 */
export const downloadTemplates = async ({
  namespace,
  version,
}: {
  namespace: string;
  version: string;
}) => {
  const prefix = `lowcode-templates/${namespace}/${version}/`;
  const res = await client.listV2({
    prefix,
  }, {
    timeout: 10000,
  });
  const files = res.objects.map((item) => { 
    const arr = item.name.split('/');
    const dir = arr.slice(0, arr.length - 1).join('/');
    return {
      url: item.name,
      dir,
      filePath: item.name,
    }
  });
  // 下载新模板
  await concurrentTasks(files.map((file) => async () => {
    const res = await client.getStream(file.url);
    await mkdir(file.dir, { recursive: true });
    // save to local
    await writeFile(file.filePath, res.stream);
  }));
  return res;
};

// 安装模板依赖
export const installPackages = ({
  namespace,
  version,
}: {
  namespace: string;
  version: string;
}) => {
  const templatePath = getTemplatePath({ namespace, version });
  execSync(`cd ${templatePath} && npm install`);
}

// 下载模板并安装模板依赖
export const downloadAndInstallTemplate = async ({
  namespace,
  version,
}: {
  namespace: string;
  version: string;
}) => {
  await downloadTemplates({
    namespace,
    version,
  });
  logger.log(`同步模板 ${version} 成功`);
  installPackages({
    namespace,
    version,
  });
  logger.log(`安装模板依赖成功`);
}

/**
 * 检查并同步最新模板
 * 
 * 动态获取最新模板版本配置：https://config.xxx-app.cn/#/project/detail?projectGuid=38f0104d8ea64363b37957ff035a8643&projectName=AppLowCodeCompileService
 * 获取template字段，例如：{ latestTemplateVersion: '1.0.0' }，则同步最新版本为1.0.0
 */
export const checkAndSyncLatestTemplate = async ({
  namespace,
}: {
  namespace: string;
}) => {
  // 获取远端模板配置
  const latestTemplateVersion = await getLatestTemplateVersion({
    namespace,
  });
  if (!latestTemplateVersion) {
    throw new Error('未找到远端模板配置');
  }
  logger.log(`远端模板版本号为 ${latestTemplateVersion}`);

  // 确认本地是否存在指定的模板
  if (checkLocalTemplateExists({
    namespace,
    version: latestTemplateVersion,
  })) {
    return;
  }
  logger.log(`本地不存在指定版本 ${latestTemplateVersion} 的模板，准备同步`);

  await downloadAndInstallTemplate({
    namespace,
    version: latestTemplateVersion,
  });
  return latestTemplateVersion;
}

const allNamespaces = ['loomstellar'];
// 初始化所有模板
export const initAllTemplates = async () => {
  await concurrentTasks(allNamespaces.map((namespace) => async () => {
    await checkAndSyncLatestTemplate({
      namespace,
    });
  }));
}