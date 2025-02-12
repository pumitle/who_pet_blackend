const express = require('express');
const { conn,queryAsync } = require('../dbcon');
const mysql = require('mysql');
const jwt = require('jsonwebtoken'); 

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




// ส่งออก router
module.exports = { router };