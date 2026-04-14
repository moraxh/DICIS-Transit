-- Clear previous data if it exists (optional)
TRUNCATE TABLE route_stops, schedules, routes, stops RESTART IDENTITY CASCADE;

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

    -- Stops (Outbound and shared)
    s_enmss uuid := gen_random_uuid();
    w_wp1 uuid := gen_random_uuid();
    s_tienda uuid := gen_random_uuid();
    s_puentes uuid := gen_random_uuid();
    s_aurrera uuid := gen_random_uuid();
    s_central uuid := gen_random_uuid();
    s_humanista uuid := gen_random_uuid();
    s_misiones uuid := gen_random_uuid();
    s_puente_pb uuid := gen_random_uuid();
    w_wp2 uuid := gen_random_uuid();
    s_dicis uuid := gen_random_uuid();

    -- Stops (Return)
    s_misiones_v uuid := gen_random_uuid();
    s_humanista_v uuid := gen_random_uuid();
    s_villa_petrolera_v uuid := gen_random_uuid();
    s_parque_albino_v uuid := gen_random_uuid();
    s_aurrera_sur_v uuid := gen_random_uuid();
    s_valero_v uuid := gen_random_uuid();
    s_obregon_leon_v uuid := gen_random_uuid();
    s_obregon_centro_v uuid := gen_random_uuid();
    s_aurrera_faja_v uuid := gen_random_uuid();

BEGIN
    -- 1. CREATE ROUTES
    INSERT INTO routes (id, name, is_active) VALUES
    (r_ida_completa, 'L-V: ENMSS a DICIS', true),
    (r_ida_puentes, 'L-V: Puentes Gemelos a DICIS', true),
    (r_ida_central, 'L-V: Central de Autobuses a DICIS', true),
    (r_ida_aurrera, 'L-V: Aurrera Sur a DICIS', true),
    (r_ida_sabatina, 'Sábados: ENMSS a DICIS', true),
    (r_vuelta_completa, 'L-V: DICIS a ENMSS', true),
    (r_vuelta_sabatina, 'Sábados: DICIS a ENMSS', true);

    -- 2. CREATE STOPS AND WAYPOINTS
    INSERT INTO stops (id, name, latitude, longitude) VALUES
    -- Shared / Outbound
    (s_enmss, 'ENMSS (Unidad 2)', 20.57945710083944, -101.20297719915736),
    (w_wp1, 'Waypoint 1', 20.580066114412475, -101.20518131324116),
    (s_tienda, 'Tienda del Sol', 20.569962733795272, -101.19767455867745),
    (s_puentes, 'Puentes Gemelos', 20.566385650709044, -101.19916522587937),
    (s_aurrera, 'Frente a Bodega Aurrera Sur', 20.554446768019865, -101.20334963008835),
    (s_central, 'Central de Autobuses Sur', 20.543383587378198, -101.20485892467015),
    (s_humanista, 'Entrada Humanista 1', 20.53788858048142, -101.20552168576877),
    (s_misiones, 'Fracc. Las Misiones', 20.531372323393203, -101.20643609871891),
    (s_puente_pb, 'Puente Palo Blanco', 20.508919419173647, -101.20953004561427),
    (w_wp2, 'Waypoint 2', 20.502368697047956, -101.20294475931385),
    (s_dicis, 'DICIS', 20.50796162227326, -101.19364218067648),
    
    -- Return-only
    (s_misiones_v, 'Las Misiones (Retorno)', 20.531683311675614, -101.20624956983248),
    (s_humanista_v, 'Humanista 1 (Retorno)', 20.538059214936432, -101.20532545907966),
    (s_villa_petrolera_v, 'Entrada Villa Petrolera', 20.543315925788797, -101.2045932915868),
    (s_parque_albino_v, 'Parque Albino Garcia', 20.553231441534518, -101.20321026357806),
    (s_aurrera_sur_v, 'Parada Bodega Aurrera Sur (Retorno)', 20.556046636300366, -101.2028608079549),
    (s_valero_v, 'Frente a Gasolinera Valero', 20.561536775314273, -101.20147502947991),
    (s_obregon_leon_v, 'Esq. Alvaro Obregon Sur - Calle Leon', 20.560686241500164, -101.1982871166703),
    (s_obregon_centro_v, 'Esq. Alvaro Obregon - Calle Miguel Hidalgo', 20.568829424179157, -101.1954905036589),
    (s_aurrera_faja_v, 'Bodega Aurrera Faja de Oro', 20.5755927845671, -101.19297490995126);

    -- 3. ASSIGN POINTS, STOPS, AND TIMES TO ROUTES

    -- Route 1: ENMSS to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_completa, s_enmss, 'start',     1, 0),
    (r_ida_completa, w_wp1,   'waypoint',  2, 3),
    (r_ida_completa, s_tienda,'stop',      3, 5),
    (r_ida_completa, s_puentes,'stop',     4, 3),
    (r_ida_completa, s_aurrera,'stop',     5, 4),
    (r_ida_completa, s_central,'stop',     6, 5),
    (r_ida_completa, s_humanista,'stop',   7, 3),
    (r_ida_completa, s_misiones,'stop',    8, 2),
    (r_ida_completa, s_puente_pb,'stop',   9, 2),
    (r_ida_completa, w_wp2,   'waypoint',  10,3),
    (r_ida_completa, s_dicis, 'end',       11,2);

    -- Route 2: Puentes to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_puentes, s_puentes,'start',    1, 0),
    (r_ida_puentes, s_aurrera,'stop',     2, 4),
    (r_ida_puentes, s_central,'stop',     3, 5),
    (r_ida_puentes, s_humanista,'stop',   4, 3),
    (r_ida_puentes, s_misiones,'stop',    5, 2),
    (r_ida_puentes, s_puente_pb,'stop',   6, 2),
    (r_ida_puentes, w_wp2,   'waypoint',  7, 3),
    (r_ida_puentes, s_dicis, 'end',       8, 2);

    -- Route 3: Central to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_central, s_central,'start',    1, 0),
    (r_ida_central, s_humanista,'stop',   2, 3),
    (r_ida_central, s_misiones,'stop',    3, 2),
    (r_ida_central, s_puente_pb,'stop',   4, 2),
    (r_ida_central, w_wp2,   'waypoint',  5, 3),
    (r_ida_central, s_dicis, 'end',       6, 2);

    -- Route 4: Aurrera to DICIS
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_ida_aurrera, s_aurrera,'start',    1, 0),
    (r_ida_aurrera, s_central,'stop',     2, 5),
    (r_ida_aurrera, s_humanista,'stop',   3, 3),
    (r_ida_aurrera, s_misiones,'stop',    4, 2),
    (r_ida_aurrera, s_puente_pb,'stop',   5, 2),
    (r_ida_aurrera, w_wp2,   'waypoint',  6, 3),
    (r_ida_aurrera, s_dicis, 'end',       7, 2);

    -- Saturday route (Outbound)
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins)
    SELECT r_ida_sabatina, stop_id, point_role, stop_order, time_from_previous_mins
    FROM route_stops WHERE route_id = r_ida_completa;

    -- Route 5: Return from DICIS to ENMSS
    -- To keep consistency with the ENMSS "(20 mins)" note, this uses an approximate 30-minute total with adjusted deltas.
    INSERT INTO route_stops (route_id, stop_id, point_role, stop_order, time_from_previous_mins) VALUES
    (r_vuelta_completa, s_dicis,             'start',    1,  0), -- 0m
    (r_vuelta_completa, w_wp2,               'waypoint', 2,  2), -- 2m
    (r_vuelta_completa, s_misiones_v,        'stop',     3,  3), -- 5m
    (r_vuelta_completa, s_humanista_v,       'stop',     4,  2), -- 7m (2 min from previous)
    (r_vuelta_completa, s_villa_petrolera_v, 'stop',     5,  3), -- 10m (3 min from previous)
    (r_vuelta_completa, s_parque_albino_v,   'stop',     6,  3), -- 13m
    (r_vuelta_completa, s_aurrera_sur_v,     'stop',     7,  2), -- 15m
    (r_vuelta_completa, s_valero_v,          'stop',     8,  1), -- 16m
    (r_vuelta_completa, s_obregon_leon_v,    'stop',     9,  1), -- 17m
    (r_vuelta_completa, s_obregon_centro_v,  'stop',     10, 3), -- 20m
    (r_vuelta_completa, s_aurrera_faja_v,    'stop',     11, 5), -- 25m
    (r_vuelta_completa, s_enmss,             'end',      12, 5); -- ~30m total

    -- Saturday route (Return)
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

    -- OUTBOUND: Aurrera Sur to DICIS
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