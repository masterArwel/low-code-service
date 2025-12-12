
import { env } from '../config';
const ServerSDK = {};
export const remoteConfig = new ServerSDK({
  project: 'AppLowCodeCompileService',
  env: env,
});

export const getLatestTemplateVersion = async ({
  namespace,
}: {
  namespace: string;
}) => {
  const templateConfig = await remoteConfig.get<{ version: string }>(`${namespace}_templates`, null, {
    fromCache: false,
  });
  return templateConfig?.version || '';
}