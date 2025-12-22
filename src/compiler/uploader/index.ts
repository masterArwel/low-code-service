import fastGlob from 'fast-glob';
import { existsSync } from 'node:fs';
import type { ENV, Meta } from '../types';
import client from './client';
import { concurrentTasks } from '../utils/task';
import { logger } from '../utils/logger';

const noCacheMap: Record<string, string> = {
  'html': 'no-cache',
  'json': 'no-cache',
}

const getFileExt = (filePath: string) => {
  return filePath.split('.').pop()
}

const getCacheControl = (filePath: string) => {
  const fileExt = getFileExt(filePath)
  if (fileExt && noCacheMap[fileExt]) {
    return noCacheMap[fileExt]
  }
  return 'max-age=31536000, public'
}

const doUpload = async (filePath: string, targetPath: string) => {
  const cacheControl = getCacheControl(filePath)
  await client.put(targetPath, filePath, {
    headers: {
      'Cache-Control': cacheControl,
    },
  });
}

const doUploadAssets = async (
  {
    filePath,
    file,
    meta,
    env,
  }: {
    filePath: string,
    file: string,
    meta: Meta,
    env: ENV,
  }
) => {
  let targetPath = `/ls/${meta.project_name}/${file}`
  // dev/0.1.0/*
  if (env === 'pro') {
    targetPath = targetPath.replace(`pro/`, '')
  }
  console.log('targetPath', targetPath)
  console.log('meta.appVersion', meta.appVersion)
  const latestTargetPath = targetPath.replace(meta.appVersion, 'latest')
  await doUpload(filePath, targetPath)
  logger.info(`上传成功: ${targetPath}`)
  await doUpload(filePath, latestTargetPath)
  logger.info(`上传成功: ${latestTargetPath}`)
};

export const uploadToOss = async ({
  tmpBuildDir,
  meta,
  env,
}: {
  tmpBuildDir: string,
  meta: Meta,
  env: ENV,
}) => {
  if (!meta.project_name || !meta.appVersion) {
    throw new Error('meta.project_name and meta.appVersion are required')
  }
  // 上传代码文件
  const files = await fastGlob(`${tmpBuildDir}/dist/**/*`)
  console.log('files', files);
  await concurrentTasks(files.map(filePath => () => {
    // dev/0.1.0/*
    const file = filePath.replace(`${tmpBuildDir}/dist/`, '')
    return doUploadAssets({
      filePath,
      file,
      meta,
      env,
    })
  }), 4)

  if (env === 'pro') {
    return `https://m.xxx-app.com/ls/${meta.project_name}/latest/index.html`
  }
  return `https://m.xxx-app.com/ls/${meta.project_name}/${env}/latest/index.html`
};

// 上传日志文件
export const uploadLogFile = async (
  logFileTargetPath: string,
  meta: Meta,
  env: ENV,
) => {
  try {
    const logFileName = `build-${env}-${meta.appVersion}-${Date.now()}.log`
    if (existsSync(logFileTargetPath)) {
      await doUpload(logFileTargetPath, `/ls/${meta.project_name}/${logFileName}`)
      return `https://m.xxx-app.com/ls/${meta.project_name}/${logFileName}`
    }
    logger.log(`编译日志文件不存在: ${logFileTargetPath}`)
    return ''
  } catch (ex) {
    logger.log(`编译日志文件上传失败: ${ex}`)
    return ''
  }
}

// 检查oss目录是否存在
export const checkOssDirExists = async (dir: string) => {
  try {
    const res = await client.list({
      prefix: `${dir}/`,
      'max-keys': 1,
    }, {
      timeout: 10000,
    })
    return res.objects.length > 0
  } catch (ex) {
    return false
  }
}

// 上传指定目录下的所有文件到oss指定路径
export const uploadFiles = async (
  dir: string,
  targetPath: string,
) => {
  const files = await fastGlob(`${dir}/**/*`, {
    dot: true,
  })
  await concurrentTasks(files.map(filePath => () => {
    const file = filePath.replace(`${dir}/`, '')
    return doUpload(filePath, `${targetPath}/${file}`).then(() => {
      logger.log(`上传成功: ${targetPath}/${file}`)
    })
  }), 4)
}