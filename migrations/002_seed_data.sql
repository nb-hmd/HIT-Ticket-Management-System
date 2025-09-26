-- Insert HIT Factories
INSERT INTO factories (id, name, description, location, contact_email, contact_phone, is_active) VALUES
('ARDIC', 'Armament Research & Development and Integration Center', 'Research and development facility for advanced weaponry', 'Taxila, Pakistan', 'ardic@hit.gov.pk', '+92-51-9047001', true),
('GUNFACTORY', 'Gun Factory', 'Artillery and weapons manufacturing facility', 'Wah Cantt, Pakistan', 'gunfactory@hit.gov.pk', '+92-51-9047002', true),
('ASRC', 'Ammunition Storage and Refurbishment Center', 'Ammunition storage and maintenance facility', 'Sanjwal, Pakistan', 'asrc@hit.gov.pk', '+92-51-9047003', true),
('HRF', 'Heavy Rebuild Factory', 'Tank and vehicle rebuild operations', 'Taxila, Pakistan', 'hrf@hit.gov.pk', '+92-51-9047004', true),
('MVF', 'Military Vehicle Factory', 'Military vehicle manufacturing and assembly', 'Karachi, Pakistan', 'mvf@hit.gov.pk', '+92-21-9047005', true),
('HITEC', 'HIT Engineering Complex', 'Engineering and technical services division', 'Taxila, Pakistan', 'hitec@hit.gov.pk', '+92-51-9047006', true);

-- Insert initial admin user (password: Admin@123)
INSERT INTO users (id, user_id, password_hash, full_name, email, role, factory_id, department, phone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'HIT000001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Aneeb Ahmed', 'admin@hit.gov.pk', 'admin', 'HRF', 'IT Department', '+92-51-9047100', true);

-- Insert support staff users
INSERT INTO users (id, user_id, password_hash, full_name, email, role, factory_id, department, phone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'HIT000002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Shanzay Aneeb', 'support.ardic@hit.gov.pk', 'support_staff', 'ARDIC', 'Technical Support', '+92-51-9047201', true),
('550e8400-e29b-41d4-a716-446655440003', 'HIT000003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Ahmed Ali', 'employee.gunfactory@hit.gov.pk', 'employee', 'GUNFACTORY', 'Production', '+92-51-9047202', true),
('550e8400-e29b-41d4-a716-446655440004', 'HIT000004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Wasiq Hafeez', 'support.asrc@hit.gov.pk', 'support_staff', 'ASRC', 'Technical Support', '+92-51-9047203', true),
('550e8400-e29b-41d4-a716-446655440005', 'HIT000005', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Daniyal Adil', 'support.hrf@hit.gov.pk', 'support_staff', 'HRF', 'Technical Support', '+92-51-9047204', true),
('550e8400-e29b-41d4-a716-446655440006', 'HIT000006', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Ahsan Mustafa', 'employee.mvf@hit.gov.pk', 'employee', 'MVF', 'Assembly', '+92-21-9047205', true),
('550e8400-e29b-41d4-a716-446655440007', 'HIT000007', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Uswah Hassan', 'employee.hitec@hit.gov.pk', 'employee', 'HITEC', 'Engineering', '+92-51-9047206', true);

-- Insert manager users
INSERT INTO users (id, user_id, password_hash, full_name, email, role, factory_id, department, phone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440008', 'HIT000008', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Bilal Ahmed', 'employee.ardic@hit.gov.pk', 'employee', 'ARDIC', 'Operations', '+92-51-9047301', true),
('550e8400-e29b-41d4-a716-446655440009', 'HIT000009', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Aqsa Hafeez', 'manager.gunfactory@hit.gov.pk', 'manager', 'GUNFACTORY', 'Operations', '+92-51-9047302', true);

-- Insert additional manager user
INSERT INTO users (id, user_id, password_hash, full_name, email, role, factory_id, department, phone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'HIT000010', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Ahsan Hafeez', 'manager.asrc@hit.gov.pk', 'manager', 'ASRC', 'Operations', '+92-51-9047303', true);

-- Insert sample employee users (additional)
INSERT INTO users (id, user_id, password_hash, full_name, email, role, factory_id, department, phone, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'HIT000011', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Sample Employee 1', 'employee1@hit.gov.pk', 'employee', 'ARDIC', 'Research & Development', '+92-51-9047401', true),
('550e8400-e29b-41d4-a716-446655440012', 'HIT000012', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Sample Employee 2', 'employee2@hit.gov.pk', 'employee', 'GUNFACTORY', 'Production', '+92-51-9047402', true),
('550e8400-e29b-41d4-a716-446655440013', 'HIT000013', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Sample Employee 3', 'employee3@hit.gov.pk', 'employee', 'ASRC', 'Quality Control', '+92-51-9047403', true),
('550e8400-e29b-41d4-a716-446655440014', 'HIT000014', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Sample Employee 4', 'employee4@hit.gov.pk', 'employee', 'HRF', 'Maintenance', '+92-51-9047404', true),
('550e8400-e29b-41d4-a716-446655440015', 'HIT000015', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Sample Employee 5', 'employee5@hit.gov.pk', 'employee', 'MVF', 'Assembly', '+92-21-9047405', true);

-- Insert sample tickets for demonstration
INSERT INTO tickets (id, ticket_number, title, description, priority, status, factory_id, requester_id, category, business_impact, sla_deadline) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'HIT240101001', 'Equipment Calibration Required', 'The precision measurement equipment in Lab-A requires urgent calibration as per maintenance schedule. This is affecting our quality control processes.', 'high', 'pending', 'ARDIC', '550e8400-e29b-41d4-a716-446655440010', 'Maintenance', 'Quality control processes are impacted', CURRENT_TIMESTAMP + INTERVAL '8 hours'),
('660e8400-e29b-41d4-a716-446655440002', 'HIT240101002', 'Network Connectivity Issues', 'Intermittent network connectivity issues in the production floor are causing delays in data synchronization with the central system.', 'medium', 'pending', 'GUNFACTORY', '550e8400-e29b-41d4-a716-446655440011', 'IT Support', 'Production data synchronization delays', CURRENT_TIMESTAMP + INTERVAL '24 hours'),
('660e8400-e29b-41d4-a716-446655440003', 'HIT240101003', 'Safety Equipment Inspection', 'Monthly safety equipment inspection is due for the ammunition storage area. This includes fire suppression systems and emergency exits.', 'critical', 'pending', 'ASRC', '550e8400-e29b-41d4-a716-446655440012', 'Safety', 'Compliance and safety requirements', CURRENT_TIMESTAMP + INTERVAL '4 hours');

-- Insert initial ticket approvals (pending admin review)
INSERT INTO ticket_approvals (id, ticket_id, admin_id, decision, notes) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'pending', 'Awaiting admin review for equipment calibration request'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'pending', 'Awaiting admin review for network connectivity issues'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'pending', 'Critical safety inspection - requires immediate admin attention');

-- Insert initial ticket history
INSERT INTO ticket_history (id, ticket_id, user_id, action, new_value) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', 'created', 'Ticket created with high priority'),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440011', 'created', 'Ticket created with medium priority'),
('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440012', 'created', 'Critical safety ticket created'),
('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'submitted_for_approval', 'Ticket submitted for admin review'),
('880e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'submitted_for_approval', 'Ticket submitted for admin review'),
('880e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'submitted_for_approval', 'Critical ticket submitted for immediate admin review');

-- Insert initial notifications
INSERT INTO notifications (id, user_id, ticket_id, type, title, message, priority) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'ticket_created', 'New Ticket Awaiting Review', 'Equipment calibration ticket HIT240101001 requires admin approval', 2),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', 'ticket_created', 'New Ticket Awaiting Review', 'Network connectivity ticket HIT240101002 requires admin approval', 1),
('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', 'ticket_created', 'CRITICAL: Safety Inspection Required', 'Critical safety inspection ticket HIT240101003 requires immediate admin attention', 3),
('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440010', NULL, 'ticket_created', 'Ticket Submitted Successfully', 'Your equipment calibration request HIT240101001 has been submitted for admin review', 1),
('990e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440011', NULL, 'ticket_created', 'Ticket Submitted Successfully', 'Your network connectivity request HIT240101002 has been submitted for admin review', 1),
('990e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440012', NULL, 'ticket_created', 'Critical Ticket Submitted', 'Your critical safety inspection request HIT240101003 has been submitted for immediate admin review', 2);

-- Update system configuration with deployment timestamp
UPDATE system_config SET value = CURRENT_TIMESTAMP::text WHERE key = 'last_deployment';
INSERT INTO system_config (key, value, description) 
SELECT 'last_deployment', CURRENT_TIMESTAMP::text, 'Last system deployment timestamp'
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'last_deployment');

COMMIT;

-- Display summary of inserted data
SELECT 'Factories' as entity, COUNT(*) as count FROM factories
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL
SELECT 'Approvals', COUNT(*) FROM ticket_approvals
UNION ALL
SELECT 'History Records', COUNT(*) FROM ticket_history
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'System Config', COUNT(*) FROM system_config;