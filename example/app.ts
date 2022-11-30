import { create } from 'zenweb';
import websocket from '../src/index';

const app = create();
app.setup(websocket());
app.start();
