import '@zenweb/inject';
import * as compose from 'koa-compose';
import { parse } from 'url';
import { Data, WebSocket, WebSocketServer } from 'ws';
import { Context, Middleware, SetupHelper } from '@zenweb/core';
import { RouterPath, Router } from '@zenweb/router';

const OPTION = Symbol('WebSocketHandlerClassOption');

/**
 * WebSocket 控制器类实例
 */
export interface WebSocketHandler {
  /**
   * 当客户端连接成功后
   */
  connection?(): void | Promise<void>;

  /**
   * 当客户端断开链接后
   */
  close?(): void | Promise<void>;

  /**
   * 收到客户端消息
   */
  message(data: Data): void | Promise<void>;
}

export interface WebSocketHandlerOption {
  path: RouterPath;
  middleware: Middleware[];
  wss: WebSocketServer;
  handler: { new (): WebSocketHandler };
}

/**
 * WebSocket 控制器注解
 */
export function websocket<C extends WebSocketHandler>({
  path,
  middleware,
}: {
  path: RouterPath,
  middleware?: Middleware | Middleware[],
}) {
  return function (target: { new (): C }) {
    const opt: WebSocketHandlerOption = {
      path,
      middleware: middleware ? (Array.isArray(middleware) ? middleware : [middleware]) : [],
      wss: new WebSocketServer({ noServer: true }),
      handler: target,
    };
    Reflect.defineMetadata(OPTION, opt, target);
  };
}

/**
 * 取得控制器选项
 */
export function getHandlerOption(target: any): WebSocketHandlerOption {
  return Reflect.getMetadata(OPTION, target);
}

/**
 * 处理 http.Server 的 upgrade 请求
 */
export function handlerUpgrade(setup: SetupHelper, handlerList: WebSocketHandlerOption[]) {
  const fn = compose(setup.koa.middleware);
  const router = new Router();
  for (const h of handlerList) {
    const middlewares = [...h.middleware, async (ctx: Context) => {
      console.log('sdfasdasdasdasdasd')
      h.wss.handleUpgrade(ctx.req, ctx.socket, ctx.head, async function done(ws) {
        const cls = await ctx.injector.getInstance(h.handler);
        cls.connection && await cls.connection();
        cls.close && ctx.websocket.on('close', () => cls.close());
        ctx.websocket.on('message', data => cls.message(data));
      });
    }];
    router.get(h.path, ...middlewares);
  }
  setup.core.server.on('upgrade', (request, socket, head) => {
    const ctx = setup.koa.createContext(request, {} as any);
    fn(ctx).catch(e => {
      console.log('ereee', e)
      socket.destroy();
    });
  });
}
