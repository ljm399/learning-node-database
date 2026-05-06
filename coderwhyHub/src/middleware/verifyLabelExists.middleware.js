const labelServer = require("../server/label.server");

const verifyLabelExists = async (ctx, next) => {
  let body = ctx.request.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      body = {};
    }
  }

  const { labels = [] } = body || {};
  console.log(labels, 'labels');
  const newLabels = [];
  for (const name of labels) {
    if (!name) continue;

    const label = await labelServer.queryLabelByName(name);
    const labelId = label ? label.id : (await labelServer.create(name))[0].insertId;
    newLabels.push({ id: labelId, name });
  }

  ctx.labels = newLabels;
  await next();
};

module.exports = {
  verifyLabelExists,
};
