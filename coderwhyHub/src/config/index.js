const fs = require("fs");
const path = require("path");
const privateKey = fs.readFileSync(
  path.join(__dirname, "keys/private.key"),
  "utf8",
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "keys/public.key"),
  "utf8",
);
module.exports = {
  privateKey,
  publicKey,
};
