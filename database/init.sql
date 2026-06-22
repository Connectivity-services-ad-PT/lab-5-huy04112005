-- Initial schema for notification database

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    alert_id UUID NOT NULL,
    severity VARCHAR(20),
    message TEXT,
    occurred_at TIMESTAMP NOT NULL,
    correlation_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY,
    alert_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP,
    chat_id VARCHAR(50),
    message TEXT
);
