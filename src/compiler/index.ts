import { cp, rm } from 'node:fs/promises'
import { existsSync, openSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { Schema, Options, BuildResult } from './types'
import { compile } from './compilers/v1/core'
import { logger } from './utils/logger'
import { safeParse } from './utils'
import { uploadLogFile, uploadToOss, uploadFiles, checkOssDirExists } from './uploader'

export * from './types'

/**
 * 编译主入口
 * @param schemaJson 项目配置
 * @param options 编译配置
 * @returns 编译结果，包含index.html的url和日志文件的url
 */
export const build = async (
  schemaJson: string,
  options: Options,
): Promise<BuildResult> => {
  let startBuildTime = Date.now()
  if (!options.buildId || !options.templatePath) {
    throw new Error('buildId和templatePath是必传参数')
  }
  const schema = safeParse<Schema>(schemaJson)
  if (!schema) {
    throw new Error('schemaJson不是有效的json字符串')
  }

  // 模板所在路径
  const { templatePath } = options
  const tempPath = resolve(templatePath, '../.temp')
  // 当前构建任务的临时目录
  const tmpBuildDir = resolve(tempPath, options.buildId)
  if (existsSync(tmpBuildDir)) {
    // 先删除旧文件
    await rm(tmpBuildDir, { recursive: true })
  }
  // 递归复制所有模板到临时目录
  await cp(templatePath, tmpBuildDir, { recursive: true });

  // 获取日志文件路径
  const logFilePath = resolve(tmpBuildDir, 'build.log')
  // 打开日志文件
  const logFileId = openSync(logFilePath, 'w')
  // 缓存到logger中
  // 后续所有日志都会写入到这个文件中
  logger.setLogFileId(logFileId)

  logger.info(`当前任务，编译ID: ${options.buildId}，模板路径：${templatePath}`)

  try {
    // 生成代码到临时目录
    await compile({
      schema,
      tmpBuildDir,
      env: options.env,
      isPreview: options.isPreview,
    })
    logger.info(`开始执行: npm i && npm run build...`)

    // 执行vite
    execSync(
      `cd ${tmpBuildDir} && npm i && npm run build`,
      {
        env: {
          ...process.env,
          APP_ENV: options.env,
        },
        stdio: ['pipe', logFileId, logFileId],
      }
    )
    logger.info(`vite build完成`)
    // 检查是否存在dist/<env>/<version>/index.html文件
    const indexHtmlPath = resolve(tmpBuildDir, 'dist', options.env, schema.meta.appVersion, 'index.html')
    if (!existsSync(indexHtmlPath)) {
      throw new Error(`编译失败，在'dist/${options.env}/${schema.meta.appVersion}'目录下未找到index.html文件`)
    }

    const returnData = {
      url: '',
      logUrl: '',
      buildId: options.buildId,
      message: '编译成功',
      buildTime: Date.now() - startBuildTime,
    }
    if (options.uploadToOss !== false) {
      // 上传代码到oss
      returnData.url = await uploadToOss({
        tmpBuildDir,
        meta: schema.meta,
        env: options.env,
      })
      // 上传日志文件
      returnData.logUrl = await uploadLogFile(logFilePath, schema.meta, options.env)
      // 删除临时目录
      await rm(tmpBuildDir, { recursive: true })
    }
    return returnData
  } catch (ex) {
    const returnData = {
      url: '',
      logUrl: '',
      buildId: options.buildId,
      message: ex instanceof Error ? ex.message : '编译失败',
      buildTime: Date.now() - startBuildTime,
    }
    if (options.uploadToOss !== false) {
      // 上传日志文件
      returnData.logUrl = await uploadLogFile(logFilePath, schema.meta, options.env)
      // 删除临时目录
      await rm(tmpBuildDir, { recursive: true })
    }
    return returnData
  }
}

/**
 * 上传模板
 * @param namespace 命名空间
 * @param templateId 模板ID
 * @param version 模板版本
 * @param rootPath 模板根路径
 * @returns 模板根目录URL
 */
export const uploadTemplate = async ({
  namespace,
  version,
  rootPath,
}: {
  namespace: string,
  version: string,
  rootPath: string,
}) => {
  const targetPath = `lowcode-templates/${namespace}/${version}`
  const exists = await checkOssDirExists(targetPath)
  if (exists) {
    throw new Error(`${targetPath} 已存在`)
  }
  await uploadFiles(rootPath, targetPath)
  return `https://m.xx-app.com/${targetPath}`
}