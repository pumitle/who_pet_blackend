// นำเข้าโมดูลที่ต้องการ
const mysql = require('mysql');
const util = require('util');

// สร้าง connection pool
const conn = mysql.createPool({
    connectionLimit: 10,
    host: "191.101.230.103",
    user: "u528477660_who",
    password: "7k7mX.uK",
    database: "u528477660_who"
});

// แปลง query เป็นแบบ asynchronous โดยใช้ promisify
const queryAsync = util.promisify(conn.query).bind(conn);

// ส่งออกตัวแปรที่ใช้ภายนอก
module.exports = { conn, queryAsync };
