/**
 * Analytics Service Integration
 * Sends notification status logs to the Analytics Service.
 */

async function sendAnalyticsLog(eventId, channels, status) {
    const analyticsUrl = process.env.ANALYTICS_URL || 'http://analytics-service:8080';
    const endpoint = `${analyticsUrl}/notification-logs`;
    
    const payload = {
        eventId,
        channels,
        status,
        timestamp: new Date().toISOString()
    };

    try {
        console.log(`[Analytics] Sending log to ${endpoint}...`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn(`[WARNING] Analytics Service responded with status ${response.status}`);
        } else {
            console.log(`[Analytics] Successfully sent log to Analytics Service for event ${eventId}`);
        }
    } catch (error) {
        console.warn(`[WARNING] Failed to send log to Analytics Service: ${error.message}`);
    }
}

module.exports = {
    sendAnalyticsLog
};
