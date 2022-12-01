import path = require('path');
import globby = require('globby');
import { SetupFunction } from '@zenweb/core';
import { getHandlerOption, handlerUpgrade, WebSocketHandlerOption } from './websocket';
export { websocket, WebSocketHandler, WebSocketHandlerOption } from './websocket';
export { WebSocket, Data } from 'ws';

export interface WebSocketOption {
  discoverPaths?: string[];
}

const defaultRouterOption: WebSocketOption = {
  discoverPaths: [path.join(process.cwd(), 'app', 'controller')],
};

export default function setup(option?: WebSocketOption): SetupFunction {
  option = Object.assign({}, defaultRouterOption, option);
  return async function websocket(setup) {
    setup.debug('option: %o', option);
    setup.checkCoreProperty('injector', '@zenweb/inject');
    if (option.discoverPaths && option.discoverPaths.length) {
      const handlerList: WebSocketHandlerOption[] = [];
      for (const p of option.discoverPaths) {
        for (const file of await globby('**/*.{js,ts}', { cwd: p, absolute: true })) {
          const mod = require(file.slice(0, -3));
          for (const i of Object.values(mod)) {
            if (typeof i === 'function') {
              const option = getHandlerOption(i);
              if (option) {
                handlerList.push(option);
              }
            }
          }
        }
      }
      if (handlerList.length) {
        handlerUpgrade(setup.core.server, handlerList);
      }
    }
  }
}
