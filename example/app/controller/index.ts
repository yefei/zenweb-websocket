import { Context, inject, mapping } from 'zenweb';
import { websocket, WebSocket, Data } from '../../../src';

const localUsers = new Set<WebSocket>();

@websocket({ path: '/ws' })
export class Handler {
  @inject ctx: Context;
  ws: WebSocket;

  name: string;

  @mapping()
  index() {
    return this.ctx.render('index');
  }

  connection(ws: WebSocket) {
    this.ws = ws;
    console.log('on connection:');
    localUsers.add(ws);
    ws.send('欢迎来到聊天室！当前在线用户 ' + localUsers.size + ' 人');
  }

  close() {
    console.log('on close:');
    localUsers.delete(this.ws);
    this.sendAll(this.name + ' 离线');
  }

  message(data: Data) {
    console.log('on message:' + data);
    if (!this.name) {
      this.name = data.toString();
      this.sendAll(this.name + ' 上线');
    } else {
      this.sendAll(this.name + ': ' + data.toString());
    }
  }

  sendAll(msg: string) {
    for (const ws of localUsers.values()) {
      ws.send(msg);
    }
  }
}
