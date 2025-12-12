import Router from 'koa-router';
import { UserInfo } from '../types';
import defaultRouter from './default';
import compileRouter from './compile';
import templateRouter from './template';

const router = new Router<{ userInfo: UserInfo }>();

router.use('', defaultRouter.routes());
router.use('/compile', compileRouter.routes());
router.use('/template', templateRouter.routes());

export default router; 