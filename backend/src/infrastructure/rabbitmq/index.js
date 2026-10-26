import amqp from 'amqplib';
import { config } from '../../config/config.js';

let channel = null;
const Message_Exchange = 'dropp.events';

export async function connectRabbitMQ(){
    try{
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out (dev fallback)')), 2000));
        const connection = await Promise.race([
            amqp.connect(config.rabbitmqUrl),
            timeoutPromise,
        ]);
        connection.on('error', (err) => {
            console.warn('[RabbitMQ] Connection error (non-fatal):', err.message);
            channel = null;
        });
        connection.on('close', () => {
            console.warn('[RabbitMQ] Connection closed, running in local fallback');
            channel = null;
        });
        channel = await connection.createChannel();
        channel.on('error', (err) => {
            console.warn('[RabbitMQ] Channel error (non-fatal):', err.message);
        });
        await channel.assertExchange(
            Message_Exchange,
            'topic', 
            {durable:true}
        );
        console.log('[RabbitMQ] Exchange active:', Message_Exchange);
    }catch(error){
        console.warn('[RabbitMQ] Running without RabbitMQ (local mode):', error.message);
    }
}


export async function publishDomainEvent(event) {
    if(!channel) return false;

    const routingKey = event.eventType;
    const buffer = Buffer.from(JSON.stringify(event));

    
    return channel.publish(Message_Exchange,routingKey, buffer, {
        persistent: true,
        contentType: 'application/json',
        headers: {
            eventId: event.eventId,
            aggregateId: event.aggregateId,
        },
    });
}