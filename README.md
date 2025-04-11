# Experience Enablers Website & CMS

A website with integrated Content Management System for Experience Enablers.

## 📋 Overview

This project is a full-stack web application that serves two core purposes:

1. **Public-Facing Corporate Website** - A professional, responsive website showcasing the company's leadership development and team-building services, featuring blog content, image galleries, team member profiles, and contact information.

2. **Content Management System (CMS)** - A secure, user-friendly admin interface that empowers non-technical staff to manage website content independently, including blog posts, image galleries, and media.

The application is built on Node.js with Express.js and uses EJS templating for dynamic content rendering. Data is stored in a SQLite database for simplicity and portability.

## 🌟 Key Features

### Public Website
- **Responsive Design** - Fully responsive layouts optimized for all device sizes
- **Service Showcase** - Dedicated pages for learning programs and team-building services
- **Team Profiles** - About page with team member and partner trainer profiles
- **Blog System** - Full-featured blog with pagination, tags, and rich content
- **Image Galleries** - Organized galleries showcasing training events and activities
- **Contact System** - Integrated contact form with Formspree and direct WhatsApp options
- **SEO Optimized** - Proper meta tags, semantic HTML, and structured content
- **Client Showcase** - Display of partner logos and client companies

### Content Management System
- **Secure Admin Dashboard** - Protected interface for content management
- **Blog Post Management** - Create, edit, and delete blog posts with rich content
- **Gallery Management** - Organize photos into galleries with batch uploading
- **Rich Text Editing** - Quill.js integration for WYSIWYG content creation
- **Image Management** - Upload, organize, and embed images throughout the site
- **Tagging System** - Categorize blog posts with custom tags
- **Account Recovery** - Dual recovery code system for admin account access

### Technical Features
- **MVC Architecture** - Organized codebase with separation of concerns
- **Database Integration** - SQLite database for simple, zero-configuration data storage
- **Security Features** - Password hashing, session protection, input validation
- **File Management** - Secure file upload handling with validation and organization
- **Responsive Framework** - Custom CSS with mobile-first approach and breakpoints
- **Markdown Support** - Rich content capabilities for blog posts

## 🔧 Installation and Setup

### Prerequisites
- Node.js (v14.x or higher)
- npm (included with Node.js)
- Git (for cloning the repository)

### Quick Start
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd experience-enablers
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   node app.js
   ```

4. **Access the website**
   - Public website: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin/login

### First-Time Setup
On first run, the application automatically:
- Creates a SQLite database in the `data` directory
- Sets up all required database tables
- Creates a default admin account:
  - Username: `admin`
  - Password: `admin123`
- Generates two recovery codes (displayed in console)

**IMPORTANT**: Note down the recovery codes and change the default password immediately!

## 🔐 Admin Access and Content Management

### Login Process
1. Navigate to http://localhost:3000/admin/login
2. Enter admin credentials
3. Access the dashboard with content management tabs

### Managing Blog Posts
1. Select the "Blog" tab in the dashboard
2. Use the form to create new posts with:
   - Title, content (rich text editor), excerpt
   - Tags (comma-separated)
   - Featured image upload
3. View, edit, or delete existing posts in the list below

### Managing Galleries
1. Select the "Gallery" tab in the dashboard
2. Create galleries with:
   - Title and description
   - Multiple image uploads (up to 50 images)
3. View, edit, or delete existing galleries in the list below

### Account Recovery
If password is lost:
1. Click "Use Recovery Code" on the login page
2. Enter one of the previously generated recovery codes
3. Set a new password
4. Note down the newly generated recovery codes

## ⚙️ Configuration

### Environment Variables
The application supports these environment variables:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment setting ('development' or 'production')
- `SESSION_SECRET` - Session encryption key (auto-generated if not set)

### Directory Structure
```
/
├── app.js                  # Main application file
├── database.js             # Database configuration
├── public/                 # Static files
│   ├── uploads/            # User uploaded files
│   ├── images/             # Static images
│   └── style.css           # Main stylesheet
├── views/                  # EJS templates
│   ├── admin/              # Admin dashboard templates
│   ├── partials/           # Reusable template components
│   └── *.ejs               # Page templates
├── data/                   # Database storage
└── package.json            # Project metadata and dependencies
```

## 🚀 Deployment

### Development Environment
```bash
# Start in development mode
node app.js

# Or with nodemon for auto-restart
nodemon app.js
```

### Current Prototype Deployment (Render)
The prototype version is currently deployed on Render's free tier:

1. **GitHub Setup**
   - Company GitHub account hosts the repository
   - Connected to Render for automated deployments

2. **Render Configuration**
   ```
   Build Command: npm install
   Start Command: node app.js
   Environment Variables:
     - NODE_ENV=production
     - SESSION_SECRET=[secure random string]
   ```

3. **Limitations**
   - Free tier has limited uptime (750 hours/month)
   - Instances spin down after inactivity periods
   - Uploaded files aren't persistent across deployments
   - Using Render subdomain instead of custom domain

### Planned Production Deployment (Digital Ocean)
The final production environment will use a Digital Ocean Droplet:

1. **Server Specifications**
   - Basic Droplet: 1 GB RAM / 1 CPU
   - 25 GB SSD Disk
   - 1000 GB transfer
   - $6 USD/month plan
   - Ubuntu 20.04 LTS

2. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export PORT=3000  # Or your preferred port
   export SESSION_SECRET=your-strong-secret
   ```

3. **Process Management with PM2**
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start application with PM2
   pm2 start app.js --name "experience-enablers"
   
   # Configure PM2 to start on system boot
   pm2 startup
   pm2 save
   ```

4. **Reverse Proxy Setup (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
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

5. **SSL Configuration with Let's Encrypt**
   ```bash
   # Install Certbot
   apt-get install certbot python3-certbot-nginx
   
   # Obtain and configure SSL certificate
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

### Formspree Contact Form Configuration
- **Current Setup**: Using developer email for testing to preserve company's free quota
- **Production Setup**: Will be updated to use michelle@experienceenablers.com
- Form endpoint will need to be updated in contact.ejs before final deployment

## 💾 Database and Backups

### Database Structure
The SQLite database (`data/cms.db`) includes these key tables:
- `admin` - Admin user credentials
- `galleries` - Gallery collections metadata
- `gallery_images` - Individual gallery images
- `blog_posts` - Blog content and metadata
- `blog_tags` - Blog categorization tags
- `post_tags` - Relationship mapping between posts and tags

### Backup Procedures
Regular backups are essential:

```bash
# Create backups directory
mkdir -p backups

# Database backup
cp data/cms.db backups/cms-$(date +%Y%m%d).db

# Uploaded files backup
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz public/uploads/
```

### Restore Process
```bash
# Restore database
cp backups/cms-YYYYMMDD.db data/cms.db

# Restore uploads
tar -xzf backups/uploads-YYYYMMDD.tar.gz -C /path/to/site/public/
```

## 🔒 Security Considerations

### Admin Account
- Change the default password immediately after installation
- Store recovery codes securely in a password manager
- Periodically update admin password

### Server Security
- Always use HTTPS in production (via Nginx + Let's Encrypt)
- Keep Node.js and npm packages updated
- Apply security headers via Nginx configuration
- Enable firewall rules limiting access to necessary ports

### Content Security
- Verify that uploaded images don't contain malicious content
- Be cautious with embedded content in blog posts
- Regularly review and update plugins and dependencies

## 🛠️ Maintenance Tasks

### Regular Maintenance
1. **System Updates**
   ```bash
   # Update application code
   git pull origin main
   npm install
   
   # Restart application
   pm2 restart experience-enablers
   ```

2. **Database Maintenance**
   - Run periodic backups (daily/weekly)
   - Check database size and performance
   - Consider cleaning up old/unused images

3. **Content Audit**
   - Review and update outdated content
   - Check for broken links or missing images
   - Update team information as needed

### Monitoring
```bash
# Check application status
pm2 status

# View application logs
pm2 logs experience-enablers

# Monitor server resources
htop
```

## 🔍 Troubleshooting

### Common Issues

1. **Login Problems**
   - Clear browser cookies
   - Try password recovery with recovery codes
   - Check database connectivity

2. **Upload Issues**
   - Verify proper permissions on uploads directory
   - Check file size limits (configured to 50MB max)
   - Ensure supported file types (JPEG, PNG, GIF)

3. **Database Errors**
   - Check if database file exists and is not corrupted
   - Verify database is not locked by another process
   - Restore from backup if necessary

4. **Server Connectivity**
   - Confirm server is running (`pm2 status`)
   - Check firewall settings
   - Verify domain DNS configuration

### Debug Mode
To get more detailed error information:
```bash
# Start with debug output
DEBUG=* node app.js
```

## 📚 Resources

### Documentation
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [EJS Templates](https://ejs.co/#docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
