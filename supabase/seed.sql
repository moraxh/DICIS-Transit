-- Clear previous data if it exists (optional)
TRUNCATE TABLE route_stops, schedules, routes, stops RESTART IDENTITY CASCADE;

-- Controlled default admin for local/dev seed only.
DO $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'admin@dicis.local';
    admin_password text := 'admin123456';
BEGIN
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = admin_email
    LIMIT 1;

    IF admin_user_id IS NULL THEN
        admin_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_user_id,
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            now(),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'app_role', 'admin'),
            jsonb_build_object('bootstrap_admin', true),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            admin_user_id,
            jsonb_build_object('sub', admin_user_id::text, 'email', admin_email),
            'email',
            admin_user_id::text,
            now(),
            now(),
            now()
        )
        ON CONFLICT (provider, provider_id) DO NOTHING;
    END IF;

    INSERT INTO public.users (id, role, credibility_score)
    VALUES (admin_user_id, 'admin', 100)
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role;
END $$;

DO $$
DECLARE
    -- Routes (Outbound)
    r_ida_completa uuid := gen_random_uuid();
    r_ida_puentes uuid := gen_random_uuid();
    r_ida_central uuid := gen_random_uuid();
    r_ida_aurrera uuid := gen_random_uuid();
    r_ida_sabatina uuid := gen_random_uuid();

    -- Routes (Return)
    r_vuelta_completa uuid := gen_random_uuid();
    r_vuelta_sabatina uuid := gen_random_uuid();

    -- Stops (Outbound)
    s_enmss           uuid := gen_random_uuid();
    w_wp1             uuid := gen_random_uuid();
    s_tienda          uuid := gen_random_uuid();
    s_puentes         uuid := gen_random_uuid();
    s_leon_blvd       uuid := gen_random_uuid();
    s_muebles_america uuid := gen_random_uuid();
    s_romita_blvd     uuid := gen_random_uuid();
    s_salamanca_blvd  uuid := gen_random_uuid();
    s_secundaria38    uuid := gen_random_uuid();
    s_central         uuid := gen_random_uuid();
    s_humanista       uuid := gen_random_uuid();
    s_misiones        uuid := gen_random_uuid();
    s_puente_pb       uuid := gen_random_uuid();
    w_wp2             uuid := gen_random_uuid();
    w_wp3             uuid := gen_random_uuid();
    s_dicis           uuid := gen_random_uuid();

    -- Stops (Return-only)
    s_misiones_v        uuid := gen_random_uuid();
    s_humanista_v       uuid := gen_random_uuid();
    s_villa_petrolera_v uuid := gen_random_uuid();
    s_panteon_v         uuid := gen_random_uuid();
    s_parque_albino_v   uuid := gen_random_uuid();
    s_aurrera_sur_v     uuid := gen_random_uuid();
    s_leon_blvd_v       uuid := gen_random_uuid();
    s_leon_obregon_v    uuid := gen_random_uuid();
    s_soriana_sur_v     uuid := gen_random_uuid();
    s_antes_puente_v    uuid := gen_random_uuid();
    s_obregon_hidalgo_v uuid := gen_random_uuid();
    s_aurrera_faja_v    uuid := gen_random_uuid();

BEGIN
    -- 1. CREATE ROUTES
    INSERT INTO routes (id, name, is_active, direction) VALUES
    (r_ida_completa,   'L-V: ENMSS a DICIS',               true, 'to_dicis'),
    (r_ida_puentes,    'L-V: Puentes Gemelos a DICIS',      true, 'to_dicis'),
    (r_ida_central,    'L-V: Central de Autobuses a DICIS', true, 'to_dicis'),
    (r_ida_aurrera,    'L-V: Aurrera Sur a DICIS',          true, 'to_dicis'),
    (r_ida_sabatina,   'Sábados: ENMSS a DICIS',            true, 'to_dicis'),
    (r_vuelta_completa,'L-V: DICIS a ENMSS',                true, 'from_dicis'),
    (r_vuelta_sabatina,'Sábados: DICIS a ENMSS',            true, 'from_dicis');

    -- 2. CREATE STOPS AND WAYPOINTS
    INSERT INTO stops (id, name, latitude, longitude) VALUES
    -- Outbound stops
    (s_enmss,           'ENMSS (Unidad 2)',                        20.579397064584576, -101.20298757348225),
    (w_wp1,             'Waypoint 1',                              20.580082192375095, -101.20524035533316),
    (s_tienda,          'Tienda del Sol',                          20.569920056790068, -101.19765171400721),
    (s_puentes,         'Puentes Gemelos',                         20.566393815823616, -101.19911799682126),
    (s_leon_blvd,       'Calle Leon - Bulevard Valle de Santiago', 20.561619247757356, -101.20160237969073),
    (s_muebles_america, 'Muebles America',                         20.558279824342875, -101.20279439554602),
    (s_romita_blvd,     'Calle Romita - Bulevard Valle de Santiago',20.554472074631672,-101.2033229145435),
    (s_salamanca_blvd,  'Avenida Salamanca - Bulevard Valle de Santiago', 20.552801370936912, -101.20352509373551),
    (s_secundaria38,    'Enfrente Secundaria 38',                  20.54927090707049,  -101.20401169115678),
    (s_central,         'Central de Autobuses Sur',                20.54338533440888,  -101.20481560438009),
    (s_humanista,       'Entrada Humanista 1',                     20.537721508641205, -101.20555028077179),
    (s_misiones,        'Fracc. Las Misiones',                     20.53141618320049,  -101.20641717461294),
    (s_puente_pb,       'Puente Palo Blanco',                      20.50881140828937,  -101.20950932834809),
    (w_wp2,             'Waypoint 2',                              20.501907273173355, -101.2102338185673),
    (s_dicis,           'DICIS',                                   20.50797548044084,  -101.19358132356598),

    -- Return-only stops
    (w_wp3,               'Waypoint 3',                              20.50250275478162,  -101.20334113127504),
    (s_misiones_v,        'Las Misiones (Retorno)',                   20.531654610495956, -101.20625484552498),
    (s_humanista_v,       'Humanista 1 (Retorno)',                    20.537789354829503, -101.20537808320002),
    (s_villa_petrolera_v, 'Entrada Villa Petrolera',                  20.54332934948669,  -101.20461395940539),
    (s_panteon_v,         'Enfrente del Panteon',                     20.547574139204855, -101.20404757351486),
    (s_parque_albino_v,   'Parque Albino Garcia',                     20.55327433807075,  -101.20326159648289),
    (s_aurrera_sur_v,     'Bodega Aurrera Sur (Retorno)',              20.556074243362932, -101.20291292137408),
    (s_leon_blvd_v,       'Calle Leon - Bulevard Valle de Santiago (Retorno)', 20.56151873551415, -101.20150208885799),
    (s_leon_obregon_v,    'Calle Leon - Calle Alvaro Obregon Sur',    20.560687699484646, -101.1983125569749),
    (s_soriana_sur_v,     'Enfrente de Soriana Sur',                  20.56259606654015,  -101.1976703158769),
    (s_antes_puente_v,    'Parada antes del Puente Alvaro Obregon Sur', 20.56416688741902, -101.1971126419992),
    (s_obregon_hidalgo_v, 'Calle Hidalgo - Calle Miguel Hidalgo',     20.568886011594063, -101.1954675288132),
    (s_aurrera_faja_v,    'Bodega Aurrera Faja de Oro',               20.57575229586886,  -101.19297115811916);

    -- 3. ASSIGN POINTS, STOPS, AND TIMES TO ROUTES

    -- Route 1: ENMSS to DICIS (full)
    -- Times from user data: 0, ~3(wp), 7.5, 10, 12.5, 15, 16.5, 19, 20, 22, 23.5, 25.5, 27.5, ~29(wp), 31
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_completa, s_enmss,           'start',    1,  0),
    (r_ida_completa, w_wp1,             'waypoint', 2,  3),
    (r_ida_completa, s_tienda,          'stop',     3,  5),  -- 7.5m cumulative
    (r_ida_completa, s_puentes,         'stop',     4,  3),  -- 10m
    (r_ida_completa, s_leon_blvd,       'stop',     5,  3),  -- 12.5m
    (r_ida_completa, s_muebles_america, 'stop',     6,  2),  -- 15m
    (r_ida_completa, s_romita_blvd,     'stop',     7,  2),  -- 16.5m
    (r_ida_completa, s_salamanca_blvd,  'stop',     8,  2),  -- 19m (adjusted)
    (r_ida_completa, s_secundaria38,    'stop',     9,  1),  -- 20m
    (r_ida_completa, s_central,         'stop',     10, 2),  -- 22m
    (r_ida_completa, s_humanista,       'stop',     11, 2),  -- 23.5m
    (r_ida_completa, s_misiones,        'stop',     12, 2),  -- 25.5m
    (r_ida_completa, s_puente_pb,       'stop',     13, 2),  -- 27.5m
    (r_ida_completa, w_wp2,             'waypoint', 14, 2),  -- ~29m
    (r_ida_completa, s_dicis,           'end',      15, 2);  -- 31m

    -- Route 2: Puentes Gemelos to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_puentes, s_puentes,         'start',    1,  0),
    (r_ida_puentes, s_leon_blvd,       'stop',     2,  3),
    (r_ida_puentes, s_muebles_america, 'stop',     3,  2),
    (r_ida_puentes, s_romita_blvd,     'stop',     4,  2),
    (r_ida_puentes, s_salamanca_blvd,  'stop',     5,  2),
    (r_ida_puentes, s_secundaria38,    'stop',     6,  1),
    (r_ida_puentes, s_central,         'stop',     7,  2),
    (r_ida_puentes, s_humanista,       'stop',     8,  2),
    (r_ida_puentes, s_misiones,        'stop',     9,  2),
    (r_ida_puentes, s_puente_pb,       'stop',     10, 2),
    (r_ida_puentes, w_wp2,             'waypoint', 11, 2),
    (r_ida_puentes, s_dicis,           'end',      12, 2);

    -- Route 3: Central de Autobuses to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_central, s_central,   'start',    1, 0),
    (r_ida_central, s_humanista, 'stop',     2, 2),
    (r_ida_central, s_misiones,  'stop',     3, 2),
    (r_ida_central, s_puente_pb, 'stop',     4, 2),
    (r_ida_central, w_wp2,       'waypoint', 5, 2),
    (r_ida_central, s_dicis,     'end',      6, 2);

    -- Route 4: Aurrera Sur to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_aurrera, s_romita_blvd,  'start',    1, 0),
    (r_ida_aurrera, s_salamanca_blvd,'stop',    2, 2),
    (r_ida_aurrera, s_secundaria38, 'stop',     3, 1),
    (r_ida_aurrera, s_central,      'stop',     4, 2),
    (r_ida_aurrera, s_humanista,    'stop',     5, 2),
    (r_ida_aurrera, s_misiones,     'stop',     6, 2),
    (r_ida_aurrera, s_puente_pb,    'stop',     7, 2),
    (r_ida_aurrera, w_wp2,          'waypoint', 8, 2),
    (r_ida_aurrera, s_dicis,        'end',      9, 2);

    -- Saturday route (Outbound) — same stops as full weekday route
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins)
    SELECT r_ida_sabatina, stop_id, point_role, stop_order, time_from_previous_mins
    FROM route_stops WHERE route_id = r_ida_completa;

    -- Route 5: Return DICIS to ENMSS (full)
    -- Times from user data: 0, 5, 10, 12, 15, 17, 17, 20, 22, 23, 24, 25, 26.5, 30, 32.5
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_vuelta_completa, s_dicis,             'start',    1,  0),
    (r_vuelta_completa, w_wp3,              'waypoint', 2,  2),
    (r_vuelta_completa, s_puente_pb,         'stop',     3,  3),   -- 5m (Puente palo blanco)
    (r_vuelta_completa, s_misiones_v,        'stop',     4,  5),   -- 10m
    (r_vuelta_completa, s_humanista_v,       'stop',     5,  2),   -- 12m
    (r_vuelta_completa, s_villa_petrolera_v, 'stop',     6,  3),   -- 15m
    (r_vuelta_completa, s_panteon_v,         'stop',     7,  2),   -- 17m
    (r_vuelta_completa, s_parque_albino_v,   'stop',     8,  0),   -- 17m (same minute per user data)
    (r_vuelta_completa, s_aurrera_sur_v,     'stop',     9,  3),   -- 20m
    (r_vuelta_completa, s_leon_blvd_v,       'stop',     10, 2),   -- 22m
    (r_vuelta_completa, s_leon_obregon_v,    'stop',     11, 1),   -- 23m
    (r_vuelta_completa, s_soriana_sur_v,     'stop',     12, 1),   -- 24m
    (r_vuelta_completa, s_antes_puente_v,    'stop',     13, 1),   -- 25m
    (r_vuelta_completa, s_obregon_hidalgo_v, 'stop',     14, 2),   -- 26.5m (adjusted)
    (r_vuelta_completa, s_aurrera_faja_v,    'stop',     15, 3),   -- 30m (adjusted)
    (r_vuelta_completa, s_enmss,             'end',      16, 3);   -- 32.5m

    -- Saturday route (Return) — same stops as full weekday route
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins)
    SELECT r_vuelta_sabatina, stop_id, point_role, stop_order, time_from_previous_mins
    FROM route_stops WHERE route_id = r_vuelta_completa;

    -- 4. INSERT SCHEDULES

    -- OUTBOUND: ENMSS to DICIS
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_ida_completa, '07:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '07:10:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '07:20:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '07:30:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '07:45:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '08:00:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '08:30:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '09:00:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '09:10:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '09:20:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '09:30:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '09:45:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '10:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '10:30:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '11:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '11:10:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '11:20:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '11:30:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '12:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '12:30:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '13:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '13:15:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '13:30:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '13:40:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '13:45:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '14:00:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '14:20:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '14:40:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '15:00:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '15:15:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '15:30:00', ARRAY[1,2,3,4,5]), (r_ida_completa, '15:40:00', ARRAY[1,2,3,4,5]),
    (r_ida_completa, '16:00:00', ARRAY[1,2,3,4,5]);

    -- OUTBOUND: Puentes to DICIS
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_ida_puentes, '07:10:00', ARRAY[1,2,3,4,5]), (r_ida_puentes, '07:30:00', ARRAY[1,2,3,4,5]);

    -- OUTBOUND: Central to DICIS
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_ida_central, '07:35:00', ARRAY[1,2,3,4,5]);

    -- OUTBOUND: Aurrera Sur (Secundaria 38) to DICIS
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_ida_aurrera, '09:35:00', ARRAY[1,2,3,4,5]);

    -- OUTBOUND: Saturdays
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_ida_sabatina, '07:20:00', ARRAY[6]), (r_ida_sabatina, '11:15:00', ARRAY[6]);

    -- RETURN: DICIS to ENMSS
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_vuelta_completa, '08:30:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '09:00:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '09:30:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '09:45:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '10:00:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '10:30:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '11:00:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '11:20:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '11:40:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '12:00:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '12:20:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '12:40:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '13:00:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '13:25:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '13:45:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '14:00:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '14:20:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '14:40:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '15:10:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '15:40:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '16:10:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '16:20:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '16:35:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '17:00:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '17:25:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '17:45:00', ARRAY[1,2,3,4,5]),
    (r_vuelta_completa, '18:00:00', ARRAY[1,2,3,4,5]), (r_vuelta_completa, '18:15:00', ARRAY[1,2,3,4,5]);

    -- RETURN: Saturdays
    INSERT INTO schedules (route_id, departure_time, days_active) VALUES
    (r_vuelta_sabatina, '12:10:00', ARRAY[6]), (r_vuelta_sabatina, '16:40:00', ARRAY[6]);

END $$;
