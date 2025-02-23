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



















// ส่งออก router
module.exports = { router };