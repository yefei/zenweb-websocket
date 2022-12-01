import '@zenweb/inject';
import * as http from 'http';
import { parse } from 'url';
import { Data, WebSocket, WebSocketServer } from 'ws';
import { Middleware } from '@zenweb/core';

const OPTION = Symbol('WebSocketHandlerClassOption');

/**
 * WebSocket 控制器类实例
 */
export interface WebSocketHandler {
  /**
   * 当客户端连接成功后
   */
  connection?(ws: WebSocket): void | Promise<void>;

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
  path: string;
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
  path: string,
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
export function handlerUpgrade(server: http.Server, handlerList: WebSocketHandlerOption[]) {
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    for (const opt of handlerList) {
      if (pathname === opt.path) {
        opt.wss.handleUpgrade(request, socket, head, async function done(ws) {
          const cls = new opt.handler();
          cls.connection && await cls.connection(ws);
          cls.close && ws.on('close', () => cls.close());
          ws.on('message', data => cls.message(data));
        });
        return;
      }
    }
    socket.destroy();
  });
}
