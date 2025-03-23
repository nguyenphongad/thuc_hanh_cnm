const express = require('express');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
app.use(express.static('./views'));
app.set('view engine', 'ejs');
app.set('views', './views');




const dbClient = new DynamoDBClient({
    region: "ap-southeast-2",
    credentials: {
        accessKeyId: " ",
        secretAccessKey: " "
    }
});

const docClient = DynamoDBDocumentClient.from(dbClient);
const tableName = "SanPham";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const multer = require("multer")

const upload = multer();




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
app.post('/insert', async (req, res) => {
    let { ma_sp, ten_sp, so_luong } = req.body; 

    if (!ma_sp) {
        return res.status(400).send('Thiếu mã sản phẩm (ma_sp)');
    }

    ma_sp = Number(ma_sp); 

    const params = {
        TableName: tableName,
        Item: {
            ma_sp: ma_sp,
            ten_sp: ten_sp,
            so_luong: so_luong
        }
    };

    try {
        const command = new PutCommand(params);
        await docClient.send(command);  // Gửi lệnh PutCommand

        console.log('Thêm sản phẩm thành công');

        res.redirect('/');
    } catch (err) {
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).send('Lỗi khi thêm sản phẩm');
    }
});

// delete: xoa san pham
app.post('/delete', async (req, res) => {
    let { ma_sp  } = req.body; 

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
