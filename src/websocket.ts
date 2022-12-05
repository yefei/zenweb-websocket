import '@zenweb/inject';
import * as ws from 'ws';
import * as compose from 'koa-compose';
import { ServerResponse } from 'http';
import { Context, Middleware, SetupHelper } from '@zenweb/core';
import { RouterPath, Router } from '@zenweb/router';

const OPTION = Symbol('WebSocketHandlerClassOption');

// 统一 WebSocket 实体并用于注入识别
export class WebSocket {}
export interface WebSocket extends ws.WebSocket {}

/**
 * WebSocket 控制器类实例
 */
export interface WebSocketHandler {
  /**
   * 当客户端连接成功后
   */
  onConnection?(): void | Promise<void>;

  /**
   * 当客户端断开链接后
   */
  onClose?(): void;

  /**
   * 收到客户端消息
   */
  onMessage?(data: ws.Data): void | Promise<void>;
}

export interface WebSocketHandlerOption {
  path: RouterPath;
  middleware: Middleware[];
  wss: ws.WebSocketServer;
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
      wss: new ws.WebSocketServer({ noServer: true }),
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
      // 阻止非 Upgrade 请求
      if (!ctx.req.headers.upgrade) {
        ctx.throw(400, 'Invalid Upgrade header');
      }
      h.wss.handleUpgrade(ctx.req, ctx.socket, ctx._upgrade_head, async function done(ws) {
        ctx.injector.define(WebSocket, ws);

        ws.on('error', err => log(ctx, 'error', err));

        try {
          var cls = await ctx.injector.getInstance(h.handler);
        } catch (err: any) {
          log(ctx, 'getInstance error', err);
          ws.close();
          return;
        }

        cls.onClose && ws.on('close', () => cls.onClose());

        cls.onMessage && ws.on('message', async data => {
          try {
            await cls.onMessage(data);
          } catch (err: any) {
            log(ctx, 'onMessage error', err);
            ws.close();
          }
        });

        if (cls.onConnection) {
          try {
            await cls.onConnection();
          } catch (err: any) {
            log(ctx, 'onConnection error', err);
            ws.close();
          }
        }
      });
    }];
    router.get(h.path, ...middlewares);
  }
  setup.core.router.use(router.routes());
  setup.core.server.on('upgrade', (request, socket, head) => {
    const res = new ServerResponse(request);
    const ctx = setup.koa.createContext(request, res);
    ctx._upgrade_head = head;
    fn(ctx).catch(err => {
      log(ctx, 'upgrade error', err);
      socket.destroy();
    });
  });
}

function log(ctx: Context, msg: string, err?: Error) {
  msg = '[websocket] ' + msg;
  ctx.log ? ctx.log.child({ err }).error(msg) : console.error(msg, err);
}
