// entry point for the app and backend
import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config/config.js';
import { connectMongo } from './infrastructure/database/db.js';
import { connectRabbitMQ } from './infrastructure/rabbitmq/index.js';
import { setupWebSockets } from './infrastructure/websocket/wsServer.js';


const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({status: 'ok', service: "dropp backend", time: new Date().toISOString()});
});

//error handler
app.use((err, req, res, next) =>{
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({error: err.message || 'Something went wrong'});
});

const server = http.createServer(app);

async function start(){
    await connectMongo();
    await connectRabbitMQ();
    setupWebSockets(server);

    server.listen(config.port, ()=>{
        console.log(`[Dropp] Backend running → http://localhost:${config.port}`);
    });
}

start().catch((err) => {
    console.log('[Dropp] Service crash:', err.message);
    process.exit(1);
});