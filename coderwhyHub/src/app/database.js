const mysql = require('mysql2')

// 1.创建连接池
const mysqlConnectPool = mysql.createPool({
  host:'localhost',
  port:'3306',
  user:'root',
  password:'',
  database:'coderhub',
  connectionLimit:5
})

// 2.获取连接池中的链接是否失败
mysqlConnectPool.getConnection((err, connection)=>{
  // 1.判断是否连接失败
  if(err) {
    console.log(err,'获取连接失败');
    return
  }

  // 2.获取connection，尝试和数据库建立连接
  connection.connect(err => {
    if(err) {
      console.log(err,'连接失败');
      return
    }
    console.log('连接成功');
  })
})

// 3.获取连接池中的连接对象（promise）
const connection = mysqlConnectPool.promise()
module.exports = connection