const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendAnalyticsLog } = require('./analyticsService');

const STORAGE_PATH = path.join(__dirname, '../storage/notifications.json');
const QUEUE_NAME = 'notification_events';

function readLogs() {
    try {
        if (!fs.existsSync(STORAGE_PATH)) {
            // Ensure folder exists
            fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
            fs.writeFileSync(STORAGE_PATH, '[]');
            return [];
        }
        const data = fs.readFileSync(STORAGE_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error("Error reading logs file:", err);
        return [];
    }
}

function writeLogs(logs) {
    try {
        fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(logs, null, 2));
    } catch (err) {
        console.error("Error writing logs file:", err);
    }
}

async function mockSend(channel, recipient, content) {
    const email = recipient?.email || '';
    const phone = recipient?.phone || '';
    
    // For testing retry & failure: simulate error if email/phone has 'fail' or '9999'
    if (email.includes('fail') || phone.includes('9999')) {
        throw new Error(`Simulated mock failure for ${channel}`);
    }
    
    if (channel === 'EMAIL') {
        console.log(`   -> [Gửi EMAIL] tới ${email} - Tiêu đề: ${content.title}`);
    } else if (channel === 'SMS') {
        console.log(`   -> [Gửi SMS] tới ${phone} - Nội dung: ${content.body}`);
    }
    return true;
}

async function sendWithRetry(channel, recipient, content) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`attempt ${attempt}`);
        try {
            await mockSend(channel, recipient, content);
            return 'DELIVERED';
        } catch (error) {
            lastError = error;
            if (attempt < 3) {
                // Wait 200ms between attempts
                await new Promise(res => setTimeout(res, 200));
            }
        }
    }
    return 'FAILED';
}

async function startNotificationService() {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    try {
        console.log(`[*] Connecting to RabbitMQ at: ${rabbitmqUrl}`);
        const connection = await amqp.connect(rabbitmqUrl);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`[*] Dịch vụ B7 đang lắng nghe tin nhắn trên queue '${QUEUE_NAME}'. Nhấn CTRL+C để thoát.`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return;

            let payload;
            try {
                payload = JSON.parse(msg.content.toString());
            } catch (e) {
                console.error("Invalid JSON format in message:", e.message);
                channel.ack(msg);
                return;
            }

            const eventId = payload.eventId;
            console.log(`\n[x] Đã nhận được yêu cầu cảnh báo: ${eventId}`);

            const logs = readLogs();
            
            // 3. DUPLICATE PREVENTION
            const isDuplicate = logs.some(log => log.eventId === eventId);
            if (isDuplicate) {
                console.log(`[Duplicate detected] Event ${eventId} has already been processed.`);
                
                const channels = payload.notification?.channels || [];
                const newLogs = [...logs];
                channels.forEach(ch => {
                    newLogs.push({
                        id: crypto.randomUUID(),
                        eventId: eventId,
                        channel: ch,
                        status: 'DUPLICATE',
                        createdAt: new Date().toISOString()
                    });
                });
                writeLogs(newLogs);
                channel.ack(msg);
                return;
            }

            // Non-duplicate, start processing channels
            const channels = payload.notification?.channels || [];
            const recipient = payload.notification?.recipient || {};
            const content = payload.notification?.content || {};

            // 1. Create PENDING entries for all channels
            const pendingLogs = [...logs];
            channels.forEach(ch => {
                pendingLogs.push({
                    id: crypto.randomUUID(),
                    eventId: eventId,
                    channel: ch,
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                });
            });
            writeLogs(pendingLogs);

            // 2. Process each channel with retry
            const channelStatuses = [];
            for (const ch of channels) {
                console.log(`Processing channel: ${ch}`);
                const finalStatus = await sendWithRetry(ch, recipient, content);
                channelStatuses.push({ channel: ch, status: finalStatus });

                // Update log entry status in the JSON storage
                const updatedLogs = readLogs();
                const targetLog = updatedLogs.find(log => log.eventId === eventId && log.channel === ch && log.status === 'PENDING');
                if (targetLog) {
                    targetLog.status = finalStatus;
                    writeLogs(updatedLogs);
                }
            }

            // 3. Determine overall status for Analytics Service
            const overallStatus = channelStatuses.some(cs => cs.status === 'DELIVERED') ? 'DELIVERED' : 'FAILED';

            // 4. Call Analytics Service
            await sendAnalyticsLog(eventId, channels, overallStatus);

            // 5. Acknowledge message
            channel.ack(msg);
            console.log(`[v] Đã xử lý xong event ${eventId}`);
        });

        // Handle connection closure for auto-reconnection
        connection.on('error', (err) => {
            console.error("RabbitMQ connection error:", err);
        });
        
        connection.on('close', () => {
            console.error("RabbitMQ connection closed. Reconnecting in 5s...");
            setTimeout(startNotificationService, 5000);
        });

    } catch (error) {
        console.error("Lỗi khi kết nối tới RabbitMQ:", error);
        setTimeout(startNotificationService, 5000); // Retry connection
    }
}

module.exports = {
    startNotificationService,
    readLogs
};
