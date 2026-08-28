-- ═══════════════════════════════════════════════════════════
--  RapidRoute AI — Seed Data (Hyderabad, India)
-- ═══════════════════════════════════════════════════════════

-- All passwords are hashed version of "Password123!"
-- bcrypt hash (rounds=12, verified): $2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS

-- ── USERS ─────────────────────────────────────────────────

INSERT INTO users (id, name, email, phone, password_hash, role, status) VALUES
-- Admin
('00000000-0000-0000-0000-000000000001', 'Admin User',         'admin@rapidroute.ai',     '+91-9000000001', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'admin',        'active'),
-- Control Room
('00000000-0000-0000-0000-000000000002', 'Control Room',       'control@rapidroute.ai',   '+91-9000000002', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'control_room', 'active'),
-- Drivers
('00000000-0000-0000-0000-000000000003', 'Ravi Kumar',         'driver1@rapidroute.ai',   '+91-9100000001', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'driver',       'active'),
('00000000-0000-0000-0000-000000000004', 'Suresh Rao',         'driver2@rapidroute.ai',   '+91-9100000002', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'driver',       'active'),
('00000000-0000-0000-0000-000000000005', 'Arjun Reddy',        'driver3@rapidroute.ai',   '+91-9100000003', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'driver',       'active'),
('00000000-0000-0000-0000-000000000006', 'Venkat Swamy',       'driver4@rapidroute.ai',   '+91-9100000004', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'driver',       'active'),
('00000000-0000-0000-0000-000000000007', 'Krishna Murthy',     'driver5@rapidroute.ai',   '+91-9100000005', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'driver',       'active'),
-- Hospitals
('00000000-0000-0000-0000-000000000008', 'KIMS Hospital',      'hospital1@rapidroute.ai', '+91-4023344200', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'hospital',     'active'),
('00000000-0000-0000-0000-000000000009', 'Yashoda Hospital',   'hospital2@rapidroute.ai', '+91-4067191919', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'hospital',     'active'),
('00000000-0000-0000-0000-000000000010', 'Apollo Hospital',    'hospital3@rapidroute.ai', '+91-4023607777', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'hospital',     'active'),
-- Officers
('00000000-0000-0000-0000-000000000011', 'Officer Prasad',     'officer1@rapidroute.ai',  '+91-9200000001', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000012', 'Officer Srinivas',   'officer2@rapidroute.ai',  '+91-9200000002', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000013', 'Officer Ramesh',     'officer3@rapidroute.ai',  '+91-9200000003', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000014', 'Officer Naresh',     'officer4@rapidroute.ai',  '+91-9200000004', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000015', 'Officer Vijay',      'officer5@rapidroute.ai',  '+91-9200000005', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000016', 'Officer Ajay',       'officer6@rapidroute.ai',  '+91-9200000006', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000017', 'Officer Raj',        'officer7@rapidroute.ai',  '+91-9200000007', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000018', 'Officer Sunil',      'officer8@rapidroute.ai',  '+91-9200000008', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000019', 'Officer Pavan',      'officer9@rapidroute.ai',  '+91-9200000009', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000020', 'Officer Lokesh',     'officer10@rapidroute.ai', '+91-9200000010', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000021', 'Officer Deepak',     'officer11@rapidroute.ai', '+91-9200000011', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000022', 'Officer Kiran',      'officer12@rapidroute.ai', '+91-9200000012', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000023', 'Officer Chandra',    'officer13@rapidroute.ai', '+91-9200000013', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000024', 'Officer Shiva',      'officer14@rapidroute.ai', '+91-9200000014', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active'),
('00000000-0000-0000-0000-000000000025', 'Officer Mahesh',     'officer15@rapidroute.ai', '+91-9200000015', '$2a$12$JRXlq3YHKYM/xPTtwZMEgOVEI1vn392yu2e60il88ag7scXvuMSQS', 'officer',      'active');

-- ── HOSPITALS (Hyderabad area) ────────────────────────────
INSERT INTO hospitals (id, name, address, latitude, longitude, contact_phone, contact_email, emergency_status, total_beds, available_beds, user_id) VALUES
('10000000-0000-0000-0000-000000000001', 'KIMS Hospitals',     'Minister Road, Secunderabad, Hyderabad - 500003',     17.4399, 78.4983, '+91-4023344200', 'emergency@kims.com',    'available', 500, 120, '00000000-0000-0000-0000-000000000008'),
('10000000-0000-0000-0000-000000000002', 'Yashoda Hospital',   'Raj Bhavan Road, Somajiguda, Hyderabad - 500082',     17.4280, 78.4551, '+91-4067191919', 'emergency@yashoda.com', 'available', 400,  85, '00000000-0000-0000-0000-000000000009'),
('10000000-0000-0000-0000-000000000003', 'Apollo Hospital',    'Jubilee Hills, Hyderabad - 500096',                   17.4239, 78.4090, '+91-4023607777', 'emergency@apollo.com',  'available', 600, 150, '00000000-0000-0000-0000-000000000010');

-- ── JUNCTIONS (Major Hyderabad junctions) ─────────────────
INSERT INTO junctions (id, name, latitude, longitude, traffic_level, status, road_names, signal_count) VALUES
('20000000-0000-0000-0000-000000000001', 'Panjagutta Junction',         17.4286, 78.4497, 'high',   'clear',     ARRAY['Road No. 1', 'Panjagutta Main Rd'], 4),
('20000000-0000-0000-0000-000000000002', 'Begumpet Junction',           17.4448, 78.4590, 'medium', 'clear',     ARRAY['Begumpet Main Rd', 'Airport Rd'], 4),
('20000000-0000-0000-0000-000000000003', 'Secunderabad Clock Tower',    17.4358, 78.5003, 'high',   'clear',     ARRAY['MG Rd', 'SD Rd'], 4),
('20000000-0000-0000-0000-000000000004', 'Ameerpet X Roads',            17.4373, 78.4483, 'critical','clear',    ARRAY['Ameerpet Main Rd', 'SR Nagar Rd'], 6),
('20000000-0000-0000-0000-000000000005', 'Banjara Hills Rd No 12',      17.4156, 78.4413, 'medium', 'clear',     ARRAY['Road No. 12', 'Road No. 1'], 2),
('20000000-0000-0000-0000-000000000006', 'Jubilee Hills Check Post',    17.4323, 78.4099, 'low',    'clear',     ARRAY['Road No. 36', 'Jubilee Hills Rd'], 2),
('20000000-0000-0000-0000-000000000007', 'Somajiguda Junction',         17.4281, 78.4548, 'high',   'clear',     ARRAY['Raj Bhavan Rd', 'Somajiguda Main'], 4),
('20000000-0000-0000-0000-000000000008', 'Punjagutta Flyover Base',     17.4260, 78.4509, 'medium', 'clear',     ARRAY['SP Rd', 'Punjagutta Rd'], 2),
('20000000-0000-0000-0000-000000000009', 'Paradise Junction',           17.4382, 78.4752, 'high',   'clear',     ARRAY['Paradise Rd', 'MG Rd'], 4),
('20000000-0000-0000-0000-000000000010', 'Koti Junction',               17.3858, 78.4849, 'critical','clear',    ARRAY['Koti Main Rd', 'Sultan Bazar'], 6),
('20000000-0000-0000-0000-000000000011', 'Abids Junction',              17.3922, 78.4757, 'high',   'clear',     ARRAY['Abids Circle', 'GPO Rd'], 4),
('20000000-0000-0000-0000-000000000012', 'Lakdi-ka-Pool Junction',      17.3982, 78.4699, 'medium', 'clear',     ARRAY['LKP Rd', 'Necklace Rd'], 4),
('20000000-0000-0000-0000-000000000013', 'Nampally Junction',           17.3870, 78.4703, 'high',   'clear',     ARRAY['Nampally Rd', 'JN Rd'], 4),
('20000000-0000-0000-0000-000000000014', 'Masab Tank Junction',         17.4077, 78.4521, 'medium', 'clear',     ARRAY['Masab Tank Rd', 'Hill Fort Rd'], 4),
('20000000-0000-0000-0000-000000000015', 'HITEC City Junction',         17.4435, 78.3772, 'low',    'clear',     ARRAY['HITEC City Main Rd', 'Madhapur Rd'], 4);

-- ── AMBULANCES ────────────────────────────────────────────
INSERT INTO ambulances (id, ambulance_number, vehicle_type, driver_id, current_latitude, current_longitude, status) VALUES
('30000000-0000-0000-0000-000000000001', 'TS-01-AA-1234', 'ALS', '00000000-0000-0000-0000-000000000003', 17.4373, 78.4483, 'available'),
('30000000-0000-0000-0000-000000000002', 'TS-01-AB-5678', 'BLS', '00000000-0000-0000-0000-000000000004', 17.4286, 78.4497, 'available'),
('30000000-0000-0000-0000-000000000003', 'TS-01-AC-9012', 'ALS', '00000000-0000-0000-0000-000000000005', 17.4448, 78.4590, 'available'),
('30000000-0000-0000-0000-000000000004', 'TS-01-AD-3456', 'ICU', '00000000-0000-0000-0000-000000000006', 17.4156, 78.4413, 'available'),
('30000000-0000-0000-0000-000000000005', 'TS-01-AE-7890', 'BLS', '00000000-0000-0000-0000-000000000007', 17.4323, 78.4099, 'available');

-- ── TRAFFIC OFFICERS ──────────────────────────────────────
INSERT INTO traffic_officers (id, user_id, badge_number, assigned_junction_id, status) VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'HYD-001', '20000000-0000-0000-0000-000000000001', 'available'),
('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'HYD-002', '20000000-0000-0000-0000-000000000002', 'available'),
('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', 'HYD-003', '20000000-0000-0000-0000-000000000003', 'available'),
('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000014', 'HYD-004', '20000000-0000-0000-0000-000000000004', 'available'),
('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000015', 'HYD-005', '20000000-0000-0000-0000-000000000005', 'available'),
('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000016', 'HYD-006', '20000000-0000-0000-0000-000000000006', 'available'),
('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000017', 'HYD-007', '20000000-0000-0000-0000-000000000007', 'available'),
('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000018', 'HYD-008', '20000000-0000-0000-0000-000000000008', 'available'),
('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000019', 'HYD-009', '20000000-0000-0000-0000-000000000009', 'available'),
('40000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'HYD-010', '20000000-0000-0000-0000-000000000010', 'available'),
('40000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021', 'HYD-011', '20000000-0000-0000-0000-000000000011', 'available'),
('40000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000022', 'HYD-012', '20000000-0000-0000-0000-000000000012', 'available'),
('40000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000023', 'HYD-013', '20000000-0000-0000-0000-000000000013', 'available'),
('40000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000024', 'HYD-014', '20000000-0000-0000-0000-000000000014', 'available'),
('40000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000025', 'HYD-015', '20000000-0000-0000-0000-000000000015', 'available');

-- ── INITIAL TRAFFIC DATA ──────────────────────────────────
INSERT INTO traffic_data (junction_id, traffic_level, vehicle_count, average_speed, congestion_pct) VALUES
('20000000-0000-0000-0000-000000000001', 'high',     450, 18.5, 72),
('20000000-0000-0000-0000-000000000002', 'medium',   280, 28.0, 45),
('20000000-0000-0000-0000-000000000003', 'high',     420, 20.0, 68),
('20000000-0000-0000-0000-000000000004', 'critical', 600, 12.0, 92),
('20000000-0000-0000-0000-000000000005', 'medium',   320, 26.5, 48),
('20000000-0000-0000-0000-000000000006', 'low',      150, 40.0, 22),
('20000000-0000-0000-0000-000000000007', 'high',     480, 16.0, 78),
('20000000-0000-0000-0000-000000000008', 'medium',   300, 24.0, 52),
('20000000-0000-0000-0000-000000000009', 'high',     410, 19.5, 66),
('20000000-0000-0000-0000-000000000010', 'critical', 580, 11.0, 88),
('20000000-0000-0000-0000-000000000011', 'high',     460, 17.0, 74),
('20000000-0000-0000-0000-000000000012', 'medium',   260, 30.0, 42),
('20000000-0000-0000-0000-000000000013', 'high',     400, 21.0, 65),
('20000000-0000-0000-0000-000000000014', 'medium',   340, 25.0, 50),
('20000000-0000-0000-0000-000000000015', 'low',      180, 38.0, 28);
