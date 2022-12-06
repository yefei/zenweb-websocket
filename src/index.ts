import path = require('path');
import globby = require('globby');
import { SetupFunction } from '@zenweb/core';
import { getHandlerOption, handlerUpgrade } from './websocket';
import { WebSocketHandlerClass } from './types';
export * from './types';
export { websocket } from './websocket';

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
      const handlerList: WebSocketHandlerClass[] = [];
      for (const p of option.discoverPaths) {
        for (const file of await globby('**/*.{js,ts}', { cwd: p, absolute: true })) {
          const mod = require(file.slice(0, -3));
          for (const i of Object.values(mod)) {
            if (typeof i === 'function' && getHandlerOption(i)) {
              handlerList.push(<WebSocketHandlerClass> i);
            }
          }
        }
      }
      if (handlerList.length) {
        handlerUpgrade(setup, handlerList);
      }
    }
  }
}
