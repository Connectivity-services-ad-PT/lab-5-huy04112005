const amqp = require('amqplib');

const QUEUE_NAME = 'notification_events';

async function simulateCoreBusinessEvent() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Cục JSON payload chuẩn mà bạn đã thống nhất
        const eventPayload = {
            eventId: `evt-${Date.now()}`,
            source: "core-business",
            notification: {
                channels: ["EMAIL", "SMS"],
                recipient: { email: "admin@campus.com", phone: "+84987654321" },
                content: {
                    title: "Cảnh báo an ninh",
                    body: "Phát hiện đột nhập tại cửa số 3!"
                }
            }
        };

        // Gửi vào Queue
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(eventPayload)));
        console.log(`[Core Business] Đã gửi sự kiện cảnh báo vào queue: ${eventPayload.eventId}`);

        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);

    } catch (error) {
        console.error(error);
    }
}

simulateCoreBusinessEvent();