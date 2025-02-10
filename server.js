// app.js (สมมติว่าคุณมีไฟล์ app.js ที่ export app)
const http = require("http");
const { app } = require("./app");

const port = process.env.port || 3000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log("Server is started");
});
