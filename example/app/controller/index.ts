import { Context, inject, mapping } from 'zenweb';
import { websocket, WebSocket } from '../../../src';

const localUsers = new Set<WebSocket>();

@websocket({ path: '/ws' })
export class Handler {
  @inject ctx: Context;
  @inject ws: WebSocket;
  name: string;

  @mapping()
  index() {
    return this.ctx.render('index');
  }

  onConnection() {
    this.ws.send(this.ctx.ip + ' 欢迎来到聊天室！当前在线用户 ' + localUsers.size + ' 人');
    localUsers.add(this.ws);
  }

  onClose() {
    localUsers.delete(this.ws);
    this.sendAll((this.name || this.ctx.ip) + ' 离线，剩余 ' + localUsers.size + ' 人在线');
  }

  onMessage(data: Buffer) {
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
