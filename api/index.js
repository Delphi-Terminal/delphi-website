import { createApp } from '../server/index.js';

let handler;

export default async function (req, res) {
  if (!handler) {
    const { app } = await createApp();
    handler = app;
  }
  return handler(req, res);
}
