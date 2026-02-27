const fs = require('fs');

fs.open('./text.txt',(err,fd)=>{
  if(err) {
    confirm('文件打开失败',err);
  }

  // 获取文件描述符
  console.log(fd)
  // 读取文件内容
  fs.fstat(fd,(err,stats)=>{
    if(err) return
    console.log(stats)

    // 记得手动关闭文件
    fs.close(fd,(err)=>{
      if(err) return
      console.log('文件关闭成功')

    })
  })

})