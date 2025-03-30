const express = require('express');

const { v4: uuid } = require("uuid");

const AWS = require("aws-sdk");
const path = require("path");


const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
app.use(express.static('./views'));
app.set('view engine', 'ejs');
app.set('views', './views');


const region = "ap-southeast-2";
const accessKeyId = " ";
const secretAccessKey = " ";


const dbClient = new DynamoDBClient({
    region: region,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    }
});

const docClient = DynamoDBDocumentClient.from(dbClient);

const S3 = new AWS.S3({
    region: region,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    }
})


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const multer = require("multer")


const bucketName = "lab07phong";
const CLOUD_FRONT_URL = "https://d1ua4k3mey2l8p.cloudfront.net";
const tableName = "SanPham";


const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 2000000 },
    fileFilter(req, file, cb) {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        return extname && mimetype ? cb(null, true) : cb(new Error("Chỉ chấp nhận định dạng ảnh"));
    }
});







// Scan: Lấy toàn bộ dữ liệu trong bảng
app.get("/", async (req, res) => {
    try {
        const command = new ScanCommand({ TableName: tableName });
        const data = await docClient.send(command);
        res.render("index", { sanPhams: data.Items });
    } catch (err) {
        console.error("Lỗi quét bảng:", err);
        res.status(500).send("Internal Server Error");
    }
});


// Insert: Thêm sản phẩm mới
app.post('/insert', upload.single("image"), async (req, res) => {

    console.log("Dữ liệu nhận được từ form:", req.body);
    console.log("File tải lên:", req.file);

    if (!req.file) {
        return res.status(400).send("Không có file ảnh được tải lên");
    }


    let { ma_sp, ten_sp, so_luong } = req.body;


    if (!ma_sp) {
        return res.status(400).send('Thiếu mã sản phẩm (ma_sp)');
    }

    ma_sp = Number(ma_sp);

    let img_url = "";

    if (req.file) {
        try {
            const filename = `${uuid()}${path.extname(req.file.originalname)}`;
            const params = {
                Bucket: bucketName,
                Key: filename,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            }


            await S3.upload(params).promise();

            img_url = `${CLOUD_FRONT_URL}/${filename}`;


        } catch (error) {
            console.error("Lỗi khi tải lên ảnh:", error);
            return res.status(500).send("Lỗi khi tải lên ảnh");
        }
    }


    const params = {
        TableName: tableName,
        Item: {
            ma_sp: ma_sp,
            ten_sp: ten_sp,
            so_luong: so_luong,
            image_url: img_url
        }
    };

    try {
        await docClient.send(new PutCommand(params));
        console.log('Thêm sản phẩm thành công');
        res.redirect('/');

    } catch (err) {
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).send('Lỗi khi thêm sản phẩm');
    }
});

// delete: xoa san pham
app.post('/delete', async (req, res) => {
    let { ma_sp } = req.body;

    if (!ma_sp || !Array.isArray(ma_sp) || ma_sp.length === 0) {
        return res.status(400).send('Thiếu mã sản phẩm để xoá (ma_sp)');
    }

    for (let i = 0; i < ma_sp.length; i++) {
        const params = {
            TableName: tableName,
            Key: { ma_sp: Number(ma_sp[i]) }
        };

        try {
            const command = new DeleteCommand(params);
            await docClient.send(command);  // Gửi lệnh xóa
            console.log('Xoá sản phẩm thành công: ' + ma_sp[i]);
        } catch (err) {
            console.error('Lỗi khi Xoá sản phẩm:', err);
            return res.status(500).send('Lỗi khi Xoá sản phẩm');
        }
    }

    res.redirect('/');
});


// run port
app.listen(9000, () => {
    console.log('Server đang chạy trên cổng 9000');
});
