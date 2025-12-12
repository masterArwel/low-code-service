export type ENV = "dev" | "test" | "pro";

export const env: ENV = (() => {
  try {
    const env = require('../env.js');
    return env as ENV;
  } catch (error) {
    return 'pro';
  }
})()
