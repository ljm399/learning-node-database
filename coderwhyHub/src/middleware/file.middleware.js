const multer = require("@koa/multer");
const { UPLOAD_PATH } = require("../config/path");

// 上传图片的中间件
const upload = multer({ dest: UPLOAD_PATH });
const avatarUpload = upload.single("avatar");

// 上传其他图片

module.exports = {
  avatarUpload,
};
