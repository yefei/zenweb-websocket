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

  connection() {
    this.ctx.websocket.send('欢迎来到聊天室！当前在线用户 ' + localUsers.size + ' 人');
    localUsers.add(this.ctx.websocket);
  }

  close() {
    localUsers.delete(this.ctx.websocket);
    this.sendAll((this.name || '游客') + ' 离线，剩余 ' + localUsers.size + ' 人在线');
  }

  message(data: Data) {
    if (!this.name) {
      this.name = data.toString();
      this.sendAll(this.name + ' 来了');
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
