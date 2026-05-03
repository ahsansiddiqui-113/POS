# 🚀 POS System - Build EXE Installer Guide

## ✅ Configuration Status

All configuration issues have been fixed on the main branch:
- ✓ Output paths unified
- ✓ .env configured for production
- ✓ electron-builder.json paths updated
- ✓ tsconfig files corrected
- ✓ Assets folder created with placeholder icon
- ✓ Dependencies installing...

---

## 📋 Quick Start - Build EXE

### Step 1: Install Dependencies
```bash
npm install
```
*(Currently running in background)*

### Step 2: Build Everything
```bash
npm run build
```

This compiles:
- React frontend → `build/`
- Node.js backend → `dist/backend/`
- Electron main process → `build/main/`

### Step 3: Create the Installer
```bash
npm run dist
```

**Result:** Windows installer created at `release/POS System Setup 1.0.0.exe`

### Step 4: Test the Installer
```bash
# Run the installer
.\release\POS System Setup 1.0.0.exe
```

---

## 🔧 What Was Fixed

### Issue 1: Output Path Mismatch
**Before:**
```
tsconfig.electron.json → ./build (wrong)
tsconfig.backend.json → ./dist/backend
react-scripts → ./build
```

**After:**
```
tsconfig.electron.json → ./build/main ✓
tsconfig.backend.json → ./dist/backend ✓
react-scripts → ./build ✓
```

### Issue 2: Missing Assets
- Created `assets/` folder
- Added placeholder `icon.png`
- **TODO:** Replace with your app icon (256x256+ PNG)

### Issue 3: electron-builder.json
- Updated file patterns to include `build/**/*`
- Added proper exclusions for node_modules

### Issue 4: Production Configuration
- Updated `.env` with `NODE_ENV=production`
- Backend will run on port 3001
- Database stored at: `C:\Users\<username>\AppData\Local\POSApp\pos.db`

---

## 📁 Build Output Structure

```
project/
├── build/                           # React + Electron compiled
│   ├── index.html                  # React app
│   ├── static/                     # React assets
│   └── main/                       # Electron process
│       ├── electron.js
│       ├── preload.js
│       └── ...
├── dist/                           # Backend compiled
│   └── backend/
│       ├── index.js
│       ├── database/
│       ├── middleware/
│       ├── services/
│       └── ...
├── release/                        # Final installer
│   ├── POS System Setup 1.0.0.exe
│   └── POS System 1.0.0.exe        # Portable version
└── node_modules/
```

---

## 🎯 Installer Features

✅ **Installation Options**
- Custom installation directory
- Start Menu shortcuts
- Desktop shortcuts
- Add/Remove Programs support
- Silent install support

✅ **Application Features**
- Auto-start backend server
- Auto-load React frontend
- SQLite database (per-user)
- Express API on port 3001
- React UI on embedded browser window

---

## ⚙️ Pre-Build Checklist

### Before Building:
- [x] .env file created and configured
- [x] assets/ folder created
- [x] tsconfig files fixed
- [x] electron-builder.json updated
- [ ] npm install completed (wait for background task)
- [ ] Review/replace icon (optional but recommended)
- [ ] Verify JWT_SECRET in .env

### Build Process:
- [ ] Run `npm run build`
- [ ] Run `npm run dist`
- [ ] Verify `release/` folder contains .exe files
- [ ] Test installer on clean Windows machine

---

## 🔐 Security & Production Notes

### Before Distributing:

1. **Change JWT Secret**
   ```bash
   # Generate new secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Update .env
   JWT_SECRET=<your-new-secret>
   ```

2. **Replace Icon**
   - Replace `assets/icon.png` with your 256x256+ PNG
   - Recommended: Use an actual app icon, not placeholder

3. **Update Version Number**
   ```json
   // In package.json
   "version": "1.0.0"  // Change this for new releases
   ```

4. **Code Signing (Optional but Recommended)**
   ```json
   // In electron-builder.json
   "certificateFile": "path/to/certificate.pfx",
   "certificatePassword": "password"
   ```

5. **Remove Dev Tools in Production**
   - Already disabled in production build
   - Dev tools only open with F12 in development mode

---

## 🧪 Testing Checklist

### After Building:

1. **File Structure Check**
   ```bash
   ls -la release/
   # Should contain:
   # - POS System Setup 1.0.0.exe
   # - POS System 1.0.0.exe (portable)
   ```

2. **Run Installer**
   - Start fresh Windows user (if possible)
   - Run installer in default location
   - Install to custom directory
   - Verify shortcuts created

3. **Test Application**
   - App launches without errors
   - Backend starts (port 3001)
   - React UI loads properly
   - All menu items work
   - Database initializes
   - POS operations work (sales, inventory, etc.)

4. **Test Uninstall**
   - Uninstall via Add/Remove Programs
   - Verify files deleted
   - Verify shortcuts removed
   - Data persists if re-installed (AppData folder)

---

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Icon not showing
- Replace `assets/icon.png` with a valid PNG file
- Recommended size: 256x256 or larger
- Re-run build

### Issue: Port 3001 already in use
- Change `PORT=3001` in `.env` to another port
- Update `REACT_APP_BACKEND_URL` to match
- Rebuild

### Issue: Database permission errors
- Ensure AppData folder is writable: `C:\Users\<username>\AppData\Local\POSApp`
- Check Windows permissions on that folder

### Issue: Installer won't run
- Ensure Windows 7+ (Electron 25 requirement)
- Try running as Administrator
- Check antivirus isn't blocking

---

## 📦 Distribution

### Files to Distribute:
- ✅ `release/POS System Setup 1.0.0.exe` (Installer)
- ✅ `release/POS System 1.0.0.exe` (Portable - optional)

### Files NOT to Include:
- ❌ source code
- ❌ .env file (users set their own secrets)
- ❌ node_modules
- ❌ build/ and dist/ directories

---

## 🔄 Updating & Versioning

### For Each Release:

1. **Update version in package.json**
   ```json
   "version": "1.1.0"
   ```

2. **Update changelog** (optional)

3. **Rebuild**
   ```bash
   npm run build
   npm run dist
   ```

4. **Test**
   - Install on clean machine
   - Test key features
   - Verify uninstall/reinstall

---

## 📞 Support Resources

- **Electron Documentation:** https://www.electronjs.org/docs
- **electron-builder:** https://www.electron.build/
- **React Scripts:** https://create-react-app.dev/

---

## 🎯 Next Steps

1. **Wait for `npm install` to complete**
2. Run `npm run build`
3. Run `npm run dist`
4. Test the installer: `.\release\POS System Setup 1.0.0.exe`
5. Distribute the EXE file

---

**Status:** Ready for build
**Last Updated:** 2026-05-03
**Branch:** main
