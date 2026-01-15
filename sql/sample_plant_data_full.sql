-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear tables in order that avoids foreign key errors
TRUNCATE TABLE sales;
TRUNCATE TABLE inventory;
TRUNCATE TABLE plants;
TRUNCATE TABLE categories;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

/* ==================================================
   COMPLETE SAMPLE DATA FOR PLANTS DATABASE
   ================================================== */

/* ================================
   1. CATEGORIES
   ================================ */
INSERT INTO categories (id, name, parent_id) VALUES
(1, 'Indoor', NULL),
(2, 'Outdoor', NULL),
(3, 'Flowers', 1),
(4, 'Succulent', 1),
(5, 'Trees', 2),
(6, 'Herbs', 1),
(7, 'Cactus', 4),
(8, 'Fruit', 2),
(9, 'Ornamental', 2);


/* ================================
   2. PLANTS
   ================================ */
INSERT INTO plants (id, name, price, quantity, category_id) VALUES
(1, 'Rose', 1200.00, 50, 3),
(2, 'Aloe', 800.00, 30, 4),
(3, 'Money', 600.00, 40, 1),
(4, 'Mango', 2500.00, 15, 5),
(5, 'Basil', 500.00, 25, 6),
(6, 'Thyme', 450.00, 20, 6),
(7, 'Cactus1', 700.00, 15, 7),
(8, 'Cactus2', 800.00, 10, 7),
(9, 'Banana', 1500.00, 12, 8),
(10, 'Apple', 2000.00, 8, 8),
(11, 'Fern', 600.00, 18, 9),
(12, 'Orchid', 1200.00, 14, 9);


/* ================================
   3. INVENTORY
   ================================ */
INSERT INTO inventory (id, created_at, note, quantity, type, plant_id) VALUES
(1, NOW(), 'Stock added', 50, 'IN', 1),
(2, NOW(), 'Stock added', 30, 'IN', 2),
(3, NOW(), 'Stock added', 40, 'IN', 3),
(4, NOW(), 'Stock added', 15, 'IN', 4),
(5, NOW(), 'Damaged', 2, 'OUT', 1),
(6, NOW(), 'Stock added', 25, 'IN', 5),
(7, NOW(), 'Stock added', 20, 'IN', 6),
(8, NOW(), 'Stock added', 15, 'IN', 7),
(9, NOW(), 'Stock added', 10, 'IN', 8),
(10, NOW(), 'Stock added', 12, 'IN', 9),
(11, NOW(), 'Stock added', 8, 'IN', 10),
(12, NOW(), 'Stock added', 18, 'IN', 11),
(13, NOW(), 'Stock added', 14, 'IN', 12);


/* ================================
   4. SALES
   ================================ */
INSERT INTO sales (id, quantity, sold_at, total_price, plant_id) VALUES
(1, 5, NOW(), 6000.00, 1),
(2, 3, NOW(), 2400.00, 2),
(3, 2, NOW(), 1200.00, 3),
(4, 3, NOW(), 1500.00, 5),
(5, 2, NOW(), 900.00, 6),
(6, 1, NOW(), 700.00, 7),
(7, 2, NOW(), 1600.00, 8),
(8, 4, NOW(), 6000.00, 9),
(9, 2, NOW(), 4000.00, 10),
(10, 5, NOW(), 3000.00, 11),
(11, 3, NOW(), 3600.00, 12);


/* ================================
   5. VERIFY DATA
   ================================ */
SELECT * FROM categories;
SELECT * FROM plants;
SELECT * FROM inventory;
SELECT * FROM sales;