const express = require("express");
const multer = require("multer");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytesResumable, getDownloadURL } = require("firebase/storage");

const router = express.Router();





// ส่งออก router
module.exports = { router };