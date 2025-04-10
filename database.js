const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

/**
 * Generate a secure recovery code with format XXXX-XXXX-XXXX-XXXX
 * @returns {string} The formatted recovery code
 */
function generateRecoveryCode() {
    const length = 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        if (i > 0 && i % 4 === 0) result += '-';
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
console.log('Initializing database...');
const dbPath = path.join(dataDir, 'cms.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        throw err; // Critical error, fail on startup
    }
    console.log('Connected to the CMS database.');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
});

/**
 * Initializes database tables and default admin account if needed
 */
function initializeDatabase() {
    console.log('Starting database initialization...');
    
    // Create admin table first
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        recovery_code1 TEXT,
        recovery_code2 TEXT,
        last_recovery_date DATETIME
    )`, (err) => {
        if (err) {
            console.error('Error creating admin table:', err.message);
            throw err; // Critical error, fail on startup
        }
        console.log('Admin table created or already exists');

        // Check if admin account exists
        db.get("SELECT * FROM admin WHERE username = 'admin'", [], (err, row) => {
            if (err) {
                console.error('Error checking admin account:', err.message);
                throw err; // Critical error, fail on startup
            }
            
            if (!row) {
                console.log('No admin account found, creating default account...');
                
                // Generate initial recovery codes
                const recoveryCode1 = generateRecoveryCode();
                const recoveryCode2 = generateRecoveryCode();
                
                // Create default admin account
                bcrypt.hash('admin123', 10, (err, hashedPassword) => {
                    if (err) {
                        console.error('Error hashing password:', err.message);
                        throw err; // Critical error, fail on startup
                    }

                    // Hash recovery codes
                    bcrypt.hash(recoveryCode1, 10, (err, hashedCode1) => {
                        if (err) {
                            console.error('Error hashing recovery code 1:', err.message);
                            throw err; // Critical error, fail on startup
                        }

                        bcrypt.hash(recoveryCode2, 10, (err, hashedCode2) => {
                            if (err) {
                                console.error('Error hashing recovery code 2:', err.message);
                                throw err; // Critical error, fail on startup
                            }

                            db.run(`INSERT INTO admin (username, password, recovery_code1, recovery_code2) 
                                   VALUES (?, ?, ?, ?)`,
                                ['admin', hashedPassword, hashedCode1, hashedCode2],
                                (err) => {
                                    if (err) {
                                        console.error('Error creating admin account:', err.message);
                                        throw err; // Critical error, fail on startup
                                    }

                                    console.log('=======================================');
                                    console.log('Default admin account created:');
                                    console.log('Username: admin');
                                    console.log('Password: admin123');
                                    console.log('Recovery Code 1:', recoveryCode1);
                                    console.log('Recovery Code 2:', recoveryCode2);
                                    console.log('IMPORTANT: Save these recovery codes and');
                                    console.log('change the password immediately!');
                                    console.log('=======================================');
                                }
                            );
                        });
                    });
                });
            } else {
                console.log('Admin account already exists');
            }
        });
    });

    // Create other tables
    const createTableQueries = [
        // Galleries table
        `CREATE TABLE IF NOT EXISTS galleries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Gallery images table
        `CREATE TABLE IF NOT EXISTS gallery_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gallery_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            FOREIGN KEY(gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
        )`,
        
        // Blog posts table
        `CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            excerpt TEXT,
            image TEXT,
            slug TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Blog tags table
        `CREATE TABLE IF NOT EXISTS blog_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_name TEXT UNIQUE NOT NULL
        )`,
        
        // Post tags relationship table
        `CREATE TABLE IF NOT EXISTS post_tags (
            post_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (post_id, tag_id),
            FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
        )`
    ];

    // Execute all table creation queries sequentially
    let tableIndex = 0;
    
    function createNextTable() {
        if (tableIndex >= createTableQueries.length) {
            console.log('All tables created successfully');
            return;
        }
        
        const query = createTableQueries[tableIndex];
        db.run(query, (err) => {
            if (err) {
                console.error(`Error creating table ${tableIndex + 1}:`, err.message);
                throw err; // Critical error, fail on startup
            }
            
            console.log(`Table ${tableIndex + 1} created or already exists`);
            tableIndex++;
            createNextTable();
        });
    }
    
    createNextTable();
}

// Create an async wrapper for database operations
db.asyncRun = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

db.asyncGet = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, function(err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.asyncAll = function(sql, params) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Register a function to close database on process exit
process.on('exit', () => {
    console.log('Closing database connection...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
    });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

// Initialize the database
initializeDatabase();

module.exports = {
    db,
    generateRecoveryCode
};