import { Context, Next } from 'koa';
import { env } from '../config';
import { UserInfo } from '../types';

let soaInstance: any;

const soa = {
  request: async (params: any) => {
    return {
      code: 200,
      resultJson: JSON.stringify({
        errorCode: 200,
        data: { userName: 'test' },
      }),
    };
  },
  init: async (params: any) => {
    return soa;
  },
};
async function getUserInfoByToken(token: string) {
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

  // 调用服务获取用户信息
  const res = await soa.request({
    iface: '',
    method: '',
    service: '',
    data: [ua, token],
  });
  if (res?.code === 200 && res?.resultJson) {
    const jsonData = JSON.parse(res.resultJson);
    if (jsonData?.errorCode === 200 && jsonData?.data?.userName) {
      return jsonData?.data as UserInfo;
    }
    throw new Error(`未获取到用户信息: ${res?.resultJson}`);
  } else {
    throw new Error(`未获取到用户信息: ${JSON.stringify(res)}`);
  }
}

const whiteList = [
  '/',
  '/health',
];

export const checkToken = () => {
  soaInstance = soa.init({
    env,
    appid: 'AppLowCodeCompilerService',
    dep: [
      'AppPivotUniformAccessCenter',
    ],
  });

  return async (ctx: Context, next: Next) => {
    if (whiteList.includes(ctx.path)) {
      await next();
      return;
    }
    console.warn(ctx.request.body)

    const token = ctx.headers?.token || (ctx.request.body as any)?.token;
    if (!token) {
      ctx.status = 401;
      ctx.body = { message: `Unauthorized: ${ctx.path}` };
      return;
    }

    try {
      await soaInstance;
      ctx.state.userInfo = await getUserInfoByToken(token);
    } catch (ex: any) {
      ctx.status = 401;
      ctx.body = { message: ex?.message };
      return;
    }

    await next();
  }
};