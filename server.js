const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// Khởi tạo connection pool tới PostgreSQL Database service
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespassword',
    database: process.env.DB_NAME || 'taskdb',
});

app.use(express.json());

// Endpoint chính thức
app.get('/', async (req, res) => {
    try {
        const client = await pool.connect();
        const dbRes = await client.query('SELECT NOW() as current_time, current_database() as db_name;');
        client.release();

        res.json({
            status: 'success',
            service: 'Backend Orchestrated by Docker Compose',
            database_connected: true,
            database_info: dbRes.rows[0],
            message: 'Hello from Multi-service Compose Architecture!'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            database_connected: false,
            error: err.message
        });
    }
});

// Endpoint kiểm tra sức khỏe
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Compose Backend server running on port ${PORT}`);
    console.log(`Connecting to DB at ${process.env.DB_HOST}:${process.env.DB_PORT}`);
});
