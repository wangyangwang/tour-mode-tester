// tcp-tester.js
import express from 'express';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const WEB_PORT = 3000;
const TCP_PORT = 8990;  // Verified to match receiver port
let tcpClient = null;
let tcpStatus = 'disconnected';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// TCP Connection endpoint
app.post('/api/connect', (req, res) => {
    const { host, port } = req.body;
    
    if (tcpClient) {
        tcpClient.end();
    }

    tcpClient = new net.Socket();
    
    tcpClient.connect(TCP_PORT, host, () => {  // Always use TCP_PORT 8990
        tcpStatus = 'connected';
        res.json({ status: 'connected', message: `Connected to ${host}:${TCP_PORT}` });
    });

    tcpClient.on('data', (data) => {
        console.log('Received:', data.toString());
    });

    tcpClient.on('error', (err) => {
        tcpStatus = 'error';
        console.error('TCP Error:', err);
    });

    tcpClient.on('close', () => {
        tcpStatus = 'disconnected';
        console.log('Connection closed');
    });
});

// Start the server
app.listen(WEB_PORT, () => {
    console.log(`
TCP Tester Running:
Web Interface: http://localhost:${WEB_PORT}
Target TCP Port: ${TCP_PORT}
`);
});
