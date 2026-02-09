-- Create application user
CREATE USER app_user WITH PASSWORD 'app_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE repro_db TO app_user;
GRANT ALL ON SCHEMA public TO app_user;

-- Create reveal schema for dashboard storage
CREATE SCHEMA IF NOT EXISTS reveal;
GRANT ALL ON SCHEMA reveal TO app_user;

-- Transactions table (the data source for Reveal dashboards)
CREATE TABLE public.transactions (
    id serial PRIMARY KEY,
    item_description varchar(100) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    date date NOT NULL,
    category varchar(50) NOT NULL,
    organization_id integer NOT NULL DEFAULT 1
);

-- Dashboards table (Reveal dashboard storage)
CREATE TABLE reveal.dashboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    content jsonb,
    organization_id integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Grant table permissions to app_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA reveal TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA reveal TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA reveal GRANT ALL PRIVILEGES ON TABLES TO app_user;

-- Seed transactions data
INSERT INTO public.transactions (item_description, quantity, unit_price, total, date, category) VALUES
-- Clothing
('T-Shirt', 2, 30.00, 60.00, '2026-01-05', 'Clothing'),
('Jeans', 1, 75.00, 75.00, '2026-01-06', 'Clothing'),
('Hoodie', 3, 55.00, 165.00, '2026-01-08', 'Clothing'),
('Sneakers', 1, 120.00, 120.00, '2026-01-10', 'Clothing'),
('Socks (6-pack)', 4, 12.00, 48.00, '2026-01-12', 'Clothing'),
('Baseball Cap', 2, 25.00, 50.00, '2026-01-15', 'Clothing'),
('Winter Jacket', 1, 180.00, 180.00, '2026-01-18', 'Clothing'),
('Polo Shirt', 3, 45.00, 135.00, '2026-01-20', 'Clothing'),
('Dress Shirt', 2, 65.00, 130.00, '2026-01-22', 'Clothing'),
('Shorts', 4, 35.00, 140.00, '2026-01-25', 'Clothing'),
('Beanie', 5, 15.00, 75.00, '2026-01-28', 'Clothing'),
('Tank Top', 6, 18.00, 108.00, '2026-02-01', 'Clothing'),
('Cardigan', 1, 90.00, 90.00, '2026-02-03', 'Clothing'),
-- Electronics
('Wireless Mouse', 5, 29.99, 149.95, '2026-01-05', 'Electronics'),
('USB-C Hub', 3, 49.99, 149.97, '2026-01-07', 'Electronics'),
('Mechanical Keyboard', 2, 89.99, 179.98, '2026-01-09', 'Electronics'),
('27" Monitor', 1, 399.99, 399.99, '2026-01-11', 'Electronics'),
('Webcam', 4, 69.99, 279.96, '2026-01-14', 'Electronics'),
('USB Flash Drive 64GB', 10, 12.99, 129.90, '2026-01-16', 'Electronics'),
('Bluetooth Speaker', 2, 45.00, 90.00, '2026-01-19', 'Electronics'),
('Laptop Stand', 3, 35.00, 105.00, '2026-01-21', 'Electronics'),
('Wireless Earbuds', 2, 79.99, 159.98, '2026-01-24', 'Electronics'),
('Power Bank', 6, 25.00, 150.00, '2026-01-26', 'Electronics'),
('HDMI Cable', 8, 9.99, 79.92, '2026-01-29', 'Electronics'),
('Tablet Stand', 3, 22.00, 66.00, '2026-02-01', 'Electronics'),
('Screen Protector', 12, 8.99, 107.88, '2026-02-04', 'Electronics'),
('Charging Cable', 15, 7.99, 119.85, '2026-02-06', 'Electronics'),
-- Office Supplies
('Notebook (3-pack)', 8, 9.99, 79.92, '2026-01-05', 'Office Supplies'),
('Ballpoint Pens (12)', 6, 5.99, 35.94, '2026-01-07', 'Office Supplies'),
('Sticky Notes', 10, 3.99, 39.90, '2026-01-10', 'Office Supplies'),
('Whiteboard Markers', 4, 8.99, 35.96, '2026-01-13', 'Office Supplies'),
('Desk Organizer', 2, 24.99, 49.98, '2026-01-15', 'Office Supplies'),
('Paper Clips (500)', 3, 4.99, 14.97, '2026-01-18', 'Office Supplies'),
('Stapler', 2, 12.99, 25.98, '2026-01-20', 'Office Supplies'),
('Binder Clips', 5, 6.99, 34.95, '2026-01-23', 'Office Supplies'),
('Copy Paper (ream)', 10, 7.99, 79.90, '2026-01-25', 'Office Supplies'),
('File Folders (25)', 4, 11.99, 47.96, '2026-01-28', 'Office Supplies'),
('Label Maker', 1, 39.99, 39.99, '2026-01-30', 'Office Supplies'),
('Scissors', 3, 6.99, 20.97, '2026-02-02', 'Office Supplies'),
('Tape Dispenser', 4, 8.99, 35.96, '2026-02-05', 'Office Supplies'),
-- Food & Beverage
('Coffee Beans (1lb)', 5, 14.99, 74.95, '2026-01-06', 'Food & Beverage'),
('Green Tea (box)', 8, 6.99, 55.92, '2026-01-08', 'Food & Beverage'),
('Sparkling Water (12pk)', 3, 8.99, 26.97, '2026-01-11', 'Food & Beverage'),
('Protein Bars (12)', 4, 24.99, 99.96, '2026-01-13', 'Food & Beverage'),
('Trail Mix (1lb)', 6, 9.99, 59.94, '2026-01-16', 'Food & Beverage'),
('Dried Fruit (1lb)', 3, 11.99, 35.97, '2026-01-19', 'Food & Beverage'),
('Granola (bag)', 5, 7.99, 39.95, '2026-01-21', 'Food & Beverage'),
('Almonds (1lb)', 4, 13.99, 55.96, '2026-01-24', 'Food & Beverage'),
('Dark Chocolate Bar', 10, 4.99, 49.90, '2026-01-26', 'Food & Beverage'),
('Coconut Water (6pk)', 3, 12.99, 38.97, '2026-01-29', 'Food & Beverage'),
('Instant Oatmeal (10pk)', 6, 5.99, 35.94, '2026-02-01', 'Food & Beverage'),
('Honey (16oz)', 2, 9.99, 19.98, '2026-02-03', 'Food & Beverage'),
('Matcha Powder', 2, 19.99, 39.98, '2026-02-06', 'Food & Beverage'),
-- Furniture
('Standing Desk Mat', 2, 45.00, 90.00, '2026-01-07', 'Furniture'),
('Ergonomic Chair', 1, 499.99, 499.99, '2026-01-10', 'Furniture'),
('Desk Lamp', 3, 32.00, 96.00, '2026-01-14', 'Furniture'),
('Bookshelf', 1, 149.99, 149.99, '2026-01-17', 'Furniture'),
('Monitor Arm', 2, 65.00, 130.00, '2026-01-21', 'Furniture'),
('Filing Cabinet', 1, 189.99, 189.99, '2026-01-24', 'Furniture'),
('Footrest', 2, 29.99, 59.98, '2026-01-27', 'Furniture'),
('Desk Shelf Riser', 3, 25.00, 75.00, '2026-01-30', 'Furniture'),
('Whiteboard (48x36)', 1, 79.99, 79.99, '2026-02-02', 'Furniture'),
('Cork Board', 2, 22.99, 45.98, '2026-02-05', 'Furniture'),
-- Fitness
('Yoga Mat', 3, 29.99, 89.97, '2026-01-06', 'Fitness'),
('Resistance Bands', 5, 14.99, 74.95, '2026-01-09', 'Fitness'),
('Jump Rope', 4, 12.99, 51.96, '2026-01-12', 'Fitness'),
('Foam Roller', 2, 24.99, 49.98, '2026-01-15', 'Fitness'),
('Water Bottle (32oz)', 8, 15.00, 120.00, '2026-01-18', 'Fitness'),
('Dumbbell Set', 1, 89.99, 89.99, '2026-01-22', 'Fitness'),
('Exercise Ball', 2, 19.99, 39.98, '2026-01-25', 'Fitness'),
('Gym Towel (3pk)', 4, 16.99, 67.96, '2026-01-28', 'Fitness'),
('Pull-up Bar', 1, 34.99, 34.99, '2026-02-01', 'Fitness'),
('Fitness Tracker', 2, 49.99, 99.98, '2026-02-04', 'Fitness'),
-- Books & Media
('Programming Book', 2, 44.99, 89.98, '2026-01-07', 'Books & Media'),
('Business Strategy Book', 3, 18.99, 56.97, '2026-01-11', 'Books & Media'),
('Audiobook Subscription', 1, 14.99, 14.99, '2026-01-14', 'Books & Media'),
('Technical Manual', 1, 59.99, 59.99, '2026-01-18', 'Books & Media'),
('Notebook Journal', 5, 12.99, 64.95, '2026-01-22', 'Books & Media'),
('E-reader Case', 2, 19.99, 39.98, '2026-01-26', 'Books & Media'),
('Design Book', 1, 35.00, 35.00, '2026-01-30', 'Books & Media'),
('Language Course', 1, 29.99, 29.99, '2026-02-03', 'Books & Media'),
-- Cleaning
('All-Purpose Cleaner', 4, 5.99, 23.96, '2026-01-08', 'Cleaning'),
('Paper Towels (6-roll)', 3, 11.99, 35.97, '2026-01-13', 'Cleaning'),
('Hand Sanitizer (3pk)', 6, 8.99, 53.94, '2026-01-17', 'Cleaning'),
('Disinfecting Wipes', 5, 6.99, 34.95, '2026-01-22', 'Cleaning'),
('Trash Bags (50ct)', 3, 9.99, 29.97, '2026-01-27', 'Cleaning'),
('Microfiber Cloths (12)', 2, 14.99, 29.98, '2026-02-01', 'Cleaning'),
('Air Freshener', 4, 4.99, 19.96, '2026-02-05', 'Cleaning');
