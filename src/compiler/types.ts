// 低代码编译器 Schema 类型定义

/** 组件属性值类型 */
export type PropValue = string | number | boolean | object | any[];

/** 组件映射配置 */
export interface ComponentMap {
  /** 组件名称 */
  componentName: string;
  /** 包名 */
  package: string;
  /** 版本号 */
  version: string;
  /** 是否解构导入 */
  destructuring?: boolean;
  /** 导出名称 */
  exportName?: string;
  // 新增: 导出路径，/开头
  // 例如: import { Button } from 'xxx/dist/components/button/button.js' 中
  // path为 "/dist/components/button/button.js"
  path?: string;
  /** 需要同时额外导入的文件，例如css */
  extraImports?: {
    path: string;
  }[];
}

/** 修改: 工具库 */
export interface Util {
  /** 包名 */
  package: string;
  /** 版本号 */
  version: string;
}

/** 组件树节点 */
export interface ComponentTree {
  /** 页面/组件ID，作为页面ID时同时也作为fileName */
  id?: string;
  /** 组件名称 */
  componentName: string;
  /** 组件属性 */
  props?: Record<string, PropValue>;
  /** CSS 样式（预留，暂未使用） */
  // css?: string;
  /** 子组件 */
  children?: ComponentTree[];
  /** 页面配置 */
  pageConfig?: PageConfig;
}

/** 页面配置类型 */
export interface PageConfig {
  title: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  fontSize: string;
  padding: string;
}
/** 主题配置 */
export interface Theme {
  /** 主题包名 */
  package?: string;
  /** 主题版本 */
  version?: string;
  /** 主色调 */
  primary?: string;
}

/** 布局配置 */
export interface Layout {
  /** 布局组件名称 */
  componentName?: string;
  /** 布局属性 */
  props?: Record<string, PropValue>;
}

/** 应用配置 */
export interface Config {
  /** SDK 版本 */
  sdkVersion?: string;
  /** 历史记录模式 */
  historyMode?: 'hash' | 'browser';
  /** 根容器 ID */
  targetRootID?: string;
  /** 布局配置 */
  layout?: Layout;
  /** 主题配置 */
  theme?: Theme;
}

/** 应用元数据 */
export interface Meta {
  /** 应用名称 */
  name?: string;
  /** 应用版本号 */
  appVersion: string;
  // /** Git 分组 */
  // git_group?: string;
  /** 项目名称 */
  project_name: string;
  /** 应用描述 */
  description?: string;
  /** SPM A 位信息 */
  spma?: string;
  /** 创建者 */
  creator?: string;
  /** 创建时间 */
  gmt_create?: string;
  /** 修改时间 */
  gmt_modified?: string;
}

/** 国际化配置 */
export interface I18n {
  /** 语言代码映射的翻译内容 */
  [locale: string]: Record<string, string>;
}

/** 路由项 */
export interface Route {
  /** url中的路径 */
  path: string;
  /** 对应的页面ID，与page中的id一致，同时也作为文件名 */
  page: string;
  /** 实际的文件路径，通过`./pages/${page}`拼接生成 */
  pagePath?: string
}

/** 路由配置 */
export interface Router {
  /** 基础 URL（预留，暂未使用） */
  // baseUrl?: string;
  /** 历史记录模式（预留，暂未使用），当前只支持hash模式 */
  // historyMode?: 'hash' | 'browser';
  /** 路由列表 */
  routes?: Route[];
}

/** 页面配置 */
export interface Page {
  /** 页面 ID */
  id: string;
  /** 对应的组件树 ID（待确认，是否只需保留id） */
  treeId: string;
}

/** 低代码 Schema 主接口 */
export interface Schema {
  /** 协议版本号 */
  version: string;
  /** 组件映射配置 */
  componentsMap?: ComponentMap[];
  /** 工具函数配置 */
  utils?: Util[];
  /** 组件树 */
  componentsTree: ComponentTree[];
  /** 常量配置（预留，暂未使用） */
  // constants?: Record<string, string>;
  /** 全局 CSS（预留，暂未使用） */
  // css?: string;
  /** 应用配置（预留，暂未使用） */
  // config?: Config;
  /** 应用元数据 */
  meta: Meta;
  /** 国际化配置（预留，暂未使用） */
  // i18n?: I18n;
  /** 路由配置 */
  router?: Router;
  /** 页面配置 */
  pages: Page[];
}

export interface Options {
  /** 构建 ID */
  buildId: string;
  /** 模板所在目录 */
  templatePath: string;
  /** 环境 */
  env: ENV;

  /* 以下为可选参数 */

  /** 是否将产物和日志上传到oss，并且删除本地产物 */
  uploadToOss?: boolean;
  /** 是否生成预览水印 */
  isPreview?: boolean;
}

export type ENV = 'fat' | 'uat' | 'pre' | 'pro'

export type BuildResult = {
  url?: string,
  logUrl: string,
  buildId: string,
  message?: string,
}