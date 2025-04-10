// Import necessary modules
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { db, generateRecoveryCode } = require('./database');
const crypto = require('crypto');
const app = express();

// Generate a secure session secret
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Configure EJS and middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Trust proxy if behind load balancer
app.set('trust proxy', 1);

// Add session middleware (single configuration)
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId' // Use a non-default name
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: Images only!');
    }
});

// Ensure uploads directory exists
if (!fs.existsSync('public/uploads')) {
    fs.mkdirSync('public/uploads', { recursive: true });
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// Main routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/services', (req, res) => {
    res.render('services');
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

// Learning Programme route
app.get('/learning-programme', (req, res) => {
    res.render('learning-programme');
});

// Team Building route
app.get('/team-building', (req, res) => {
    res.render('team-building');
});

// Gallery routes
app.get('/gallery', (req, res) => {
    db.all(`
        SELECT galleries.*, GROUP_CONCAT(gallery_images.filename) AS images
        FROM galleries
        LEFT JOIN gallery_images ON galleries.id = gallery_images.gallery_id
        GROUP BY galleries.id
        ORDER BY created_at DESC
    `, (err, galleries) => {
        if (err) {
            console.error('Error fetching galleries:', err);
            return res.status(500).send('An error occurred while fetching galleries');
        }

        galleries = galleries.map(gallery => ({
            ...gallery,
            images: gallery.images ? gallery.images.split(',') : []
        }));

        res.render('gallery', { galleries });
    });
});

// Blog routes
app.get('/blog', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const postsPerPage = 6;
    const offset = (page - 1) * postsPerPage;

    db.get('SELECT COUNT(*) as count FROM blog_posts', [], (err, row) => {
        if (err) {
            console.error('Error counting blog posts:', err);
            return res.status(500).send('An error occurred while fetching blog posts');
        }
        
        const totalPosts = row.count;
        const totalPages = Math.ceil(totalPosts / postsPerPage);

        db.all(`
            SELECT 
                blog_posts.*,
                GROUP_CONCAT(blog_tags.tag_name) as tags
            FROM blog_posts
            LEFT JOIN post_tags ON blog_posts.id = post_tags.post_id
            LEFT JOIN blog_tags ON post_tags.tag_id = blog_tags.id
            GROUP BY blog_posts.id
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [postsPerPage, offset], (err, posts) => {
            if (err) {
                console.error('Error fetching blog posts:', err);
                return res.status(500).send('An error occurred while fetching blog posts');
            }

            const blogPosts = posts.map(post => ({
                ...post,
                tags: post.tags ? post.tags.split(',') : []
            }));

            res.render('blog', {
                blogPosts,
                currentPage: page,
                totalPages
            });
        });
    });
});

app.get('/blog/:slug', (req, res) => {
    db.get(`
        SELECT 
            blog_posts.*,
            GROUP_CONCAT(blog_tags.tag_name) as tags
        FROM blog_posts
        LEFT JOIN post_tags ON blog_posts.id = post_tags.post_id
        LEFT JOIN blog_tags ON post_tags.tag_id = blog_tags.id
        WHERE blog_posts.slug = ?
        GROUP BY blog_posts.id
    `, [req.params.slug], (err, post) => {
        if (err) {
            console.error('Error fetching blog post:', err);
            return res.status(500).send('An error occurred while fetching blog post');
        }
        if (!post) return res.status(404).send('Post not found');

        post.tags = post.tags ? post.tags.split(',') : [];
        res.render('blog-post', { post });
    });
});

// Auth routes
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admin WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Login query error:', err);
            return res.render('admin/login', { error: 'An error occurred' });
        }

        if (!user) {
            return res.render('admin/login', { error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, match) => {
            if (err || !match) {
                return res.render('admin/login', { error: 'Invalid credentials' });
            }

            req.session.isAuthenticated = true;
            
            // Save session explicitly
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.render('admin/login', { error: 'Session error occurred' });
                }
                res.redirect('/admin');
            });
        });
    });
});

app.get('/admin/recovery', (req, res) => {
    res.render('admin/reset-password', { showPasswordFields: false });
});

app.post('/admin/recovery', (req, res) => {
    const { recoveryCode, newPassword, confirmPassword } = req.body;

    // If only recovery code is provided (first step)
    if (recoveryCode && !newPassword) {
        db.get('SELECT * FROM admin WHERE id = 1', [], (err, user) => {
            if (err) {
                console.error('Recovery code check error:', err);
                return res.render('admin/reset-password', { 
                    error: 'An error occurred',
                    showPasswordFields: false 
                });
            }

            if (!user) {
                return res.render('admin/reset-password', { 
                    error: 'Admin account not found',
                    showPasswordFields: false 
                });
            }

            // Check both recovery codes
            bcrypt.compare(recoveryCode, user.recovery_code1, (err, match1) => {
                if (err) {
                    console.error('Recovery code comparison error:', err);
                    return res.render('admin/reset-password', { 
                        error: 'An error occurred',
                        showPasswordFields: false 
                    });
                }

                bcrypt.compare(recoveryCode, user.recovery_code2, (err, match2) => {
                    if (err) {
                        console.error('Recovery code comparison error:', err);
                        return res.render('admin/reset-password', { 
                            error: 'An error occurred',
                            showPasswordFields: false 
                        });
                    }

                    if (match1 || match2) {
                        // Valid recovery code, show password fields
                        return res.render('admin/reset-password', { 
                            showPasswordFields: true,
                            recoveryCode: recoveryCode
                        });
                    } else {
                        return res.render('admin/reset-password', { 
                            error: 'Invalid recovery code',
                            showPasswordFields: false 
                        });
                    }
                });
            });
        });
    } 
    // If both recovery code and new password are provided (second step)
    else if (recoveryCode && newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
            return res.render('admin/reset-password', { 
                error: 'Passwords do not match',
                showPasswordFields: true,
                recoveryCode: recoveryCode
            });
        }

        if (newPassword.length < 8) {
            return res.render('admin/reset-password', { 
                error: 'Password must be at least 8 characters long',
                showPasswordFields: true,
                recoveryCode: recoveryCode
            });
        }

        // Generate new recovery codes
        const newRecoveryCode1 = generateRecoveryCode();
        const newRecoveryCode2 = generateRecoveryCode();

        // Hash new password and recovery codes
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Password hash error:', err);
                return res.render('admin/reset-password', { 
                    error: 'An error occurred',
                    showPasswordFields: true,
                    recoveryCode: recoveryCode
                });
            }

            bcrypt.hash(newRecoveryCode1, 10, (err, hashedCode1) => {
                if (err) {
                    console.error('Recovery code hash error:', err);
                    return res.render('admin/reset-password', { 
                        error: 'An error occurred',
                        showPasswordFields: true,
                        recoveryCode: recoveryCode
                    });
                }

                bcrypt.hash(newRecoveryCode2, 10, (err, hashedCode2) => {
                    if (err) {
                        console.error('Recovery code hash error:', err);
                        return res.render('admin/reset-password', { 
                            error: 'An error occurred',
                            showPasswordFields: true,
                            recoveryCode: recoveryCode
                        });
                    }

                    // Update admin record
                    db.run(`
                        UPDATE admin 
                        SET password = ?, 
                            recovery_code1 = ?, 
                            recovery_code2 = ?,
                            last_recovery_date = CURRENT_TIMESTAMP
                        WHERE id = 1
                    `, [hashedPassword, hashedCode1, hashedCode2], (err) => {
                        if (err) {
                            console.error('Admin update error:', err);
                            return res.render('admin/reset-password', { 
                                error: 'An error occurred',
                                showPasswordFields: true,
                                recoveryCode: recoveryCode
                            });
                        }

                        // Show new recovery codes
                        res.render('admin/new-recovery-codes', {
                            recoveryCode1: newRecoveryCode1,
                            recoveryCode2: newRecoveryCode2
                        });
                    });
                });
            });
        });
    } else {
        // Invalid parameters
        res.render('admin/reset-password', { 
            error: 'Invalid request parameters',
            showPasswordFields: false 
        });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/admin/login');
    });
});

// Admin routes (protected)
app.get('/admin', isAuthenticated, (req, res) => {
    // Fetch galleries
    db.all(`
        SELECT galleries.*, GROUP_CONCAT(gallery_images.filename) AS images
        FROM galleries
        LEFT JOIN gallery_images ON galleries.id = gallery_images.gallery_id
        GROUP BY galleries.id
        ORDER BY created_at DESC
    `, (err, galleries) => {
        if (err) {
            console.error('Error fetching galleries:', err);
            return res.status(500).send('Error fetching galleries');
        }

        galleries = galleries.map(gallery => ({
            ...gallery,
            images: gallery.images ? gallery.images.split(',') : []
        }));

        // Fetch blog posts
        db.all(`
            SELECT 
                blog_posts.*,
                GROUP_CONCAT(blog_tags.tag_name) as tags
            FROM blog_posts
            LEFT JOIN post_tags ON blog_posts.id = post_tags.post_id
            LEFT JOIN blog_tags ON post_tags.tag_id = blog_tags.id
            GROUP BY blog_posts.id
            ORDER BY created_at DESC
        `, (err, posts) => {
            if (err) {
                console.error('Error fetching blog posts:', err);
                return res.status(500).send('Error fetching blog posts');
            }

            const blogPosts = posts.map(post => ({
                ...post,
                tags: post.tags ? post.tags.split(',') : []
            }));

            res.render('admin/dashboard', { galleries, blogPosts });
        });
    });
});

// Handle gallery submission
app.post('/admin/add-gallery', isAuthenticated, upload.array('galleryImages', 50), (req, res) => {
    const { title, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).send('No files were uploaded');
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            'INSERT INTO galleries (title, description) VALUES (?, ?)',
            [title, description],
            function(err) {
                if (err) {
                    console.error('Error creating gallery:', err);
                    db.run('ROLLBACK');
                    return res.status(500).send('Error creating gallery');
                }

                const galleryId = this.lastID;
                const stmt = db.prepare('INSERT INTO gallery_images (gallery_id, filename) VALUES (?, ?)');
                
                try {
                    files.forEach(file => {
                        stmt.run(galleryId, file.filename);
                    });
                    stmt.finalize();

                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Error committing transaction');
                        }
                        res.redirect('/admin');
                    });
                } catch (error) {
                    console.error('Error processing gallery images:', error);
                    db.run('ROLLBACK');
                    return res.status(500).send('Error processing gallery images');
                }
            }
        );
    });
});

// Handle blog post submission
app.post('/admin/add-blog', isAuthenticated, upload.single('blogImage'), (req, res) => {
    const { title, content, excerpt, tags } = req.body;
    const image = req.file ? req.file.filename : null;
    const slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(`
            INSERT INTO blog_posts (title, content, excerpt, image, slug)
            VALUES (?, ?, ?, ?, ?)
        `, [title, content, excerpt, image, slug], function(err) {
            if (err) {
                console.error('Error creating blog post:', err);
                db.run('ROLLBACK');
                return res.status(500).send('Error creating blog post');
            }

            const postId = this.lastID;

            if (tags && tags.trim() !== '') {
                const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                
                if (tagArray.length > 0) {
                    const tagStmt = db.prepare(`
                        INSERT OR IGNORE INTO blog_tags (tag_name)
                        VALUES (?)
                    `);

                    let tagProcessed = 0;
                    const totalTags = tagArray.length;

                    tagArray.forEach(tag => {
                        tagStmt.run(tag, function(err) {
                            if (err) {
                                console.error('Error inserting tag:', err);
                                db.run('ROLLBACK');
                                return res.status(500).send('Error processing tags');
                            }

                            db.run(`
                                INSERT INTO post_tags (post_id, tag_id)
                                SELECT ?, id FROM blog_tags WHERE tag_name = ?
                            `, [postId, tag], function(err) {
                                if (err) {
                                    console.error('Error linking tag to post:', err);
                                    db.run('ROLLBACK');
                                    return res.status(500).send('Error linking tags to post');
                                }

                                tagProcessed++;
                                
                                // If all tags are processed, commit the transaction
                                if (tagProcessed === totalTags) {
                                    tagStmt.finalize();
                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            console.error('Error committing transaction:', err);
                                            return res.status(500).send('Error committing transaction');
                                        }
                                        res.redirect('/admin?tab=blog');
                                    });
                                }
                            });
                        });
                    });
                } else {
                    // No valid tags
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Error committing transaction');
                        }
                        res.redirect('/admin?tab=blog');
                    });
                }
            } else {
                // No tags provided
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                        return res.status(500).send('Error committing transaction');
                    }
                    res.redirect('/admin?tab=blog');
                });
            }
        });
    });
});

// Handle gallery deletion
app.post('/admin/delete-gallery/:id', isAuthenticated, (req, res) => {
    const galleryId = req.params.id;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get image filenames before deleting
        db.all('SELECT filename FROM gallery_images WHERE gallery_id = ?', [galleryId], (err, images) => {
            if (err) {
                console.error('Error fetching gallery images:', err);
                db.run('ROLLBACK');
                return res.status(500).send('Error fetching gallery images');
            }

            // Delete from database
            db.run('DELETE FROM gallery_images WHERE gallery_id = ?', [galleryId], function(err) {
                if (err) {
                    console.error('Error deleting gallery images:', err);
                    db.run('ROLLBACK');
                    return res.status(500).send('Error deleting gallery images');
                }

                db.run('DELETE FROM galleries WHERE id = ?', [galleryId], function(err) {
                    if (err) {
                        console.error('Error deleting gallery:', err);
                        db.run('ROLLBACK');
                        return res.status(500).send('Error deleting gallery');
                    }

                    // Delete image files
                    const deleteErrors = [];
                    images.forEach(image => {
                        const filePath = path.join(__dirname, 'public', 'uploads', image.filename);
                        try {
                            fs.unlinkSync(filePath);
                        } catch (err) {
                            deleteErrors.push(err);
                            console.error('Error deleting file:', err);
                        }
                    });

                    if (deleteErrors.length > 0) {
                        console.warn(`${deleteErrors.length} files could not be deleted. Database records have been removed.`);
                    }

                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Error committing transaction');
                        }
                        res.redirect('/admin');
                    });
                });
            });
        });
    });
});

// Handle blog post deletion
app.post('/admin/delete-blog/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Get image filename before deleting
        db.get('SELECT image FROM blog_posts WHERE id = ?', [postId], (err, post) => {
            if (err) {
                console.error('Error fetching blog post:', err);
                db.run('ROLLBACK');
                return res.status(500).send('Error fetching blog post');
            }

            // Delete from database
            db.run('DELETE FROM post_tags WHERE post_id = ?', [postId], function(err) {
                if (err) {
                    console.error('Error deleting post tags:', err);
                    db.run('ROLLBACK');
                    return res.status(500).send('Error deleting post tags');
                }

                db.run('DELETE FROM blog_posts WHERE id = ?', [postId], function(err) {
                    if (err) {
                        console.error('Error deleting blog post:', err);
                        db.run('ROLLBACK');
                        return res.status(500).send('Error deleting blog post');
                    }

                    // Delete image file if it exists
                    if (post && post.image) {
                        const filePath = path.join(__dirname, 'public', 'uploads', post.image);
                        try {
                            fs.unlinkSync(filePath);
                        } catch (err) {
                            console.error('Error deleting file:', err);
                            // Continue even if file deletion fails
                        }
                    }

                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Error committing transaction');
                        }
                        res.redirect('/admin');
                    });
                });
            });
        });
    });
});

// Debug route to check session status
app.get('/debug-session', isAuthenticated, (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        isAuthenticated: req.session?.isAuthenticated,
        cookies: req.cookies
    });
});

// Route to get the edit gallery page
app.get('/admin/edit-gallery/:id', isAuthenticated, (req, res) => {
    const galleryId = req.params.id;
    
    db.get(`
        SELECT galleries.*, GROUP_CONCAT(gallery_images.filename) AS images
        FROM galleries
        LEFT JOIN gallery_images ON galleries.id = gallery_images.gallery_id
        WHERE galleries.id = ?
        GROUP BY galleries.id
    `, [galleryId], (err, gallery) => {
        if (err) {
            console.error('Error fetching gallery:', err);
            return res.status(500).send('Error fetching gallery');
        }
        
        if (!gallery) {
            return res.status(404).send('Gallery not found');
        }
        
        gallery.images = gallery.images ? gallery.images.split(',') : [];
        
        res.render('admin/edit-gallery', { gallery });
    });
});

// Route to update a gallery
app.post('/admin/update-gallery/:id', isAuthenticated, upload.array('newImages', 50), (req, res) => {
    const galleryId = req.params.id;
    const { title, description, removedImages } = req.body;
    const newFiles = req.files;
    
    // Parse the removed images array
    let imagesToRemove = [];
    if (removedImages) {
        try {
            imagesToRemove = JSON.parse(removedImages);
        } catch (e) {
            console.error('Error parsing removedImages:', e);
            return res.status(400).send('Invalid removedImages format');
        }
    }
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Update gallery details
        db.run(
            'UPDATE galleries SET title = ?, description = ? WHERE id = ?',
            [title, description, galleryId],
            function(err) {
                if (err) {
                    console.error('Error updating gallery:', err);
                    db.run('ROLLBACK');
                    return res.status(500).send('Error updating gallery');
                }
                
                // Process removed images
                const processRemovedImages = () => {
                    if (imagesToRemove.length > 0) {
                        const placeholders = imagesToRemove.map(() => '?').join(',');
                        db.run(
                            `DELETE FROM gallery_images WHERE gallery_id = ? AND filename IN (${placeholders})`,
                            [galleryId, ...imagesToRemove],
                            function(err) {
                                if (err) {
                                    console.error('Error removing images:', err);
                                    db.run('ROLLBACK');
                                    return res.status(500).send('Error removing images');
                                }
                                
                                // Delete image files
                                const deleteErrors = [];
                                imagesToRemove.forEach(filename => {
                                    const filePath = path.join(__dirname, 'public', 'uploads', filename);
                                    try {
                                        fs.unlinkSync(filePath);
                                    } catch (err) {
                                        deleteErrors.push(err);
                                        console.error('Error deleting file:', err);
                                    }
                                });

                                if (deleteErrors.length > 0) {
                                    console.warn(`${deleteErrors.length} files could not be deleted. Database records have been removed.`);
                                }
                                
                                processNewImages();
                            }
                        );
                    } else {
                        processNewImages();
                    }
                };
                
                // Process new images
                const processNewImages = () => {
                    if (newFiles && newFiles.length > 0) {
                        const stmt = db.prepare('INSERT INTO gallery_images (gallery_id, filename) VALUES (?, ?)');
                        
                        try {
                            newFiles.forEach(file => {
                                stmt.run(galleryId, file.filename);
                            });
                            stmt.finalize();
                            
                            completeTransaction();
                        } catch (error) {
                            console.error('Error adding new images:', error);
                            db.run('ROLLBACK');
                            return res.status(500).send('Error adding new images');
                        }
                    } else {
                        completeTransaction();
                    }
                };
                
                // Complete transaction
                const completeTransaction = () => {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Error committing transaction');
                        }
                        res.redirect('/admin');
                    });
                };
                
                // Start processing
                processRemovedImages();
            }
        );
    });
});

// Route to get the edit blog post page
app.get('/admin/edit-blog/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    
    db.get(`
        SELECT 
            blog_posts.*,
            GROUP_CONCAT(blog_tags.tag_name) as tags
        FROM blog_posts
        LEFT JOIN post_tags ON blog_posts.id = post_tags.post_id
        LEFT JOIN blog_tags ON post_tags.tag_id = blog_tags.id
        WHERE blog_posts.id = ?
        GROUP BY blog_posts.id
    `, [postId], (err, post) => {
        if (err) {
            console.error('Error fetching blog post:', err);
            return res.status(500).send('Error fetching blog post');
        }
        
        if (!post) {
            return res.status(404).send('Blog post not found');
        }
        
        post.tags = post.tags ? post.tags.split(',') : [];
        
        res.render('admin/edit-blog', { post });
    });
});

// Route to update a blog post
app.post('/admin/update-blog/:id', isAuthenticated, upload.single('blogImage'), async (req, res) => {
    const postId = req.params.id;
    const { title, content, excerpt, tags, removeFeaturedImage } = req.body;
    const newImage = req.file ? req.file.filename : null;
    
    // Generate slug from title
    const slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    
    try {
        // Begin transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // First, check if we need to remove the current featured image
        if (removeFeaturedImage === 'true') {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT image FROM blog_posts WHERE id = ?', [postId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (row && row.image) {
                // Delete the old image file
                const filePath = path.join(__dirname, 'public', 'uploads', row.image);
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error('Error deleting file:', err);
                    // Continue even if file deletion fails
                }
            }
        }
        
        // Determine update query based on image handling
        let updateQuery, updateParams;
        
        if (newImage) {
            // If there's a new image, update the image field
            updateQuery = `
                UPDATE blog_posts 
                SET title = ?, content = ?, excerpt = ?, image = ?, slug = ?
                WHERE id = ?
            `;
            updateParams = [title, content, excerpt, newImage, slug, postId];
        } else if (removeFeaturedImage === 'true') {
            // If featured image should be removed and no new image
            updateQuery = `
                UPDATE blog_posts 
                SET title = ?, content = ?, excerpt = ?, image = NULL, slug = ?
                WHERE id = ?
            `;
            updateParams = [title, content, excerpt, slug, postId];
        } else {
            // Just update text fields
            updateQuery = `
                UPDATE blog_posts 
                SET title = ?, content = ?, excerpt = ?, slug = ?
                WHERE id = ?
            `;
            updateParams = [title, content, excerpt, slug, postId];
        }
        
        // Update blog post details
        await new Promise((resolve, reject) => {
            db.run(updateQuery, updateParams, function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Delete existing tag associations
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM post_tags WHERE post_id = ?', [postId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Process new tags if provided
        if (tags && tags.trim() !== '') {
            const tagArray = tags.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
            
            // Add tags one by one
            for (const tag of tagArray) {
                // Insert tag if it doesn't exist
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT OR IGNORE INTO blog_tags (tag_name)
                        VALUES (?)
                    `, [tag], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                // Link tag to post
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO post_tags (post_id, tag_id)
                        SELECT ?, id FROM blog_tags WHERE tag_name = ?
                    `, [postId, tag], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }
        
        // Commit transaction if all operations succeeded
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        return res.redirect('/admin?tab=blog');
        
    } catch (error) {
        // Rollback transaction on any error
        db.run('ROLLBACK', () => {
            console.error('Error updating blog post:', error);
            return res.status(500).send('Error updating blog post: ' + error.message);
        });
    }
});

// Route to handle inline image uploads for Quill editor
app.post('/admin/upload-inline-image', isAuthenticated, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the location of the uploaded file for Quill
    res.json({
        location: `/uploads/${req.file.filename}`
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});