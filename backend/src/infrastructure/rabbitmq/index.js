import amqp from 'amqplib';
import { config } from '../../config/config.js';

let channel = null;
const Message_Exchange = 'dropp.events';

export async function connectRabbitMQ(){
    try{
        const connection = await amqp.connect(config.rabbitmqUrl);
        channel = await connection.createChannel();
        await channel.assertExchange(
            Message_Exchange,
            'topic', 
            {durable:true}
        );
        console.log('[RabbitMQ] Exchange active: Message_Exchange', Message_Exchange);
    }catch(error){
        console.error('[RabbitMQ] Connection error:', error.message);
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