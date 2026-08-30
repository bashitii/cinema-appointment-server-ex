INSERT INTO users (full_name, email, password, role) VALUES
('Admin User', 'admin@cinemanova.com', '$2b$10$replace_this_with_a_real_bcrypt_hash_before_using', 'admin');

INSERT INTO movies (title, description, genre, duration, release_date, poster_url, status) VALUES
('Dune: Part Two', 'Paul Atreides unites with the Fremen to seek revenge against the conspirators who destroyed his family.', 'Sci-Fi', 166, '2024-03-01', '', 'now_showing'),
('The Batman', 'Batman uncovers corruption in Gotham City while pursuing the Riddler.', 'Action', 176, '2022-03-04', '', 'now_showing'),
('Interstellar', 'A team of explorers travels through a wormhole in space to save humanity.', 'Sci-Fi', 169, '2014-11-07', '', 'now_showing');

INSERT INTO screens (screen_name, capacity) VALUES
('Screen 1', 32),
('Screen 2', 32);

INSERT INTO seats (screen_id, seat_number, seat_row)
SELECT 1, seat_number, seat_row
FROM (VALUES
('1', 'A'), ('2', 'A'), ('3', 'A'), ('4', 'A'), ('5', 'A'), ('6', 'A'), ('7', 'A'), ('8', 'A'),
('1', 'B'), ('2', 'B'), ('3', 'B'), ('4', 'B'), ('5', 'B'), ('6', 'B'), ('7', 'B'), ('8', 'B'),
('1', 'C'), ('2', 'C'), ('3', 'C'), ('4', 'C'), ('5', 'C'), ('6', 'C'), ('7', 'C'), ('8', 'C'),
('1', 'D'), ('2', 'D'), ('3', 'D'), ('4', 'D'), ('5', 'D'), ('6', 'D'), ('7', 'D'), ('8', 'D')
) AS seat_data(seat_number, seat_row);

