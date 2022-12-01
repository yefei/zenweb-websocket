import { create } from 'zenweb';
import modView from '@zenweb/view';
import websocket from '../src/index';

const app = create();
app.setup(websocket());
app.setup(modView({
  nunjucksConfig: {
    noCache: true,
  }
}));
app.start();
