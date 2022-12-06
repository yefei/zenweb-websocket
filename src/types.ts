import { Middleware } from '@zenweb/core';
import * as ws from 'ws';

export type WebSocketServerOption = Pick<ws.ServerOptions,
  'path'
  | 'verifyClient'
  | 'handleProtocols'
  | 'clientTracking'
  | 'perMessageDeflate'
  | 'maxPayload'
  | 'skipUTF8Validation'
  > & {
  middleware?: Middleware | Middleware[],
};

/**
 * 统一 WebSocket 实体并用于注入识别
 */
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
  onClose?(): void | Promise<void>;

  /**
   * 收到客户端消息
   */
  onMessage?(data: ws.Data): void | Promise<void>;
}

export type WebSocketHandlerClass = { new (): WebSocketHandler };
