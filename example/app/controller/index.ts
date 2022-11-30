import { Context, inject, mapping } from 'zenweb';

export class IndexController {
  @inject ctx: Context;

  @mapping()
  index() {
    this.ctx.success({
      url: 'test'
    });
  }

  ws() {

  }
}
