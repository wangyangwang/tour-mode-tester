// tour_mode_tester.js
import express from 'express';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const WEB_PORT = 3000;
const TCP_PORT = 8990;
let tcpClient = null;
let tcpStatus = 'disconnected';

// Valid commands that match the server exactly
const VALID_COMMANDS = {
    'tour_start': 'tour_start_ack',
    'tour_end': 'tour_end_ack',
    'tour_advance': 'tour_advance_ack',
    'tour_previous': 'tour_previous_ack'
};

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/connect', (req, res) => {
    const { host } = req.body;
    
    if (tcpClient) {
        tcpClient.end();
    }

    tcpClient = new net.Socket();
    
    tcpClient.connect(TCP_PORT, host, () => {
        tcpStatus = 'connected';
        res.json({ status: 'connected', message: `Connected to ${host}:${TCP_PORT}` });
    });

    tcpClient.on('data', (data) => {
        const response = data.toString();
        console.log('Received:', response);
        // Emit the response to all connected websocket clients
        app.emit('tcp:response', response);
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

app.post('/api/send', (req, res) => {
    const { command } = req.body;
    
    if (!tcpClient || tcpStatus !== 'connected') {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Not connected to TCP server' 
        });
    }

    if (!VALID_COMMANDS.hasOwnProperty(command)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid command'
        });
    }

    // Send the exact command string
    tcpClient.write(command, (err) => {
        if (err) {
            return res.status(500).json({ 
                status: 'error', 
                message: 'Failed to send command' 
            });
        }
        res.json({ 
            status: 'success', 
            message: `Sent command: ${command}`,
            expectedAck: VALID_COMMANDS[command]
        });
    });
});

app.post('/api/disconnect', (req, res) => {
    if (tcpClient) {
        tcpClient.end();
        tcpClient = null;
    }
    tcpStatus = 'disconnected';
    res.json({ status: 'disconnected' });
});

app.listen(WEB_PORT, () => {
    console.log(`
TCP Tour Mode Tester Running:
Web Interface: http://localhost:${WEB_PORT}
Target TCP Port: ${TCP_PORT}
Valid Commands: ${Object.keys(VALID_COMMANDS).join(', ')}
`);
});