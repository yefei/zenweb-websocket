import { Context, inject, mapping } from 'zenweb';
import { websocket, WebSocket, Data } from '../../../src';

@websocket({ path: '/ws' })
export class Handler {
  @inject ctx: Context;
  ws: WebSocket;

  @mapping()
  index() {
    return this.ctx.render('index');
  }

  connection(ws: WebSocket) {
    this.ws = ws;
    console.log('on connection:', ws);
    ws.send('Welcome!');
  }

  close() {
    console.log('on close:');
  }

  message(data: Data) {
    console.log('on message:', data);
    this.ws.send('reply:' + data.toString());
  }
}
