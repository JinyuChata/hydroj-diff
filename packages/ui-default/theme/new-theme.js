// import './normalize.css'

// 自动读取styles目录下的所有css文件
const cssReq = require.context('./styles', true, /\.css$/i);
cssReq.keys().map((key) => cssReq(key));
