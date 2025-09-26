
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for better data integrity
CREATE TYPE user_role AS ENUM ('employee', 'support_staff', 'admin', 'manager');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('pending', 'admin_review', 'approved', 'rejected', 'in_progress', 'completed', 'closed');
CREATE TYPE approval_decision AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE notification_type AS ENUM ('ticket_created', 'ticket_assigned', 'ticket_approved', 'ticket_rejected', 'ticket_completed', 'new_comment', 'status_update');

-- Factories table
CREATE TABLE factories (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table with enhanced security and role management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role user_role NOT NULL,
    factory_id VARCHAR(10) REFERENCES factories(id),
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table with enhanced workflow support
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ticket_priority NOT NULL,
    status ticket_status DEFAULT 'pending',
    factory_id VARCHAR(10) NOT NULL REFERENCES factories(id),
    requester_id UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    assigned_team VARCHAR(100),
    category VARCHAR(100),
    urgency_level INTEGER DEFAULT 1,
    business_impact TEXT,
    sla_deadline TIMESTAMP,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    resolution_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- Ticket approvals table for admin review workflow
CREATE TABLE ticket_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id),
    decision approval_decision DEFAULT 'pending',
    reason TEXT,
    priority_override ticket_priority,
    assigned_team_suggestion VARCHAR(100),
    estimated_hours_suggestion DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP
);

-- Ticket assignments table for support team management
CREATE TABLE ticket_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    team_name VARCHAR(100),
    assignment_reason TEXT,
    expected_completion TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Ticket comments with enhanced threading support
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES ticket_comments(id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    is_system_generated BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket attachments with enhanced metadata
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES ticket_comments(id),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    checksum VARCHAR(64),
    is_image BOOLEAN DEFAULT false,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive audit trail for all ticket actions
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced notifications system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    ticket_id UUID REFERENCES tickets(id),
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for enhanced security
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System configuration table
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal performance
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_factory_id ON users(factory_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_factory_id ON tickets(factory_id);
CREATE INDEX idx_tickets_requester_id ON tickets(requester_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_sla_deadline ON tickets(sla_deadline);

CREATE INDEX idx_ticket_approvals_ticket_id ON ticket_approvals(ticket_id);
CREATE INDEX idx_ticket_approvals_admin_id ON ticket_approvals(admin_id);
CREATE INDEX idx_ticket_approvals_decision ON ticket_approvals(decision);

CREATE INDEX idx_ticket_assignments_ticket_id ON ticket_assignments(ticket_id);
CREATE INDEX idx_ticket_assignments_assigned_to ON ticket_assignments(assigned_to);
CREATE INDEX idx_ticket_assignments_is_active ON ticket_assignments(is_active);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at);

CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_uploaded_by ON ticket_attachments(uploaded_by);

CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_user_id ON ticket_history(user_id);
CREATE INDEX idx_ticket_history_created_at ON ticket_history(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON factories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_comments_updated_at BEFORE UPDATE ON ticket_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial system configuration
INSERT INTO system_config (key, value, description) VALUES
('system_name', 'HIT Ticket Management System', 'System display name'),
('version', '2.0.0', 'Current system version'),
('maintenance_mode', 'false', 'System maintenance mode flag'),
('max_file_size', '10485760', 'Maximum file upload size in bytes'),
('session_timeout', '86400', 'Session timeout in seconds'),
('password_min_length', '8', 'Minimum password length'),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
('lockout_duration', '1800', 'Account lockout duration in seconds');

COMMIT;