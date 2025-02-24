const express = require('express');
const { conn,queryAsync } = require('../dbcon');
const mysql = require('mysql');
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const router = express.Router();



//เรียกข้อมูลสัตว์เลี้ยง
router.get("/getpets", (req, res) => {
    const sql = `
        SELECT Pets.*, Animal_species.* 
        FROM Pets 
        INNER JOIN Animal_species ON Pets.id_species_fk = Animal_species.id_species
    `;

    conn.query(sql, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(result);
        }
    });
});


router.get("/getspecies", (req, res) => {
    const fk_typepets = req.query.id;  // ประเภทสัตว์เลี้ยงที่ต้องการค้นหา (เช่น "หมา" หรือ "แมว")

    if (!fk_typepets) {
        return res.status(400).json({ message: "Missing id parameter" });
    }

    // สร้าง SQL ที่เลือกข้อมูลเฉพาะจาก Animal_species ตามประเภทสัตว์ที่ต้องการ
    const sql = `
        SELECT Animal_species.* 
        FROM Animal_species 
        WHERE Animal_species.id_typepets_fk = ?  -- กรองตามประเภทสัตว์เลี้ยง
    `;

    conn.query(sql, [fk_typepets], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(result);  // ส่งกลับเฉพาะข้อมูลจาก Animal_species
        }
    });
});




//ดูข้อมูลสัตว์เลี้ยงของตัวเอง
router.get("/getmypet", async (req, res) => {
    const id_user = req.query.id;

    if (!id_user) {
        return res.status(400).json({ message: "Missing id_user parameter" });
    }

    const sql = `
    SELECT Users.*, Pets.*, Animal_species.* 
    FROM Users
    INNER JOIN Pets ON Users.id_user = Pets.id_user_fk
    INNER JOIN Animal_species ON Pets.id_species_fk = Animal_species.id_species
    WHERE Users.id_user = ?
`;

    try {

        conn.query(sql, [id_user], (err, result) => {
            if (err) {
                res.status(500).json({ message: "Error fetching user data", error: err.message });
            } else {
                res.json(result);
            }
        });


    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user data',
            error: error.message
        });
    }

    
});




//ค้นหาสัตว์เลี้ยงตามประเภทสัตวเลี้ยง
router.get("/searchpets", (req, res) => {
    const fk_typepets = req.query.id;  // ประเภทสัตว์เลี้ยงที่ต้องการค้นหา
    const searchQuery = req.query.search || ""; // คำที่ใช้ค้นหา (ถ้ามี)
    const my_id = req.query.my_id; // ID ของผู้ใช้ที่ต้องการยกเว้น

    if (!fk_typepets) {
        return res.status(400).json({ message: "Missing id_typepets parameter" });
    }

    if (!my_id) {
        return res.status(400).json({ message: "Missing my_id parameter" });
    }

    const sql = `
        SELECT Users.*, Pets.*, Animal_species.* 
        FROM Users
        INNER JOIN Pets ON Users.id_user = Pets.id_user_fk
        INNER JOIN Animal_species ON Pets.id_species_fk = Animal_species.id_species
        WHERE Animal_species.id_typepets_fk = ? 
        AND Pets.\`status of math\` = 'unsuccess'
        AND (Animal_species.species LIKE ? OR Pets.color LIKE ?)
        AND Pets.id_user_fk != ?  -- ห้ามแสดงสัตว์เลี้ยงของตัวเอง
    `;

    const searchPattern = `%${searchQuery}%`; // ค้นหาแบบ fuzzy match (LIKE '%คำค้นหา%')

    try {
        conn.query(sql, [fk_typepets, searchPattern, searchPattern, my_id], (err, result) => {
            if (err) {
                res.status(500).json({ message: "Error fetching data", error: err.message });
            } else {
                res.json(result);
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


//ค้นหาสัตว์เลี้ยงตามประเภทสัตวเลี้ยง แบบลึก
router.get("/searchFilpets", (req, res) => {
    const fk_typepets = req.query.fk_type;  // ประเภทสัตว์เลี้ยงที่ต้องการค้นหา
    const searchQuery = req.query.search || ""; // คำที่ใช้ค้นหา (ถ้ามี)
    const my_id = req.query.my_id; // ID ของผู้ใช้ที่ต้องการยกเว้น
    const furLength = req.query.fur_length; // ความยาวขน (short, medium, long)
    const sex = req.query.sex; // เพศของสัตว์เลี้ยง ('male' หรือ 'female')
    const agePet = req.query.age_pet; // อายุของสัตว์เลี้ยง (ช่วงอายุ)
    const furColor = req.query.fur_color; // สีขนของสัตว์เลี้ยง (เช่น ขาว, ดำ, น้ำตาล, เทา)
    
    const userLatitude = parseFloat(req.query.latitude);  // latitude ของผู้ใช้
    const userLongitude = parseFloat(req.query.longitude); // longitude ของผู้ใช้
    const distanceRange = req.query.distance_range || "0-3";  // ช่วงระยะห่าง เช่น 0-20 กิโลเมตร

    if (!fk_typepets) {
        return res.status(400).json({ message: "Missing id_typepets parameter" });
    }

    if (!my_id) {
        return res.status(400).json({ message: "Missing my_id parameter" });
    }

    // คำนวณเงื่อนไขระยะห่างตามช่วงที่ผู้ใช้ระบุ
    let distanceCondition = "";
    if (distanceRange === "0-3") {
        distanceCondition = "HAVING distance <= 3";
    } else if (distanceRange === "3-5") {
        distanceCondition = "HAVING distance > 3 AND distance <= 5";
    } else if (distanceRange === "5-10") {
        distanceCondition = "HAVING distance > 5 AND distance <= 10";
    } else if (distanceRange === "10+") {
        distanceCondition = "HAVING distance > 10";
    }

    // กำหนดเงื่อนไขการค้นหาความยาวขน
    let furCondition = "";
    if (furLength === "short") {
        furCondition = "AND Pets.`fur length` < 6";
    } else if (furLength === "medium") {
        furCondition = "AND Pets.`fur length` = 7";
    } else if (furLength === "long") {
        furCondition = "AND Pets.`fur length` > 7";
    }

    // กำหนดเงื่อนไขการค้นหาเพศ
    let sexCondition = "";
    if (sex === "male" || sex === "female") {
        sexCondition = "AND Pets.sex = ?";
    }

    // กำหนดเงื่อนไขการค้นหาช่วงอายุ
    let ageCondition = "";
    if (agePet === "1-3") {
        ageCondition = "AND Pets.age_pet BETWEEN 1 AND 3";
    } else if (agePet === "4-6") {
        ageCondition = "AND Pets.age_pet BETWEEN 4 AND 6";
    } else if (agePet === "7-9") {
        ageCondition = "AND Pets.age_pet BETWEEN 7 AND 9";
    } else if (agePet === "10+") {
        ageCondition = "AND Pets.age_pet >= 10";
    }

    // กำหนดเงื่อนไขการค้นหาสีขน
    let furColorCondition = "";
    if (furColor && ["สีขาว", "สีดำ", "สีน้ำตาล", "สีเทา"].includes(furColor)) {
        furColorCondition = "AND Pets.color = ?";
    }

    const sql = `
        SELECT Users.*, Pets.*, Animal_species.*, 
            ( 6371 * acos( cos( radians(?) ) * cos( radians(Pets.latitude) ) * cos( radians(Pets.longitude) - radians(?) ) + sin( radians(?) ) * sin( radians(Pets.latitude) ) ) ) AS distance 
        FROM Users
        INNER JOIN Pets ON Users.id_user = Pets.id_user_fk
        INNER JOIN Animal_species ON Pets.id_species_fk = Animal_species.id_species
        WHERE Animal_species.id_typepets_fk = ? 
        AND Pets.\`status of math\` = 'unsuccess'
        AND (Animal_species.species LIKE ? OR Pets.color LIKE ?)
        AND Pets.id_user_fk != ?  -- ห้ามแสดงสัตว์เลี้ยงของตัวเอง
        ${furCondition}  -- เพิ่มเงื่อนไขความยาวขน
        ${sexCondition}  -- เพิ่มเงื่อนไขเพศ
        ${ageCondition}  -- เพิ่มเงื่อนไขอายุ
        ${furColorCondition}  -- เพิ่มเงื่อนไขสีขน
        ${distanceCondition}  -- กรองสัตว์เลี้ยงตามระยะห่าง
        ORDER BY distance ASC;  -- เรียงตามระยะทางจากใกล้ไปไกล
    `;

    const searchPattern = `%${searchQuery}%`; // ค้นหาแบบ fuzzy match (LIKE '%คำค้นหา%')

    // กำหนดค่าพารามิเตอร์ของ SQL
    const params = [userLatitude, userLongitude, userLatitude, fk_typepets, searchPattern, searchPattern, my_id];

    // ถ้ามีการค้นหาเพศ ให้เพิ่มพารามิเตอร์
    if (sexCondition) {
        params.push(sex);
    }

    // ถ้ามีการค้นหาช่วงอายุ ให้เพิ่มพารามิเตอร์
    if (ageCondition) {
        // ไม่มีตัวแปร placeholder สำหรับอายุ
    }

    // ถ้ามีการค้นหาสีขน ให้เพิ่มพารามิเตอร์
    if (furColorCondition) {
        params.push(furColor);
    }

    try {
        conn.query(sql, params, (err, result) => {
            if (err) {
                res.status(500).json({ message: "Error fetching data", error: err.message });
            } else {
                res.json(result);  // ส่งผลลัพธ์ที่คำนวณระยะห่างในหน่วยกิโลเมตร
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});










// ส่งออก router
module.exports = { router };