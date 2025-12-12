import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { statSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import template from 'art-template'
import type {
  ComponentMap,
  ComponentTree,
  Schema,
  ENV,
} from '../../types'
import { logger } from '../../utils/logger'

type DependenciesMap = Record<string, ComponentMap>

// 获取全局依赖map
const getDependenciesMap = (componentsMap: ComponentMap[] = []) => {
  const dependencies: DependenciesMap = {}
  if (componentsMap) {
    for (const item of componentsMap) {
      if (item?.componentName) {
        dependencies[item.componentName] = item
      }
    }
  }
  return dependencies
}

const walkDir = async (dir: string, callback: (file: string) => void) => {
  const files = await readdir(dir)
  for (const file of files) {
    const filePath = resolve(dir, file)
    if (statSync(filePath).isDirectory()) {
      await walkDir(filePath, callback)
    } else {
      callback(filePath)
    }
  }
}

const walkComponentsTree = (componentsTree: ComponentTree[], callback: (component: ComponentTree) => void) => {
  for (const component of componentsTree) {
    callback(component)
    if (typeof component === 'object' && component.children) {
      walkComponentsTree(component.children, callback)
    }
  }
}

const renderArtFile = ({
  filePath,
  tmpBuildDir,
  templateData,
}: {
  filePath: string,
  tmpBuildDir: string,
  templateData?: Record<string, any>,
  // meta?: Meta,
  // routes?: Route[],
  // dependencies?: ComponentMap[],
}) => {
  // 只处理art文件
  if (filePath.endsWith('.art')) {
    // 模板文件
    const tmpFilePath = resolve(tmpBuildDir, filePath)
    // 目标文件
    const destFilePath = resolve(tmpBuildDir, filePath.replace('.art', ''))
    const content = template(tmpFilePath, templateData)
    logger.info(`生成文件: ${destFilePath}`)
    return writeFile(destFilePath, content)
  }
  return Promise.resolve()
}

const getPackageDependencies = (dependenciesMap: DependenciesMap) => {
  const map = {}
  return Object.values(dependenciesMap)
    .filter((item) => {
      if (map[item.package]) {
        return false
      }
      map[item.package] = true
      return true
    })
    .map((item) => {
      return {
        package: item.package,
        version: item.version,
      }
    })
}

// 非页面文件
const generateCommonFiles = async ({
  dependenciesMap,
  tmpBuildDir,
  templateData,
}: {
  dependenciesMap: DependenciesMap,
  tmpBuildDir: string,
  templateData?: Record<string, any>,
}) => {
  // 三方依赖，需要去重
  const dependencies = getPackageDependencies(dependenciesMap)
  const tasks: Promise<void>[] = []

  await walkDir(tmpBuildDir, (filePath) => {
    tasks.push(renderArtFile({
      filePath,
      tmpBuildDir,
      templateData: {
        ...templateData,
        dependencies,
      },
    }))
  })

  await Promise.all(tasks)

  const assetsScriptPath = resolve(__dirname, '../../assets/page-valid-check.js')
  const destScriptPath = resolve(tmpBuildDir, './src/page-valid-check.js')
  const content = require('node:fs').readFileSync(assetsScriptPath, 'utf-8')
  await mkdir(resolve(tmpBuildDir, './src'), { recursive: true })
  await writeFile(destScriptPath, content)
}

const generateImportContent = ({
  pageComponents,
  dependenciesMap,
}: {
  pageComponents: ComponentTree[]
  dependenciesMap: DependenciesMap
}) => {
  const contents = new Set<string>()
  walkComponentsTree(pageComponents, (component) => {
    if (typeof component === 'string') {
      return
    }
    const {
      componentName,
    } = component as ComponentTree
    const cmp = dependenciesMap[componentName]
    // 如果存在三方依赖，则需要生成import语句
    if (cmp) {
      const {
        destructuring = false,
        exportName = '',
        package: packageName = '',
        path = '',
      } = cmp
      if (exportName) {
        if (destructuring) {
          contents.add(`import { ${exportName} } from '${packageName}${path}'`)
        } else {
          contents.add(`import ${exportName} from '${packageName}${path}'`)
        }
      } else {
        contents.add(`import '${packageName}${path}'`)
      }
    }
  })
  return Array.from(contents).join('\n')
}

/**
 * 生成页面内容
 * 
 * 页面结构：
 * import xx from 'xx'
 * 
 * export default (props) => {
 *  return `
 *    <组件1 prop1="${prop1Value}" prop2="${prop2Value}">
 *      <组件2 prop3="${prop3Value}" prop4="${prop4Value}">
 *      </组件2> 
 *    </组件1>  
 *    <组件3 prop5="${prop5Value}" prop6="${prop6Value}">
 *    </组件3> 
 *  `
 * }
 */
const nonPropKeys = ['text']
const processKey = (key: string) => {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase()
}
const processStyle = (style: Record<string, any>) => {
  return Object.entries(style)
    .map(([key, value]) => `${processKey(key)}: ${value}`)
    .join(';')
}
const combinePropString = (props: Record<string, any>) => {
  return Object.entries(props)
    .filter(([key]) => !nonPropKeys.includes(key))
    .map(([key, value]) => {
      // 特殊处理style属性
      if (key === 'style') {
        return `style="${processStyle(value)}"`
      }
      if (typeof value === 'string') {
        return `${processKey(key)}='${value}'`
      }
      return `${processKey(key)}='${JSON.stringify(value)}'`
    }).join(' ')
}
const createLeftTag = (componentName: string, props?: Record<string, any>) => {
  let content = `<${componentName}`
  if (props) {
    content += ` ${combinePropString(props)}`
  }
  return content + '>'
}
const createRightTag = (componentName: string) => {
  return `</${componentName}>`
}
const generateComponentsTreeContent = ({
  componentsTree,
  dependenciesMap,
}: {
  componentsTree: ComponentTree[]
  dependenciesMap: DependenciesMap
}) => {
  const contents: string[] = []
  for (const component of componentsTree) {
    if (typeof component === 'string') {
      contents.push(component)
      continue
    }
    const {
      componentName,
      props,
      children,
    } = component
    let content = createLeftTag(componentName, props)
    // 特殊处理text属性
    if (props?.text) {
      content += props.text
    }
    if (children) {
      for (const child of children) {
        content += generateComponentsTreeContent({
          componentsTree: [child],
          dependenciesMap,
        })
      }
    }
    content += createRightTag(componentName)
    contents.push(content)
  }
  return contents.join('\n')
}

// 生成每个页面文件内容
const generatePageContent = ({
  pageComponents,
  dependenciesMap,
}: {
  pageComponents: ComponentTree[]
  dependenciesMap: DependenciesMap
}) => {
  // 1. 首先生成import语句
  const pageContents: string[] = []

  const importContent = generateImportContent({
    pageComponents,
    dependenciesMap,
  })
  pageContents.push(importContent)

  // 生成组件内容
  const componentsContent = generateComponentsTreeContent({
    componentsTree: pageComponents,
    dependenciesMap,
  })

  pageContents.push(`export default (props) => {
    return \`
      ${componentsContent}
    \`
  }`)
  return pageContents.join('\n')
}

// 生成额外导入语句
const generateExtraImports = (componentsMap: ComponentMap[] = []) => {
  const importsMap: Record<string, string> = {}
  for (const item of componentsMap) {
    const { package: packageName, extraImports } = item
    if (extraImports?.length) {
      for (const extraImport of extraImports) {
        const fullPath = `${packageName}${extraImport.path || ''}`
        if (!importsMap[fullPath]) {
          importsMap[fullPath] = `import '${fullPath}'`
        }
      }
    }
  }
  return Object.values(importsMap)
}

// 极简模式下生成index.html文件内容
const getHtmlContents = async ({
  schema,
  dependenciesMap,
}: {
  schema: Schema,
  dependenciesMap: DependenciesMap
}) => {
  const { pages, componentsTree } = schema
  const { treeId } = pages[0]
  const pageData = componentsTree.find(item => item.id === treeId)
  if (!pageData) {
    throw new Error('当前schema中componentsTree中未找到对应的treeId，请检查treeId是否正确')
  }
  const {
    children: pageComponents
  } = pageData
  if (!pageComponents) {
    throw new Error(`${JSON.stringify(pageData)}中未配置children`)
  }

  const importContent = generateImportContent({
    pageComponents,
    dependenciesMap,
  })
  // 生成组件内容
  const componentsContent = generateComponentsTreeContent({
    componentsTree: pageComponents,
    dependenciesMap,
  })
  return {
    importContent,
    componentsContent,
    pageConfig: pageData.pageConfig || {},
  }
}

// 生成页面文件及路由
const generatePages = async ({
  schema,
  tmpBuildDir,
  dependenciesMap,
}: {
  schema: Schema,
  tmpBuildDir: string,
  dependenciesMap: DependenciesMap
}) => {
  const { pages, componentsTree } = schema
  if (!pages || pages.length === 0) {
    throw new Error('当前schema中未配置pages')
  }
  if (!componentsTree || componentsTree.length === 0) {
    throw new Error('当前schema中未配置componentsTree')
  }
  const tasks: Promise<void>[] = []

  const pagesDir = resolve(tmpBuildDir, './src/pages')

  // 2. 生成页面
  for (const page of pages) {
    const { id, treeId } = page
    const pageData = componentsTree.find(item => item.id === treeId)
    if (!pageData) {
      throw new Error('当前schema中componentsTree中未找到对应的treeId，请检查treeId是否正确')
    }
    const {
      children: pageComponents
    } = pageData
    if (!pageComponents || pageComponents.length === 0) {
      throw new Error(`${JSON.stringify(pageData)}中未配置children`)
    }
    const pageContent = generatePageContent({
      pageComponents,
      dependenciesMap,
    })
    // 写入页面文件
    tasks.push(
      mkdir(pagesDir, { recursive: true }).then(() => {
        const filePath = resolve(pagesDir, `${id}.js`)
        logger.info(`生成文件: ${filePath}`)
        return writeFile(filePath, pageContent)
      })
    )
  }
  return await Promise.all(tasks)
}

export const compile = async ({
  schema,
  tmpBuildDir,
  env,
  isPreview,
}: {
  schema: Schema,
  tmpBuildDir: string,
  env: ENV,
  isPreview?: boolean,
}) => {
  const {
    componentsMap,
    meta,
    router,
    pages,
  } = schema
  // 全局依赖Map
  const dependenciesMap = getDependenciesMap(componentsMap)
  // 路由数据，如果未配置，则默认只有第一个页面
  const routes = (router?.routes || [{
    path: '',
    page: pages[0].id,
  }]).map(item => ({
    path: item.path,
    page: item.page,
    pagePath: `./pages/${item.page}`,
  }))
  const pagesDir = resolve(tmpBuildDir, './src/pages')
  // 判断pagesDir是否存在，不存在则为极简模式，只有index.html文件
  const isSimpleMode = !existsSync(pagesDir)
  // 生成额外导入语句
  const extraImports = generateExtraImports(componentsMap)

  if (isSimpleMode) {
    logger.info('当前为极简模式(只生成index.html)')
    const {
      importContent,
      componentsContent,
      pageConfig,
    } = await getHtmlContents({
      schema,
      dependenciesMap,
    })
    await generateCommonFiles({
      dependenciesMap,
      tmpBuildDir,
      templateData: {
        extraImports,
        importContent,
        componentsContent,
        meta,
        routes,
        APP_ENV: env,
        isPreview,
        pageConfig,
      },
    })
    return
  }

  logger.info(`开始生成非页面文件...`)

  // 1. 生成除了页面之外的文件
  await generateCommonFiles({
    dependenciesMap,
    tmpBuildDir,
    templateData: {
      meta,
      routes,
      APP_ENV: env,
      extraImports,
      isPreview,
      pageConfig: (() => {
        try {
          const { pages, componentsTree } = schema
          const firstTreeId = pages?.[0]?.treeId
          const firstPage = componentsTree?.find(item => item.id === firstTreeId)
          return (firstPage && firstPage.pageConfig) || {}
        } catch (_) {
          return {}
        }
      })(),
    },
  })

  logger.info(`生成非页面文件完成`)

  logger.info(`开始生成页面...`)
  // 2. 生成页面
  await generatePages({
    schema,
    tmpBuildDir,
    dependenciesMap,
  })
  logger.info(`生成页面完成`)
}
