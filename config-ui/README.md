# 🚀 Jira MCP Configuration UI

A comprehensive web-based configuration tool for setting up your Jira MCP server environment variables with a beautiful, user-friendly interface.

## ✨ Features

### 🎨 **Beautiful UI**
- Modern React.js interface with Tailwind CSS
- Responsive design that works on all devices
- Professional Jira-themed styling
- Real-time validation feedback

### 🔧 **Smart Configuration**
- **Form validation** with helpful error messages
- **Connection testing** before saving configuration
- **Existing configuration loading** with masked API tokens
- **Auto-completion** suggestions for common fields

### 🛡️ **Security & Reliability**
- **API token masking** for security
- **Zod validation** on both frontend and backend
- **Connection verification** before saving
- **Error handling** with detailed messages

### 💾 **File Management**
- Saves configuration to `~/.jira-mcp.env` (cross-platform)
- Loads existing configurations
- Provides clear file path information

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 16+ installed on your system
- npm or yarn package manager

### **1. Install Dependencies**

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### **2. Start the Application**

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
```
Server will start on `http://localhost:5000`

**Terminal 2 - Frontend Application:**
```bash
cd frontend
npm start
```
UI will open at `http://localhost:3000`

### **3. Configure Your Jira Connection**

1. **Open** `http://localhost:3000` in your browser
2. **Fill in** your Jira details:
   - **Jira URL**: `https://your-company.atlassian.net`
   - **Username**: Your email address
   - **API Token**: [Generate from Atlassian](https://id.atlassian.com/manage-profile/security/api-tokens)
   - **Project Key**: Optional default project (e.g., `PROJ`)

3. **Test Connection** to verify your credentials
4. **Save Configuration** when the test passes

---

## 🔧 **API Endpoints**

### **Backend API Routes**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/test-connection` | Test Jira connection with provided credentials |
| `POST` | `/api/save-config` | Save configuration to `.env` file |
| `GET` | `/api/load-config` | Load existing configuration (API token masked) |
| `GET` | `/api/health` | Health check endpoint |

### **Request/Response Examples**

**Test Connection:**
```bash
curl -X POST http://localhost:5000/api/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "jiraUrl": "https://company.atlassian.net",
    "username": "user@company.com", 
    "apiToken": "your-api-token",
    "projectKey": "PROJ"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to Jira as John Doe",
  "userInfo": {
    "displayName": "John Doe",
    "emailAddress": "user@company.com",
    "accountId": "abc123"
  }
}
```

---

## 📁 **Project Structure**

```
config-ui/
├── backend/                 # Express.js backend server
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # React.js frontend application
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── index.js        # React entry point
│   │   └── index.css       # Tailwind CSS styles
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── package.json        # Frontend dependencies
│   └── tailwind.config.js  # Tailwind configuration
└── README.md               # This file
```

---

## 🛠️ **Development**

### **Backend Development**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### **Frontend Development**
```bash
cd frontend
npm start    # Hot reload development server
```

### **Production Build**
```bash
cd frontend
npm run build  # Creates optimized production build
```

---

## 🔒 **Security Features**

### **API Token Security**
- Tokens are **never logged** or displayed in full
- Existing tokens are **masked** when loading configuration
- **HTTPS recommended** for production deployments

### **Input Validation**
- **Zod schemas** validate all inputs server-side
- **Real-time validation** on the frontend
- **SQL injection protection** through parameterized queries

### **Error Handling**
- **Detailed error messages** for debugging
- **User-friendly messages** for common issues
- **Graceful handling** of network timeouts

---

## 🚀 **Production Deployment**

### **Option 1: Same Server**
```bash
# Build frontend
cd frontend && npm run build

# Serve frontend from backend
# Add to server.js:
app.use(express.static(path.join(__dirname, '../frontend/build')));
```

### **Option 2: Separate Servers**
- Deploy backend to your server (port 5000)
- Deploy frontend build to web server or CDN
- Update frontend API calls to point to your backend URL

### **Environment Variables**
```bash
# Backend .env
PORT=5000
NODE_ENV=production
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**Connection Failed:**
- ✅ Check Jira URL format (`https://company.atlassian.net`)
- ✅ Verify API token is correct
- ✅ Ensure username is your email address
- ✅ Check network connectivity

**CORS Issues:**
- ✅ Backend includes CORS middleware
- ✅ Frontend proxy configured in `package.json`
- ✅ For production, configure CORS origins properly

**File Permissions:**
- ✅ Ensure write permissions to home directory
- ✅ Check if `.jira-mcp.env` file exists and is readable

### **Debug Mode**
Set environment variable for detailed logging:
```bash
DEBUG=true npm run dev
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

MIT License - see parent project license for details.

---

## 🎯 **Next Steps**

After configuration:
1. **Test your MCP server** with the new configuration
2. **Update Claude Desktop** config to use your MCP server
3. **Start using** Jira tools through Claude!

**Happy configuring! 🚀**