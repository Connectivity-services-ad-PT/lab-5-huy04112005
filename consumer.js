const amqp = require('amqplib');

// Tên của Queue mà hai bên đã thống nhất
const QUEUE_NAME = 'notification_events';

async function startNotificationService() {
    try {
        // 1. Kết nối tới Message Broker (RabbitMQ)
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 2. Đảm bảo Queue tồn tại trước khi lắng nghe
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log(`[*] Dịch vụ B7 đang lắng nghe tin nhắn trên queue '${QUEUE_NAME}'. Nhấn CTRL+C để thoát.`);

        // 3. Bắt đầu lắng nghe (Consume)
        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                // 4. Lấy dữ liệu Core Business gửi và ép kiểu về JSON
                const payload = JSON.parse(msg.content.toString());
                console.log(`\n[x] Đã nhận được yêu cầu cảnh báo: ${payload.eventId}`);

                // 5. Logic xử lý gửi đa kênh
                const channels = payload.notification.channels;
                const content = payload.notification.content;

                if (channels.includes('EMAIL')) {
                    console.log(`   -> [Gửi EMAIL] tới ${payload.notification.recipient.email} - Tiêu đề: ${content.title}`);
                    // Chỗ này sau này bạn viết code gọi API SendGrid hoặc Nodemailer
                }
                
                if (channels.includes('SMS')) {
                    console.log(`   -> [Gửi SMS] tới ${payload.notification.recipient.phone} - Nội dung: ${content.body}`);
                    // Chỗ này sau này bạn viết code gọi API Twilio
                }

                // 6. Xác nhận (Ack) là đã xử lý xong để Queue xóa tin nhắn đó đi
                channel.ack(msg);
                console.log(`[v] Đã xử lý xong event ${payload.eventId}`);
            }
        });
    } catch (error) {
        console.error("Lỗi khi kết nối tới RabbitMQ:", error);
    }
}

startNotificationService();