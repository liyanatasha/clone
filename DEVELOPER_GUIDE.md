# Experience Enablers - Technical Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [Frontend Components](#frontend-components)
  - [Public Website](#public-website)
  - [Admin Interface](#admin-interface)
- [Main Features](#main-features)
  - [Content Management System](#content-management-system)
  - [Blog System](#blog-system)
  - [Gallery Management](#gallery-management)
  - [Website Pages](#website-pages)
  - [Contact Form](#contact-form)
  - [Mobile Responsiveness](#mobile-responsiveness)
- [Account Information and Access](#account-information-and-access)
- [Installation and Setup](#installation-and-setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Security Features](#security-features)
- [File Handling](#file-handling)
- [SEO Optimization](#seo-optimization)
- [Maintenance and Updates](#maintenance-and-updates)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Third-Party Integrations](#third-party-integrations)

## Project Overview

This is a project for Experience Enablers website with CMS. The project consists of two main components:

1. **Public-facing website**: A responsive, modern website that showcases the company's services, blog content, galleries, and contact information to visitors.

2. **Content Management System (CMS)**: A secure admin interface that allows the company staff to manage website content, including blog posts, image galleries, and other content without requiring technical knowledge.

The application is built using Node.js with Express.js as the backend framework, EJS for template rendering, and SQLite as the database. The system provides a complete solution for the company to maintain their web presence without requiring developer intervention for content updates.

## Technology Stack

### Backend
- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: SQLite3 with the `sqlite3` Node.js module
- **Authentication**: Custom implementation using Express sessions and bcrypt
- **Template Engine**: EJS (Embedded JavaScript)

### Frontend
- **HTML/CSS/JavaScript**: Custom implementation
- **Rich Text Editor**: Quill.js for blog post creation and editing
- **Icon Library**: Font Awesome
- **Responsive Design**: Custom CSS with mobile-first approach

### File Management
- **Upload Handling**: Multer middleware
- **File Storage**: Local filesystem
- **Image Processing**: Native handling with Node.js fs module

### Third-Party Services
- **Form Handling**: Formspree for contact form submissions
- **Social Media Integration**: Links to LinkedIn and Instagram

## System Architecture

The application follows a classic server-rendered architecture:

1. **Client Tier**: Browser-based interface for both public website and admin dashboard
2. **Application Tier**: Express.js server handling requests, routing, and template rendering
3. **Data Tier**: SQLite database for data persistence

The system uses EJS templates rendered on the server side, with some client-side JavaScript for enhanced interactivity (particularly in the admin dashboard). Authentication is managed via server-side sessions, and data is persisted in a SQLite database for simplicity and ease of deployment.

## Project Structure

```
/
├── app.js                  // Main application entry point
├── database.js             // Database initialization and utilities
├── public/                 // Static assets directory
│   ├── style.css           // Main CSS file
│   ├── images/             // Static images (logos, icons, etc.)
│   └── uploads/            // User-uploaded files (blog images, gallery photos)
├── views/                  // EJS templates
│   ├── about.ejs           // About page
│   ├── admin/              // Admin dashboard templates
│   │   ├── dashboard.ejs   // Main admin dashboard
│   │   ├── edit-blog.ejs   // Blog post editor
│   │   ├── edit-gallery.ejs // Gallery editor
│   │   ├── login.ejs       // Admin login page
│   │   ├── new-recovery-codes.ejs // Recovery code display
│   │   └── reset-password.ejs // Password reset page
│   ├── blog.ejs            // Blog listing page
│   ├── blog-post.ejs       // Individual blog post page
│   ├── contact.ejs         // Contact page
│   ├── gallery.ejs         // Gallery page
│   ├── index.ejs           // Homepage
│   ├── learning-programme.ejs // Learning programme page
│   ├── partials/           // Reusable template parts
│   │   ├── header.ejs      // Page header component
│   │   └── footer.ejs      // Page footer component
│   ├── services.ejs        // Services page
│   └── team-building.ejs   // Team building page
├── data/                   // Database storage directory
│   └── cms.db              // SQLite database file
├── node_modules/           // Node.js dependencies
├── DEVELOPER_GUIDE.md
└── README.md 
```

## Database Schema

The application uses SQLite3 as its database with the following schema:

### Admin Table
```sql
CREATE TABLE admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,         -- Bcrypt-hashed password
    recovery_code1 TEXT,            -- Bcrypt-hashed recovery code
    recovery_code2 TEXT,            -- Bcrypt-hashed recovery code
    last_recovery_date DATETIME     -- Timestamp of last recovery
)
```

### Galleries Table
```sql
CREATE TABLE galleries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Gallery Images Table
```sql
CREATE TABLE gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    FOREIGN KEY(gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
)
```

### Blog Posts Table
```sql
CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,          -- HTML content from rich text editor
    excerpt TEXT,                   -- Summary for listings
    image TEXT,                     -- Featured image filename
    slug TEXT UNIQUE NOT NULL,      -- URL-friendly identifier
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Blog Tags Table
```sql
CREATE TABLE blog_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT UNIQUE NOT NULL
)
```

### Post Tags Relationship Table
```sql
CREATE TABLE post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
)
```

## Authentication System

The application uses a custom-built authentication system for admin access:

### Login Process

1. Admin user submits credentials at `/admin/login`
2. System retrieves admin record from database by username
3. Passwords are compared using bcrypt's compare function
4. On successful authentication:
   - Session is marked with `isAuthenticated: true`
   - User is redirected to the admin dashboard
5. On failed authentication:
   - Error message is displayed
   - User remains on the login page

### Session Management

- Sessions are managed using the `express-session` middleware
- Session configuration:
  ```javascript
  app.use(session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { 
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      name: 'sessionId' // Custom name for security
  }));
  ```
- A custom middleware `isAuthenticated` protects admin routes:
  ```javascript
  const isAuthenticated = (req, res, next) => {
      if (req.session && req.session.isAuthenticated) {
          next();
      } else {
          res.redirect('/admin/login');
      }
  };
  ```

### Account Recovery System

The system implements a dual recovery code approach:

1. Two recovery codes are generated during account creation/reset
2. Codes are hashed using bcrypt before storage
3. Recovery process:
   - Admin enters a recovery code
   - System verifies against both stored codes
   - If valid, admin creates a new password
   - System generates and displays two new recovery codes
   - Both codes and the password are updated in the database

## Frontend Components

### Public Website

The public-facing website consists of several key pages:

#### Homepage (index.ejs)
- Hero carousel with sliding images
- Call-to-action button
- Partner/client logo showcase

#### About Page (about.ejs)
- Company introduction
- Team member profiles with LinkedIn links
- Partner trainer profiles

#### Services Page (services.ejs)
- Services overview
- Focus areas
- Program cards with WhatsApp contact buttons

#### Gallery Page (gallery.ejs)
- Dynamic image galleries organized by event/category
- Responsive image grid layout

#### Blog Section
- Blog listing page (blog.ejs) with pagination
- Individual blog post pages (blog-post.ejs)
- Tag filtering

#### Contact Page (contact.ejs)
- Contact form with Formspree integration
- Direct email and WhatsApp links
- Response time expectations

#### Learning Programme Page (learning-programme.ejs)
- Information about learning programs
- Program benefits and features

#### Team Building Page (team-building.ejs)
- Team building services information
- Activity descriptions and benefits

### Admin Interface

The admin dashboard provides content management capabilities:

#### Login (login.ejs)
- Username/password authentication
- Recovery option

#### Dashboard (dashboard.ejs)
- Tab-based interface for different content types
- Overview of existing content
- Forms for creating new content

#### Blog Editor (edit-blog.ejs)
- Rich text editing with Quill.js
- Image embedding
- Tag management
- Featured image handling

#### Gallery Editor (edit-gallery.ejs)
- Multiple image upload
- Image preview and removal
- Gallery metadata editing

#### Password Reset (reset-password.ejs)
- Recovery code validation
- Password change form
- New recovery codes generation (new-recovery-codes.ejs)

## Main Features

### Content Management System

The CMS allows non-technical users to manage website content:

#### User Management
- Single admin user model (expandable for future needs)
- Secure authentication with password hashing
- Account recovery system

#### Content Creation Workflow
1. Login to admin dashboard at `/admin/login`
2. Select content type (gallery or blog)
3. Fill in the appropriate form with content
4. Submit to create new content
5. Content immediately appears on the public website

#### Content Editing
- Edit existing content through the dashboard
- Visual preview of changes
- Delete functionality with confirmation

#### File Management
- Image uploads for galleries and blog posts
- Automatic file storage organization
- File type validation and security

### Blog System

A comprehensive blog platform with the following features:

#### Post Management
- Create, edit, and delete blog posts
- Rich text editor with formatting options
- Image embedding within content
- Featured image support
- Excerpt creation for listings

#### Categorization
- Tag system for categorizing posts
- Many-to-many relationship between posts and tags
- Tag filtering on the public blog page

#### Publication System
- Immediate publishing upon creation/update
- SEO-friendly URLs via slugs
- Responsive design for all devices

#### Rich Content Support
- Embedded images
- Text formatting (headings, lists, emphasis, etc.)
- Links to internal and external content

### Gallery Management

A system for showcasing images organized into collections:

#### Gallery Organization
- Galleries as containers for related images
- Title and description for context
- Created date tracking

#### Image Management
- Bulk upload (up to 50 images)
- Individual image removal
- Preview functionality

#### Frontend Display
- Responsive image grid
- Hover effects for visual engagement
- Organization by gallery/event

### Website Pages

The static/semi-dynamic pages of the website include:

#### Homepage
- Image carousel highlighting activities
- Company mission statement
- Client/partner logo showcase

#### About Page
- Company history and mission
- Team member profiles with photos
- Partnering trainers section

#### Services Page
- Service categories and focus areas
- Program descriptions
- Contact buttons for inquiries

#### Contact Page
- Contact form with validation
- WhatsApp direct contact option
- Email links to team members

### Contact Form

Integrated contact system for customer inquiries:

#### Implementation
- Form integrated with Formspree service
- Client-side validation before submission
- Server-side processing and redirection

#### Formspree Configuration
- **Prototype Setup**: During development and initial prototype, a developer email is used for the Formspree integration to avoid using up the company's free quota
- **Production Setup**: For the final production version, Michelle's email (michelle@experienceenablers.com) will be configured as the recipient in Formspree
- **Implementation**: The form action URL will need to be updated once moved to production:
  ```html
  <form class="contact-form" action="https://formspree.io/f/[new-form-id]" method="POST">
  ```

#### User Experience
- Success message display after submission
- Field validation with error messages
- Mobile-responsive design

### Mobile Responsiveness

The entire website is built with responsive design principles:

#### Responsive Features
- Fluid layouts that adapt to screen size
- Mobile menu with toggle functionality
- Responsive typography and spacing
- Image scaling for different devices
- Touch-friendly interface elements

#### Breakpoints
- Desktop: 1200px and above
- Tablet: 768px to 1199px
- Mobile: Below 768px
- Small mobile: Below 480px

## Account Information and Access

### Google Account
- **Email**: experienceenablersweb@gmail.com
- **Password**: Expenb_1014
- **Purpose**: Primary account used for all web services related to the website

### GitHub Account
- **Username**: experienceenablers
- **Email**: experienceenablersweb@gmail.com
- **Password**: Expenb_1014
- **Repository**: https://github.com/experienceenablers/eeprototype.git
- **Purpose**: Version control and source code hosting for the website

### Formspree Account
- **Email**: experienceenablersweb@gmail.com
- **Password**: Expenb_1014
- **Purpose**: Handling contact form submissions
- **Note**: Currently using a development form for testing. Will be updated to use michelle@experienceenablers.com for production.

### Render Account
- **Email**: experienceenablersweb@gmail.com
- **Password**: Expenb_1014
- **Purpose**: Hosting the prototype version of the website
- **Connection**: Connected to the GitHub repository for automated deployments
- **Note**: Using free tier with limitations (see Deployment section)

### Accessing and Managing Accounts

1. **GitHub Repository**:
   - Visit https://github.com/experienceenablers/eeprototype
   - Log in with the credentials above
   - From here you can view, edit, and manage the source code

2. **Render Dashboard**:
   - Visit https://dashboard.render.com/
   - Log in with the credentials above
   - Access deployment settings, logs, and environment variables

3. **Formspree Dashboard**:
   - Visit https://formspree.io/forms
   - Log in with the credentials above
   - View form submissions and adjust form settings

All services are connected to the same Google account for simplicity.

## Installation and Setup

### Prerequisites

- Node.js (version 14.x or higher recommended)
- npm (included with Node.js)
- Git (for cloning the repository)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd experience-enablers
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the database**:
   The database is automatically initialized on first run. The system creates:
   - A default admin user (username: `admin`, password: `admin123`)
   - Two recovery codes (displayed in the console)
   - All required database tables

4. **Start the application**:
   ```bash
   node app.js
   ```

5. **Access the application**:
   - Website: `http://localhost:3000`
   - Admin dashboard: `http://localhost:3000/admin/login`

6. **Initial setup**:
   - Log in with the default credentials
   - Immediately change the default password
   - Securely store the recovery codes

## Configuration

### Environment Variables

The application supports the following environment variables:

- `PORT` - Server listening port (default: 3000)
- `NODE_ENV` - Application environment ('development' or 'production')
- `SESSION_SECRET` - Secret for session encryption (auto-generated if not provided)

### File Storage

File uploads are stored in the following directories:

- Blog images: `/public/uploads/`
- Gallery images: `/public/uploads/`

These directories are automatically created if they don't exist.

### Database Location

The SQLite database is stored in `data/cms.db`. This directory is created automatically if it doesn't exist.

## Deployment

### Development Environment

For local development:
```bash
# Start the application in development mode
node app.js

# Or using nodemon for auto-restart on file changes
nodemon app.js
```

### Prototype Deployment on Render

The prototype is currently deployed on Render using their free tier:

1. **GitHub Integration**:
   - The code is hosted in a GitHub repository under the company's GitHub account
   - Render is connected to this repository for automated deployments

2. **Render Configuration**:
   - Service Type: Web Service
   - Build Command: `npm install`
   - Start Command: `node app.js`
   - Environment Variables:
     - `NODE_ENV=production`
     - `SESSION_SECRET=[secure-random-string]`
   - Plan: Free Tier (limited to 750 hours/month)

3. **Limitations of Prototype Deployment**:
   - Free tier instances spin down after periods of inactivity
   - Limited storage space for uploads
   - No persistent storage for uploads (files will be lost on redeploys)
   - No custom domain (using render.com subdomain)

### Production Deployment Plan

For final production deployment, a Digital Ocean Droplet will be used:

1. **Digital Ocean Specifications**:
   - Basic Droplet: 1 GB RAM / 1 CPU
   - 25 GB SSD Disk
   - 1000 GB transfer
   - $6 USD/month plan
   - Ubuntu 20.04 LTS

2. **Set environment variables**:
   ```bash
   export NODE_ENV=production
   export PORT=3000  # Or your preferred port
   export SESSION_SECRET=your-strong-secret
   ```

3. **Use a process manager**:
   ```bash
   # Install PM2
   npm install -g pm2

   # Start with PM2
   pm2 start app.js --name "experience-enablers"

   # Configure PM2 to start on system boot
   pm2 startup
   pm2 save
   ```

4. **Set up a reverse proxy** (example for Nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Configure HTTPS** using Let's Encrypt or similar service.

6. **Set up regular backups** of the database file and uploaded images.

7. **Benefits of Production Deployment**:
   - 24/7 availability without spin-downs
   - Persistent storage for the database and uploads
   - Custom domain with SSL
   - Better performance compared to free tier hosting

## Security Features

The application includes several security measures:

### Authentication Security

- **Password Hashing**: All passwords are hashed using bcrypt with appropriate salt rounds
- **Recovery Codes**: Dual recovery codes for account recovery, also hashed
- **Session Security**:
  - HTTPOnly cookies to prevent JavaScript access
  - Secure cookies in production mode
  - Custom session name to avoid revealing technology stack
  - Session expiration after 24 hours

### Input Validation

- **Form Validation**: Client-side and server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries for all database operations
- **XSS Protection**: Content sanitization and proper HTML escaping

### File Upload Security

- **File Type Validation**: Only specific image formats allowed (JPEG, JPG, PNG, GIF)
- **File Size Limits**: 50MB maximum file size
- **Filename Randomization**: Using UUID for filenames to prevent path traversal
- **Extension Validation**: Both MIME type and file extension are checked

### General Security

- **CSRF Protection**: Using proper methods for form submissions
- **Error Handling**: Custom error pages without stack traces in production
- **Secure Headers**: When deployed with proper proxy configuration

## File Handling

The application manages file uploads using Multer:

### Upload Configuration

```javascript
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
```

### File Upload Routes

- **Gallery Images**: `/admin/add-gallery` (multiple files)
- **Blog Featured Image**: `/admin/add-blog` (single file)
- **Blog Content Images**: `/admin/upload-inline-image` (single file, from rich text editor)

### File Deletion

When content is deleted, associated files are removed from the filesystem:

```javascript
// Example from gallery deletion
images.forEach(image => {
    const filePath = path.join(__dirname, 'public', 'uploads', image.filename);
    try {
        fs.unlinkSync(filePath);
    } catch (err) {
        // Handle error
    }
});
```

## SEO Optimization

The website includes several SEO features:

### Meta Tags

Each page includes appropriate meta tags:

```html
<meta name="description" content="Page-specific description">
<meta name="keywords" content="relevant, keywords, here">
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Page description for social sharing">
<meta property="og:image" content="/path/to/image.jpg">
<meta property="og:url" content="https://domain.com/page">
<meta property="og:type" content="website|article">
```

### URL Structure

- SEO-friendly URLs (e.g., `/blog/post-title` instead of `/blog?id=123`)
- Proper use of slugs derived from titles
- Consistent URL structure throughout the site

### Content Organization

- Proper use of heading hierarchy (H1, H2, H3, etc.)
- Descriptive alt text for images
- Structured content with semantic HTML

### Performance Optimization

- Responsive images
- Efficient CSS loading
- Minimal JavaScript

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Database Backup**:
   ```bash
   # Create a backup of the database
   cp data/cms.db data/cms.db.backup-$(date +%Y%m%d)
   ```

2. **Check Disk Space**:
   ```bash
   # Check available disk space
   df -h
   ```

3. **Monitor Error Logs**:
   ```bash
   # If using PM2
   pm2 logs experience-enablers
   ```

### Updating the Application

1. **Pull the latest code**:
   ```bash
   git pull origin main
   ```

2. **Install any new dependencies**:
   ```bash
   npm install
   ```

3. **Restart the application**:
   ```bash
   # If using PM2
   pm2 restart experience-enablers
   # If running directly
   node app.js
   ```

### Content Maintenance

- Regularly review and update blog content for relevance
- Check all links periodically for broken links
- Update team information as needed
- Refresh gallery images to showcase recent events

## Backup and Recovery

### Database Backup

Regular database backups are essential:

```bash
# Create a backup directory if it doesn't exist
mkdir -p backups

# Backup the database
cp data/cms.db backups/cms.db.backup-$(date +%Y%m%d)

# Optionally compress the backup
gzip backups/cms.db.backup-$(date +%Y%m%d)
```

### File Backup

Back up uploaded files regularly:

```bash
# Backup uploaded files
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz public/uploads/
```

### Recovery Process

To restore from backup:

```bash
# Stop the application
pm2 stop experience-enablers

# Restore database
cp backups/cms.db.backup-YYYYMMDD data/cms.db

# Restore files (if needed)
tar -xzf backups/uploads-YYYYMMDD.tar.gz -C /

# Restart the application
pm2 start experience-enablers
```

## Troubleshooting

### Common Issues

#### Database Issues

**Symptom**: Error when accessing database or "Database locked" errors.
**Solution**: 
- Check if the database file exists and is accessible
- Ensure no other process is locking the database
- If corrupted, restore from backup

#### File Upload Issues

**Symptom**: Unable to upload files or "Error: Images only!" message.
**Solution**:
- Verify the file type is supported (JPEG, JPG, PNG, GIF)
- Check if the file size is under the 50MB limit
- Ensure the uploads directory is writable by the application

#### Authentication Issues

**Symptom**: Unable to log in to admin dashboard.
**Solution**:
- Try using a recovery code if you've forgotten the password
- Check if the session is being stored properly
- Clear browser cookies and try again

#### Server Issues

**Symptom**: Application crashes or fails to start.
**Solution**:
- Check error logs for specific error messages
- Verify all dependencies are installed
- Ensure required directories exist and are writable
- Check if the port is already in use

### Debugging

For better debugging:

```javascript
// Add detailed logging
console.error('Error details:', error);

// Check session state
app.get('/debug-session', isAuthenticated, (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        isAuthenticated: req.session?.isAuthenticated,
        cookies: req.cookies
    });
});
```

## Third-Party Integrations

The application integrates with several external services:

### Formspree

- **Purpose**: Handle contact form submissions
- **Integration Point**: `contact.ejs`
- **Configuration**: Form action set to `https://formspree.io/f/mblgopqe`

### Social Media

- **LinkedIn**: Company profile linked in footer
- **Instagram**: Company profile linked in footer
- **Integration Points**: `footer.ejs`

### WhatsApp

- **Purpose**: Direct contact method
- **Integration Points**: `contact.ejs`, `services.ejs`
- **Implementation**: WhatsApp Web API links with pre-filled messages

### FontAwesome

- **Purpose**: Icon library
- **Integration Point**: Loaded via CDN in template files
- **Usage**: Various UI elements throughout the application