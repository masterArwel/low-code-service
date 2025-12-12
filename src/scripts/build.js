const { build } = require('@hb/lowcode-compiler');

process.on('message', async (message) => {
  try {
    const { schema, templatePath, buildId, env } = message;
    const res = await build(schema, {
      buildId,
      templatePath,
      env,
    });
    process.send(res);
  } catch (ex) {
    process.send({
      isError: true,
      message: ex.message || '编译出现异常',
      stack: ex.stack,
    })
  }
});