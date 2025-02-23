const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// นำเข้าส่วนที่ต้องการจาก API ต่างๆ
const { router: user_all} = require('./api/user_all');
const {router: funcT} = require('./api/funtion');



// สร้าง instance ของ Express
const app = express();

// ตั้งค่า CORS
app.use(
    cors({
      origin: "*",
    })
);

// ตั้งค่า body-parser
app.use(bodyParser.text());
app.use(bodyParser.json());

// ตั้งค่า routes

app.use("/user",user_all);
app.use("/func",funcT);
// app.use("/upload",upimage);

// ส่งออก app
module.exports = { app };
