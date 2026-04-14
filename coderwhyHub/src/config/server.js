const dotEnv = require('dotenv')
// const SERVER_PORT = 8000
dotEnv.config()

// console.log(process)
module.exports = {
  SERVER_PORT
}  = process.env