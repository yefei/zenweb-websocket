import '@zenweb/inject';
import * as ws from 'ws';
import * as compose from 'koa-compose';
import { ServerResponse } from 'http';
import { Context, Middleware, SetupHelper } from '@zenweb/core';
import { WebSocket, WebSocketHandlerClass, WebSocketServerOption } from './types';

const OPTION = Symbol('WebSocketHandlerClassOption');

/**
 * WebSocket 控制器注解
 */
export function websocket(opt: WebSocketServerOption) {
  return function (target: WebSocketHandlerClass) {
    Reflect.defineMetadata(OPTION, opt, target);
  };
}

/**
 * 取得控制器选项
 */
export function getHandlerOption(target: any): WebSocketServerOption {
  return Reflect.getMetadata(OPTION, target);
}

/**
 * 处理 http.Server 的 upgrade 请求
 */
export function handlerUpgrade(setup: SetupHelper, handlerList: WebSocketHandlerClass[] ) {
  const pathMap = new Map<string, {
    middlewares: Middleware[],
    wss: ws.WebSocketServer,
    handler: WebSocketHandlerClass,
    failCloseCode: number,
    errorCloseCode: number,
  }>();
  for (const handler of handlerList) {
    const opt = getHandlerOption(handler);
    setup.debug('handler:', opt.path, '=>', handler);
    pathMap.set(opt.path, {
      middlewares: opt.middleware ? (Array.isArray(opt.middleware) ? opt.middleware : [opt.middleware]) : [],
      wss: new ws.WebSocketServer({
        ...opt,
        noServer: true,
      }),
      handler,
      failCloseCode: opt.failCloseCode || 4000,
      errorCloseCode: opt.errorCloseCode || 4999,
    });
  }

  setup.core.server.on('upgrade', (request, socket, head) => {
    const res = new ServerResponse(request);
    const ctx = setup.koa.createContext(request, res);
    const matched = pathMap.get(ctx.path);
    if (matched) {
      const fn = compose([...setup.koa.middleware, ...matched.middlewares]);
      matched.wss.handleUpgrade(request, socket, head, function done(ws) {
        ctx.injector.define(WebSocket, ws);
        ws.on('error', err => log(ctx, 'error', err));
        fn(ctx, () => new Promise((resolve, reject) => {
          (async () => {
            const cls = await ctx.injector.getInstance(matched.handler);
            cls.onClose && ws.on('close', async () => {
              try {
                await cls.onClose();
              } catch (err: any) {
                log(ctx, 'onClose error', err);
              }
            });
            cls.onMessage && ws.on('message', async data => {
              try {
                await cls.onMessage(data);
              } catch (err: any) {
                reject(err);
              }
            });
            cls.onConnection && await cls.onConnection();
          })().catch(reject);
        })).then(() => {
          // 处理异常信息
          ws.close(matched.failCloseCode,
            Buffer.isBuffer(ctx.body) || 'string' === typeof ctx.body
            ? ctx.body
            : JSON.stringify({ status: ctx.status, error: ctx.body }));
        }, err => {
          ctx.onerror(err);
          ws.close(matched.errorCloseCode, err);
        });
      });
    } else {
      socket.destroy();
    }
  });
}

function log(ctx: Context, msg: string, err?: Error) {
  msg = '[websocket] ' + msg;
  ctx.log ? ctx.log.child({ err }).error(msg) : console.error(msg, err);
}
