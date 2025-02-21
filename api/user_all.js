const express = require('express');
const { conn,queryAsync } = require('../dbcon');
const mysql = require('mysql');
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const router = express.Router();



router.get("/",(req,res)=>{

    const sql = "select * from Users";
    conn.query(sql,(err,result)=>{
        if(err){
            res.json(err);
        }else{
            res.json(result);
        }
    });

});



//register User
router.post("/registerU" , (req,res)=> {
    const {email,name,img_user,password,phone,line,instagram,facebook} = req.body;

         // ตรวจสอบไม่ให้มีการกรอกค่าว่างหรือกรอกแต่ช่องว่าง
    if (!name || !phone || !email || !password ||        
    name.trim() === ''  || phone.trim() === '' ||
    email.trim() === '' || password.trim() === '') {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนและไม่เป็นช่องว่าง' });
}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // ตรวจสอบว่าอีเมลหรือเบอร์โทรศัพท์มีอยู่แล้วในฐานข้อมูลหรือไม่
    const checkQuery = `SELECT phone FROM Users WHERE email = ? or phone = ? `;

    conn.query(checkQuery,[email,phone],(err,result)=>{
        // ถ้าเจอผู้ใช้ที่มีอีเมลหรือเบอร์โทรซ้ำกัน
        if (result.length > 0) {
            return res.status(400).json({ error: 'มีผู้ใช้ที่ใช้ email หรือเบอร์โทรนี้แล้ว' });
          }
        
        const insertQuery = `INSERT INTO Users (email,name,img_user,password,phone,line,instagram,facebook,type) VALUES (?,?,?,?,?,?,?,?,?)`;
        conn.query(insertQuery ,[email,name,img_user,password,phone,line,instagram,facebook,'user'], (err,result)=> {
            if (err) {
                console.error('Error during registration:', err);
                return res.status(500).json({ error: 'Error during registration' });
            }
            return res.status(200).json({ success: true, user: result, message: 'Register successful' });
        });
    });

});


 //login 
 router.post("/login" , (req,res)=> {
    const {email,password} = req.body;

    if (!email|| !password) {
        return res.status(400).json({ error: "email and password are required" });
    }

    const sql = "SELECT * FROM Users WHERE email = ? AND password = ? ";
    conn.query(sql,[email,password], (err,result) => {
        if(err) {
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if(result.length > 0) {
            const user = result[0];
            const userRes = {
                Uid: user.id_user,
                email: user.email,
                name: user.name,
                img_user: user.img_user,
                password: user.password,
                phone: user.phone,
                line: user.line,
                instagram: user.instagram,
                facebook: user.facebook,
                type: user.type
            };
            return res.json({ message: "Login successful", user: userRes });
        } else {
            return res.status(401).json({ error: "Invalid email or password" });
        }
    });

 });



 ///ลืมรหัส 

 const resetTokens = {}; // เก็บโทเค็นและวันหมดอายุ

// เส้นทางสำหรับลืมรหัสผ่าน
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    
    // สร้างเลขยืนยันตัวตน 6 หลัก
    const verificationCode = Math.floor(100000 + Math.random() * 900000); // สร้างเลข 6 หลัก
    
    // เก็บเลขยืนยันตัวตนและวันหมดอายุในหน่วยความจำ
    const expires = new Date(Date.now() + 60000); // หมดอายุใน 1 ชั่วโมง
    resetTokens[verificationCode] = { email, expires };
    
    // สร้างลิงก์สำหรับยืนยันตัวตน
    const resetLink = `app://reset-password?code=${verificationCode}`;

    // ตั้งค่าการส่งอีเมล
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'whopetsandlove@gmail.com',  // ใส่อีเมลตรงๆ
        pass: 'woxm cqno eowo odwx'        // ใส่รหัสผ่านตรงๆ
      }
    });
  
    const mailOptions = {
      from: 'whopetsandlove@gmail.com',
      to: email,
      subject: 'รหัสยืนยันตัวตนสำหรับรีเซ็ตรหัสผ่าน',
      html: `
      <div style="display: flex; justify-content: flex-end; align-items: center; height: 100vh; font-family: Arial, sans-serif; text-align: center; background-color: #f4f4f9; padding-right: 20px;">
        <div>
          <h1 style="font-size: 44px; color: #333; align-items: center;" >รหัสยืนยันตัวตน</h1>
          <p style="font-size: 36px; color:rgb(164, 6, 6); font-weight: bold;">${verificationCode}</p>
          <p style="font-size: 18px; color: #555;">กรุณาใช้รหัสนี้เพื่อรีเซ็ตรหัสผ่านของคุณ</p>
        </div>
      </div>`
    };
  
    // ส่งอีเมล
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error:', err);  // แสดงรายละเอียดข้อผิดพลาด
          return res.status(500).json({ message: 'ส่งอีเมลไม่สำเร็จ' });
        }
        res.json({ message: 'ส่งรหัสยืนยันตัวตนแล้ว' });
    });
});


// // 📌 ตรวจสอบรหัสยืนยันตัวตน
// router.post('/reset-password', (req, res) => {
//     const { verificationCode, email, newPassword } = req.body;
  
//     // ตรวจสอบว่าโค้ดที่ผู้ใช้กรอกถูกต้องหรือไม่
//     if (!resetTokens[verificationCode]) {
//       return res.status(400).json({ message: 'รหัสยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ' });
//     }
  
//     const tokenData = resetTokens[verificationCode];
  
//     // ตรวจสอบว่าโค้ดหมดอายุหรือไม่
//     if (new Date() > tokenData.expires) {
//       delete resetTokens[verificationCode];  // ลบโค้ดที่หมดอายุออกจากหน่วยความจำ
//       return res.status(400).json({ message: 'รหัสยืนยันตัวตนหมดอายุ' });
//     }
  
//     // ตรวจสอบว่าอีเมลตรงกับที่เก็บในหน่วยความจำ
//     if (tokenData.email !== email) {
//       return res.status(400).json({ message: 'อีเมลไม่ตรงกับรหัสยืนยันตัวตน' });
//     }
  
//     // รีเซ็ตรหัสผ่าน
//     const updateQuery = 'UPDATE Users SET password = ? WHERE email = ?';
//     conn.query(updateQuery, [newPassword, email], (err, updateResult) => {
//       if (err) return res.status(500).json({ message: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' });
      
//       // ลบโค้ดจากหน่วยความจำหลังการใช้งาน
//       delete resetTokens[verificationCode];
  
//       res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
//     });
//   });
  
  // 📌 ตรวจสอบรหัสยืนยันตัวตน
router.post('/verify-code', (req, res) => {
  const { verificationCode, email } = req.body;

  // ตรวจสอบว่ามีรหัสอยู่ในหน่วยความจำหรือไม่
  if (!resetTokens[verificationCode]) {
      return res.status(400).json({ message: 'รหัสยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ' });
  }

  const tokenData = resetTokens[verificationCode];

  // ตรวจสอบวันหมดอายุ
  if (new Date() > tokenData.expires) {
      delete resetTokens[verificationCode];  // ลบโค้ดที่หมดอายุ
      return res.status(400).json({ message: 'รหัสยืนยันตัวตนหมดอายุ' });
  }

  // ตรวจสอบว่าอีเมลตรงกันหรือไม่
  if (tokenData.email !== email) {
      return res.status(400).json({ message: 'อีเมลไม่ตรงกับรหัสยืนยันตัวตน' });
  }

  // รหัสถูกต้อง ✅
  res.json({ message: 'รหัสยืนยันตัวตนถูกต้อง' });
});

// 📌 เปลี่ยนรหัสผ่าน
router.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;

  // ตรวจสอบว่าอีเมลมีอยู่ในระบบหรือไม่
  const updateQuery = 'UPDATE Users SET password = ? WHERE email = ?';
  conn.query(updateQuery, [newPassword, email], (err, updateResult) => {
      if (err) return res.status(500).json({ message: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' });

      res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  });
});



// ส่งออก router
module.exports = { router };