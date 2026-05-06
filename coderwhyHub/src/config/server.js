const dotEnv = require('dotenv')
// const SERVER_PORT = 8000
dotEnv.config()

// console.log(process)
console.log('SERVER_PORT:', process.env.SERVER_PORT)
module.exports = {
  SERVER_PORT,
  SERVER_HOST
}  = process.env