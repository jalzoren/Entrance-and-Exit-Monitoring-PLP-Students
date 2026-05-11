# Entrance and Exit Monitoring PLP Students

*An Integrated Smart Entrance, Exit, and Attendance Monitoring System with Data Analytics for Institutional Decision Support at Pamantasan ng Lungsod ng Pasig*

---

## Project Overview

This project aims to design and develop a *secure desktop-based smart entrance and exit monitoring system* that records student attendance using multi-modal authentication and provides *analytical insights* to support administrative decision-making at Pamantasan ng Lungsod ng Pasig (PLP).

The system enhances campus security, automates attendance tracking, and supports data-driven administrative decisions.

---

## Project Objectives

*General Objective:*
- Develop a secure system to monitor student entrance and exit while providing analytics for institutional decision-making.

*Specific Objectives:*
1. Record student entrance and exit logs in real-time.
2. Enhance campus security through verified identity authentication.
3. Automatically track student attendance using digital identification methods.
4. Store and manage attendance data in a *centralized and secure database*.
5. Generate *daily, monthly, and yearly analytical reports*.
6. Support data-driven administrative decisions via dashboards and trend analysis.

---

## System Functionality

### User Roles

*Administrator*
- Manage student records.
- View and export attendance logs.
- Access analytics dashboard.
- Manage system configurations.
- View authentication logs.

*Student*
(no direct interface)
- Authenticate identity using:
  - Face recognition (Primary)
  - Student ID typing (Primary)
  - QR Code scanning (Optional)
  - Voice input (Optional)

---

### Functional Requirements

*Student Authentication*
- Facial recognition.
- Manual ID input.
- Determines Time-In or Time-Out automatically.
- Rejects invalid or duplicate authentication attempts.
- Records:
  - Student ID
  - Student Name (Last, First, M.I.)
  - Timestamp (DD/MM/YYYY)
  - Entry or Exit
  - Authentication Method (Facial Recognition, Manual Input)

*Admin Functions*
- View attendance logs.
- Filter logs by:
  - Date range
  - Student
  - Department (optional)
- Export reports (CSV / PDF)
- View analytics dashboard.
- View authentication attempts (success/failure).

---

## Unique & Innovative Features

1. *Multi-Modal Student Authentication*
   - Facial Recognition
   - Manual Student ID Entry (Keyboard)
   - QR Code Recognition (Optional)
   - Voice Input (Optional)
2. *Automated Real-Time Entry and Exit Tracking*
3. *Built-in Data Analytics* for institutional decision support
4. *Security-Driven Design*
   - Logs all authentication attempts (successful or failed)
   - Maintains immutable entry and exit records
   - Supports audit trails for investigations or compliance reviews

*Future Enhancements*
- Monitoring of guest and visitors.

---

## System Design & Implementation

*Frontend:*  
- React (Vite) with JSX for UI  
- Electron.js for Desktop Application  

*Backend:*  
- Python + Node.js  

*Database:*  
- MySQL

*Wireframe/Prototype:*  
- To be developed (visual representation of UI and dashboards).

---

## Scope and Limitations

*Scope*
- Only for enrolled PLP students.
- Desktop-based application.
- Records:
  - Time-In and Time-Out
  - Method of Authentication (Facial Recognition, Manual Input, QR Code)
  - Timestamp (DD/MM/YYYY)
- Includes admin dashboard and analytics.
- Uses biometric (facial recognition) and non-biometric authentication methods.

*Limitations*
- Requires a camera and keyboard.
- Facial recognition accuracy depends on lighting and camera quality.

---

## Contributors

- *[MIAH](https://github.com/jerimiahbitancor)* – Project Lead & UI Designer 
- *[JAL](https://github.com/jalzoren)* – Frontend Developer & UI Designer 
- *[KAIZEN](https://github.com/ka1zen3)* – Backend & Data Analytics Specialisy
- *[LYNN](https://github.com/LynnCzyla)* – Backend & Database Developer  
- *[NEIL](https://github.com/mortred-crtcl))* – Frontend Developer  


---
```
Entrance-and-Exit-Monitoring-PLP-Students
├─ backend
│  ├─ .env
│  ├─ eems.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ addUser.js
│  │  ├─ analytics.js
│  │  ├─ forgotPassword.js
│  │  ├─ importStudents.js
│  │  ├─ login.js
│  │  ├─ manualEntry.js
│  │  ├─ programs.js
│  │  ├─ qrScan.js
│  │  ├─ recognize.js
│  │  ├─ registration.js
│  │  ├─ systemSettings.js
│  │  ├─ visitor-exit.js
│  │  └─ visitor.js
│  ├─ server.js
│  └─ src
│     ├─ app.js
│     ├─ db.js
│     ├─ time.js
│     └─ utils.js
├─ files.txt
├─ IMPLEMENTATION_CHECKLIST.md
├─ IMPLEMENTATION_SNIPPETS.md
├─ plp-student-monitoring
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ main.cjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ logo.png
│  │  ├─ logo3.png
│  │  ├─ logoplp.gif
│  │  ├─ pasig.png
│  │  ├─ pasig_agos.png
│  │  ├─ visitor-config.xml
│  │  └─ vite.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ ADMIN_DASHBOARD.png
│  │  │  ├─ background.png
│  │  │  ├─ DASHBOARD_BG.png
│  │  │  ├─ facerecogbg.png
│  │  │  ├─ llogoplp.png
│  │  │  ├─ logo.png
│  │  │  ├─ logo2.png
│  │  │  ├─ MAIN.png
│  │  │  ├─ react.svg
│  │  │  ├─ school.jpg
│  │  │  └─ try.png
│  │  ├─ components
│  │  │  ├─ AddUser.jsx
│  │  │  ├─ EditStudent.jsx
│  │  │  ├─ EditUser.jsx
│  │  │  ├─ FaceScan.jsx
│  │  │  ├─ GenerateReportFilter.jsx
│  │  │  ├─ GenerateReportPdf.css
│  │  │  ├─ GenerateReportPdf.jsx
│  │  │  ├─ ImportStudents.jsx
│  │  │  ├─ ManualInputModal.jsx
│  │  │  ├─ ProtectedRoute.jsx
│  │  │  ├─ QRScanModal.jsx
│  │  │  ├─ RegisterStudent.jsx
│  │  │  ├─ RegisterStudentCam.jsx
│  │  │  ├─ SettingsDisplay.jsx
│  │  │  ├─ ShowEntryExitAlerts.jsx
│  │  │  └─ VisitorModal.jsx
│  │  ├─ componentscss
│  │  │  ├─ AddUser.css
│  │  │  ├─ DashboardLayout.css
│  │  │  ├─ EditStudent.css
│  │  │  ├─ FaceScan.css
│  │  │  ├─ GenerateReportFilter.css
│  │  │  ├─ GenerateReportPdf.css
│  │  │  ├─ ImportStudents.css
│  │  │  ├─ ManualInputModal.css
│  │  │  ├─ QRScanModal.css
│  │  │  ├─ RegisterStudent.css
│  │  │  ├─ RegisterStudentCam.css
│  │  │  ├─ Sidebar.css
│  │  │  └─ VisitorModal.css
│  │  ├─ context
│  │  │  ├─ AuthContext.jsx
│  │  │  ├─ CameraContext.jsx
│  │  │  └─ LogContext.jsx
│  │  ├─ css
│  │  │  ├─ Analytics.css
│  │  │  ├─ Dashboard.css
│  │  │  ├─ FaceRecognition.css
│  │  │  ├─ ForgotPass.css
│  │  │  ├─ GeneralSettings.css
│  │  │  ├─ GlobalModal.css
│  │  │  ├─ LandingPage.css
│  │  │  ├─ Login.css
│  │  │  ├─ Monitor.css
│  │  │  ├─ RealTimeMonitor.css
│  │  │  ├─ Records.css
│  │  │  ├─ SettingsDisplay.css
│  │  │  ├─ Students.css
│  │  │  ├─ SystemSettings.css
│  │  │  └─ Users.css
│  │  ├─ index.css
│  │  ├─ layouts
│  │  │  ├─ DashboardLayout.jsx
│  │  │  └─ Sidebar.jsx
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ About.jsx
│  │  │  ├─ adminpages
│  │  │  │  ├─ Analytics.jsx
│  │  │  │  ├─ Dashboard.jsx
│  │  │  │  ├─ Monitor.jsx
│  │  │  │  ├─ Records.jsx
│  │  │  │  └─ Students.jsx
│  │  │  ├─ EntranceFaceRecognition.jsx
│  │  │  ├─ ExitFaceRecognition.jsx
│  │  │  ├─ FaceRecognition.jsx
│  │  │  ├─ ForgotPass.jsx
│  │  │  ├─ ForgotPass2.jsx
│  │  │  ├─ LandingPage.jsx
│  │  │  ├─ Login.jsx
│  │  │  └─ superadminpages
│  │  │     ├─ SuperDashboard.jsx
│  │  │     ├─ SuperStudents.jsx
│  │  │     ├─ SystemSettings
│  │  │     │  ├─ AcademicYearSettings.jsx
│  │  │     │  ├─ AddDepartmentModal.jsx
│  │  │     │  ├─ AddProgramModal.jsx
│  │  │     │  ├─ ArchivedDepartments.jsx
│  │  │     │  ├─ ArchivedPrograms.jsx
│  │  │     │  ├─ ArchivedStudents.jsx
│  │  │     │  ├─ ArchivedUsers.jsx
│  │  │     │  ├─ DepartmentSelect.jsx
│  │  │     │  ├─ DepartmentsTab.jsx
│  │  │     │  ├─ EditProgramModal.jsx
│  │  │     │  ├─ EditProgramTab.jsx
│  │  │     │  ├─ GateSettings.jsx
│  │  │     │  ├─ GeneralSettings.jsx
│  │  │     │  └─ SystemSettings.jsx
│  │  │     └─ Users.jsx
│  │  └─ utils
│  │     ├─ eems-report.xslt
│  │     ├─ pdfGenerator.js
│  │     ├─ timeUtils.js
│  │     ├─ xmlParser.js
│  │     ├─ xmlReportUtils.js
│  │     └─ xmlUtils.js
│  └─ vite.config.js
├─ python
│  ├─ face_service.py
│  ├─ known_faces
│  ├─ models
│  ├─ myenv
│  │  ├─ Lib
│  │  │  └─ site-packages
│  │  │     ├─ distutils-precedence.pth
│  │  │     ├─ pip
│  │  │     │  ├─ py.typed
│  │  │     │  ├─ _internal
│  │  │     │  │  ├─ build_env.py
│  │  │     │  │  ├─ cache.py
│  │  │     │  │  ├─ cli
│  │  │     │  │  │  ├─ autocompletion.py
│  │  │     │  │  │  ├─ base_command.py
│  │  │     │  │  │  ├─ cmdoptions.py
│  │  │     │  │  │  ├─ command_context.py
│  │  │     │  │  │  ├─ main.py
│  │  │     │  │  │  ├─ main_parser.py
│  │  │     │  │  │  ├─ parser.py
│  │  │     │  │  │  ├─ progress_bars.py
│  │  │     │  │  │  ├─ req_command.py
│  │  │     │  │  │  ├─ spinners.py
│  │  │     │  │  │  ├─ status_codes.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ commands
│  │  │     │  │  │  ├─ cache.py
│  │  │     │  │  │  ├─ check.py
│  │  │     │  │  │  ├─ completion.py
│  │  │     │  │  │  ├─ configuration.py
│  │  │     │  │  │  ├─ debug.py
│  │  │     │  │  │  ├─ download.py
│  │  │     │  │  │  ├─ freeze.py
│  │  │     │  │  │  ├─ hash.py
│  │  │     │  │  │  ├─ help.py
│  │  │     │  │  │  ├─ index.py
│  │  │     │  │  │  ├─ install.py
│  │  │     │  │  │  ├─ list.py
│  │  │     │  │  │  ├─ search.py
│  │  │     │  │  │  ├─ show.py
│  │  │     │  │  │  ├─ uninstall.py
│  │  │     │  │  │  ├─ wheel.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ configuration.py
│  │  │     │  │  ├─ distributions
│  │  │     │  │  │  ├─ base.py
│  │  │     │  │  │  ├─ installed.py
│  │  │     │  │  │  ├─ sdist.py
│  │  │     │  │  │  ├─ wheel.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ exceptions.py
│  │  │     │  │  ├─ index
│  │  │     │  │  │  ├─ collector.py
│  │  │     │  │  │  ├─ package_finder.py
│  │  │     │  │  │  ├─ sources.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ locations
│  │  │     │  │  │  ├─ base.py
│  │  │     │  │  │  ├─ _distutils.py
│  │  │     │  │  │  ├─ _sysconfig.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ main.py
│  │  │     │  │  ├─ metadata
│  │  │     │  │  │  ├─ base.py
│  │  │     │  │  │  ├─ pkg_resources.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ models
│  │  │     │  │  │  ├─ candidate.py
│  │  │     │  │  │  ├─ direct_url.py
│  │  │     │  │  │  ├─ format_control.py
│  │  │     │  │  │  ├─ index.py
│  │  │     │  │  │  ├─ link.py
│  │  │     │  │  │  ├─ scheme.py
│  │  │     │  │  │  ├─ search_scope.py
│  │  │     │  │  │  ├─ selection_prefs.py
│  │  │     │  │  │  ├─ target_python.py
│  │  │     │  │  │  ├─ wheel.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ network
│  │  │     │  │  │  ├─ auth.py
│  │  │     │  │  │  ├─ cache.py
│  │  │     │  │  │  ├─ download.py
│  │  │     │  │  │  ├─ lazy_wheel.py
│  │  │     │  │  │  ├─ session.py
│  │  │     │  │  │  ├─ utils.py
│  │  │     │  │  │  ├─ xmlrpc.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ operations
│  │  │     │  │  │  ├─ build
│  │  │     │  │  │  │  ├─ metadata.py
│  │  │     │  │  │  │  ├─ metadata_editable.py
│  │  │     │  │  │  │  ├─ metadata_legacy.py
│  │  │     │  │  │  │  ├─ wheel.py
│  │  │     │  │  │  │  ├─ wheel_editable.py
│  │  │     │  │  │  │  ├─ wheel_legacy.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ check.py
│  │  │     │  │  │  ├─ freeze.py
│  │  │     │  │  │  ├─ install
│  │  │     │  │  │  │  ├─ editable_legacy.py
│  │  │     │  │  │  │  ├─ legacy.py
│  │  │     │  │  │  │  ├─ wheel.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ prepare.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pyproject.py
│  │  │     │  │  ├─ req
│  │  │     │  │  │  ├─ constructors.py
│  │  │     │  │  │  ├─ req_file.py
│  │  │     │  │  │  ├─ req_install.py
│  │  │     │  │  │  ├─ req_set.py
│  │  │     │  │  │  ├─ req_tracker.py
│  │  │     │  │  │  ├─ req_uninstall.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ resolution
│  │  │     │  │  │  ├─ base.py
│  │  │     │  │  │  ├─ legacy
│  │  │     │  │  │  │  ├─ resolver.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ resolvelib
│  │  │     │  │  │  │  ├─ base.py
│  │  │     │  │  │  │  ├─ candidates.py
│  │  │     │  │  │  │  ├─ factory.py
│  │  │     │  │  │  │  ├─ found_candidates.py
│  │  │     │  │  │  │  ├─ provider.py
│  │  │     │  │  │  │  ├─ reporter.py
│  │  │     │  │  │  │  ├─ requirements.py
│  │  │     │  │  │  │  ├─ resolver.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ self_outdated_check.py
│  │  │     │  │  ├─ utils
│  │  │     │  │  │  ├─ appdirs.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ compatibility_tags.py
│  │  │     │  │  │  ├─ datetime.py
│  │  │     │  │  │  ├─ deprecation.py
│  │  │     │  │  │  ├─ direct_url_helpers.py
│  │  │     │  │  │  ├─ distutils_args.py
│  │  │     │  │  │  ├─ egg_link.py
│  │  │     │  │  │  ├─ encoding.py
│  │  │     │  │  │  ├─ entrypoints.py
│  │  │     │  │  │  ├─ filesystem.py
│  │  │     │  │  │  ├─ filetypes.py
│  │  │     │  │  │  ├─ glibc.py
│  │  │     │  │  │  ├─ hashes.py
│  │  │     │  │  │  ├─ inject_securetransport.py
│  │  │     │  │  │  ├─ logging.py
│  │  │     │  │  │  ├─ misc.py
│  │  │     │  │  │  ├─ models.py
│  │  │     │  │  │  ├─ packaging.py
│  │  │     │  │  │  ├─ setuptools_build.py
│  │  │     │  │  │  ├─ subprocess.py
│  │  │     │  │  │  ├─ temp_dir.py
│  │  │     │  │  │  ├─ unpacking.py
│  │  │     │  │  │  ├─ urls.py
│  │  │     │  │  │  ├─ virtualenv.py
│  │  │     │  │  │  ├─ wheel.py
│  │  │     │  │  │  ├─ _log.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ vcs
│  │  │     │  │  │  ├─ bazaar.py
│  │  │     │  │  │  ├─ git.py
│  │  │     │  │  │  ├─ mercurial.py
│  │  │     │  │  │  ├─ subversion.py
│  │  │     │  │  │  ├─ versioncontrol.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ wheel_builder.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ _vendor
│  │  │     │  │  ├─ cachecontrol
│  │  │     │  │  │  ├─ adapter.py
│  │  │     │  │  │  ├─ cache.py
│  │  │     │  │  │  ├─ caches
│  │  │     │  │  │  │  ├─ file_cache.py
│  │  │     │  │  │  │  ├─ redis_cache.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ controller.py
│  │  │     │  │  │  ├─ filewrapper.py
│  │  │     │  │  │  ├─ heuristics.py
│  │  │     │  │  │  ├─ serialize.py
│  │  │     │  │  │  ├─ wrapper.py
│  │  │     │  │  │  ├─ _cmd.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ certifi
│  │  │     │  │  │  ├─ cacert.pem
│  │  │     │  │  │  ├─ core.py
│  │  │     │  │  │  ├─ __init__.py
│  │  │     │  │  │  └─ __main__.py
│  │  │     │  │  ├─ chardet
│  │  │     │  │  │  ├─ big5freq.py
│  │  │     │  │  │  ├─ big5prober.py
│  │  │     │  │  │  ├─ chardistribution.py
│  │  │     │  │  │  ├─ charsetgroupprober.py
│  │  │     │  │  │  ├─ charsetprober.py
│  │  │     │  │  │  ├─ cli
│  │  │     │  │  │  │  ├─ chardetect.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ codingstatemachine.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ cp949prober.py
│  │  │     │  │  │  ├─ enums.py
│  │  │     │  │  │  ├─ escprober.py
│  │  │     │  │  │  ├─ escsm.py
│  │  │     │  │  │  ├─ eucjpprober.py
│  │  │     │  │  │  ├─ euckrfreq.py
│  │  │     │  │  │  ├─ euckrprober.py
│  │  │     │  │  │  ├─ euctwfreq.py
│  │  │     │  │  │  ├─ euctwprober.py
│  │  │     │  │  │  ├─ gb2312freq.py
│  │  │     │  │  │  ├─ gb2312prober.py
│  │  │     │  │  │  ├─ hebrewprober.py
│  │  │     │  │  │  ├─ jisfreq.py
│  │  │     │  │  │  ├─ jpcntx.py
│  │  │     │  │  │  ├─ langbulgarianmodel.py
│  │  │     │  │  │  ├─ langgreekmodel.py
│  │  │     │  │  │  ├─ langhebrewmodel.py
│  │  │     │  │  │  ├─ langhungarianmodel.py
│  │  │     │  │  │  ├─ langrussianmodel.py
│  │  │     │  │  │  ├─ langthaimodel.py
│  │  │     │  │  │  ├─ langturkishmodel.py
│  │  │     │  │  │  ├─ latin1prober.py
│  │  │     │  │  │  ├─ mbcharsetprober.py
│  │  │     │  │  │  ├─ mbcsgroupprober.py
│  │  │     │  │  │  ├─ mbcssm.py
│  │  │     │  │  │  ├─ metadata
│  │  │     │  │  │  │  ├─ languages.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ sbcharsetprober.py
│  │  │     │  │  │  ├─ sbcsgroupprober.py
│  │  │     │  │  │  ├─ sjisprober.py
│  │  │     │  │  │  ├─ universaldetector.py
│  │  │     │  │  │  ├─ utf8prober.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ colorama
│  │  │     │  │  │  ├─ ansi.py
│  │  │     │  │  │  ├─ ansitowin32.py
│  │  │     │  │  │  ├─ initialise.py
│  │  │     │  │  │  ├─ win32.py
│  │  │     │  │  │  ├─ winterm.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ distlib
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ database.py
│  │  │     │  │  │  ├─ index.py
│  │  │     │  │  │  ├─ locators.py
│  │  │     │  │  │  ├─ manifest.py
│  │  │     │  │  │  ├─ markers.py
│  │  │     │  │  │  ├─ metadata.py
│  │  │     │  │  │  ├─ resources.py
│  │  │     │  │  │  ├─ scripts.py
│  │  │     │  │  │  ├─ t32.exe
│  │  │     │  │  │  ├─ t64-arm.exe
│  │  │     │  │  │  ├─ t64.exe
│  │  │     │  │  │  ├─ util.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  ├─ w32.exe
│  │  │     │  │  │  ├─ w64-arm.exe
│  │  │     │  │  │  ├─ w64.exe
│  │  │     │  │  │  ├─ wheel.py
│  │  │     │  │  │  ├─ _backport
│  │  │     │  │  │  │  ├─ misc.py
│  │  │     │  │  │  │  ├─ shutil.py
│  │  │     │  │  │  │  ├─ sysconfig.cfg
│  │  │     │  │  │  │  ├─ sysconfig.py
│  │  │     │  │  │  │  ├─ tarfile.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ distro.py
│  │  │     │  │  ├─ html5lib
│  │  │     │  │  │  ├─ constants.py
│  │  │     │  │  │  ├─ filters
│  │  │     │  │  │  │  ├─ alphabeticalattributes.py
│  │  │     │  │  │  │  ├─ base.py
│  │  │     │  │  │  │  ├─ inject_meta_charset.py
│  │  │     │  │  │  │  ├─ lint.py
│  │  │     │  │  │  │  ├─ optionaltags.py
│  │  │     │  │  │  │  ├─ sanitizer.py
│  │  │     │  │  │  │  ├─ whitespace.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ html5parser.py
│  │  │     │  │  │  ├─ serializer.py
│  │  │     │  │  │  ├─ treeadapters
│  │  │     │  │  │  │  ├─ genshi.py
│  │  │     │  │  │  │  ├─ sax.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ treebuilders
│  │  │     │  │  │  │  ├─ base.py
│  │  │     │  │  │  │  ├─ dom.py
│  │  │     │  │  │  │  ├─ etree.py
│  │  │     │  │  │  │  ├─ etree_lxml.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ treewalkers
│  │  │     │  │  │  │  ├─ base.py
│  │  │     │  │  │  │  ├─ dom.py
│  │  │     │  │  │  │  ├─ etree.py
│  │  │     │  │  │  │  ├─ etree_lxml.py
│  │  │     │  │  │  │  ├─ genshi.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ _ihatexml.py
│  │  │     │  │  │  ├─ _inputstream.py
│  │  │     │  │  │  ├─ _tokenizer.py
│  │  │     │  │  │  ├─ _trie
│  │  │     │  │  │  │  ├─ py.py
│  │  │     │  │  │  │  ├─ _base.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ _utils.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ idna
│  │  │     │  │  │  ├─ codec.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ core.py
│  │  │     │  │  │  ├─ idnadata.py
│  │  │     │  │  │  ├─ intranges.py
│  │  │     │  │  │  ├─ package_data.py
│  │  │     │  │  │  ├─ uts46data.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ msgpack
│  │  │     │  │  │  ├─ exceptions.py
│  │  │     │  │  │  ├─ ext.py
│  │  │     │  │  │  ├─ fallback.py
│  │  │     │  │  │  ├─ _version.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ packaging
│  │  │     │  │  │  ├─ markers.py
│  │  │     │  │  │  ├─ requirements.py
│  │  │     │  │  │  ├─ specifiers.py
│  │  │     │  │  │  ├─ tags.py
│  │  │     │  │  │  ├─ utils.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  ├─ _manylinux.py
│  │  │     │  │  │  ├─ _musllinux.py
│  │  │     │  │  │  ├─ _structures.py
│  │  │     │  │  │  ├─ __about__.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pep517
│  │  │     │  │  │  ├─ build.py
│  │  │     │  │  │  ├─ check.py
│  │  │     │  │  │  ├─ colorlog.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ dirtools.py
│  │  │     │  │  │  ├─ envbuild.py
│  │  │     │  │  │  ├─ in_process
│  │  │     │  │  │  │  ├─ _in_process.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ meta.py
│  │  │     │  │  │  ├─ wrappers.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pkg_resources
│  │  │     │  │  │  ├─ py31compat.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ platformdirs
│  │  │     │  │  │  ├─ android.py
│  │  │     │  │  │  ├─ api.py
│  │  │     │  │  │  ├─ macos.py
│  │  │     │  │  │  ├─ unix.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  ├─ windows.py
│  │  │     │  │  │  ├─ __init__.py
│  │  │     │  │  │  └─ __main__.py
│  │  │     │  │  ├─ progress
│  │  │     │  │  │  ├─ bar.py
│  │  │     │  │  │  ├─ colors.py
│  │  │     │  │  │  ├─ counter.py
│  │  │     │  │  │  ├─ spinner.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pygments
│  │  │     │  │  │  ├─ cmdline.py
│  │  │     │  │  │  ├─ console.py
│  │  │     │  │  │  ├─ filter.py
│  │  │     │  │  │  ├─ filters
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ formatter.py
│  │  │     │  │  │  ├─ formatters
│  │  │     │  │  │  │  ├─ bbcode.py
│  │  │     │  │  │  │  ├─ groff.py
│  │  │     │  │  │  │  ├─ html.py
│  │  │     │  │  │  │  ├─ img.py
│  │  │     │  │  │  │  ├─ irc.py
│  │  │     │  │  │  │  ├─ latex.py
│  │  │     │  │  │  │  ├─ other.py
│  │  │     │  │  │  │  ├─ pangomarkup.py
│  │  │     │  │  │  │  ├─ rtf.py
│  │  │     │  │  │  │  ├─ svg.py
│  │  │     │  │  │  │  ├─ terminal.py
│  │  │     │  │  │  │  ├─ terminal256.py
│  │  │     │  │  │  │  ├─ _mapping.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ lexer.py
│  │  │     │  │  │  ├─ lexers
│  │  │     │  │  │  │  ├─ python.py
│  │  │     │  │  │  │  ├─ _mapping.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ modeline.py
│  │  │     │  │  │  ├─ plugin.py
│  │  │     │  │  │  ├─ regexopt.py
│  │  │     │  │  │  ├─ scanner.py
│  │  │     │  │  │  ├─ sphinxext.py
│  │  │     │  │  │  ├─ style.py
│  │  │     │  │  │  ├─ styles
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ token.py
│  │  │     │  │  │  ├─ unistring.py
│  │  │     │  │  │  ├─ util.py
│  │  │     │  │  │  ├─ __init__.py
│  │  │     │  │  │  └─ __main__.py
│  │  │     │  │  ├─ pyparsing
│  │  │     │  │  │  ├─ actions.py
│  │  │     │  │  │  ├─ common.py
│  │  │     │  │  │  ├─ core.py
│  │  │     │  │  │  ├─ diagram
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ exceptions.py
│  │  │     │  │  │  ├─ helpers.py
│  │  │     │  │  │  ├─ results.py
│  │  │     │  │  │  ├─ testing.py
│  │  │     │  │  │  ├─ unicode.py
│  │  │     │  │  │  ├─ util.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ requests
│  │  │     │  │  │  ├─ adapters.py
│  │  │     │  │  │  ├─ api.py
│  │  │     │  │  │  ├─ auth.py
│  │  │     │  │  │  ├─ certs.py
│  │  │     │  │  │  ├─ compat.py
│  │  │     │  │  │  ├─ cookies.py
│  │  │     │  │  │  ├─ exceptions.py
│  │  │     │  │  │  ├─ help.py
│  │  │     │  │  │  ├─ hooks.py
│  │  │     │  │  │  ├─ models.py
│  │  │     │  │  │  ├─ packages.py
│  │  │     │  │  │  ├─ sessions.py
│  │  │     │  │  │  ├─ status_codes.py
│  │  │     │  │  │  ├─ structures.py
│  │  │     │  │  │  ├─ utils.py
│  │  │     │  │  │  ├─ _internal_utils.py
│  │  │     │  │  │  ├─ __init__.py
│  │  │     │  │  │  └─ __version__.py
│  │  │     │  │  ├─ resolvelib
│  │  │     │  │  │  ├─ compat
│  │  │     │  │  │  │  ├─ collections_abc.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ providers.py
│  │  │     │  │  │  ├─ reporters.py
│  │  │     │  │  │  ├─ resolvers.py
│  │  │     │  │  │  ├─ structs.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ rich
│  │  │     │  │  │  ├─ abc.py
│  │  │     │  │  │  ├─ align.py
│  │  │     │  │  │  ├─ ansi.py
│  │  │     │  │  │  ├─ bar.py
│  │  │     │  │  │  ├─ box.py
│  │  │     │  │  │  ├─ cells.py
│  │  │     │  │  │  ├─ color.py
│  │  │     │  │  │  ├─ color_triplet.py
│  │  │     │  │  │  ├─ columns.py
│  │  │     │  │  │  ├─ console.py
│  │  │     │  │  │  ├─ constrain.py
│  │  │     │  │  │  ├─ containers.py
│  │  │     │  │  │  ├─ control.py
│  │  │     │  │  │  ├─ default_styles.py
│  │  │     │  │  │  ├─ diagnose.py
│  │  │     │  │  │  ├─ emoji.py
│  │  │     │  │  │  ├─ errors.py
│  │  │     │  │  │  ├─ filesize.py
│  │  │     │  │  │  ├─ file_proxy.py
│  │  │     │  │  │  ├─ highlighter.py
│  │  │     │  │  │  ├─ json.py
│  │  │     │  │  │  ├─ jupyter.py
│  │  │     │  │  │  ├─ layout.py
│  │  │     │  │  │  ├─ live.py
│  │  │     │  │  │  ├─ live_render.py
│  │  │     │  │  │  ├─ logging.py
│  │  │     │  │  │  ├─ markup.py
│  │  │     │  │  │  ├─ measure.py
│  │  │     │  │  │  ├─ padding.py
│  │  │     │  │  │  ├─ pager.py
│  │  │     │  │  │  ├─ palette.py
│  │  │     │  │  │  ├─ panel.py
│  │  │     │  │  │  ├─ pretty.py
│  │  │     │  │  │  ├─ progress.py
│  │  │     │  │  │  ├─ progress_bar.py
│  │  │     │  │  │  ├─ prompt.py
│  │  │     │  │  │  ├─ protocol.py
│  │  │     │  │  │  ├─ region.py
│  │  │     │  │  │  ├─ repr.py
│  │  │     │  │  │  ├─ rule.py
│  │  │     │  │  │  ├─ scope.py
│  │  │     │  │  │  ├─ screen.py
│  │  │     │  │  │  ├─ segment.py
│  │  │     │  │  │  ├─ spinner.py
│  │  │     │  │  │  ├─ status.py
│  │  │     │  │  │  ├─ style.py
│  │  │     │  │  │  ├─ styled.py
│  │  │     │  │  │  ├─ syntax.py
│  │  │     │  │  │  ├─ table.py
│  │  │     │  │  │  ├─ tabulate.py
│  │  │     │  │  │  ├─ terminal_theme.py
│  │  │     │  │  │  ├─ text.py
│  │  │     │  │  │  ├─ theme.py
│  │  │     │  │  │  ├─ themes.py
│  │  │     │  │  │  ├─ traceback.py
│  │  │     │  │  │  ├─ tree.py
│  │  │     │  │  │  ├─ _cell_widths.py
│  │  │     │  │  │  ├─ _emoji_codes.py
│  │  │     │  │  │  ├─ _emoji_replace.py
│  │  │     │  │  │  ├─ _extension.py
│  │  │     │  │  │  ├─ _inspect.py
│  │  │     │  │  │  ├─ _log_render.py
│  │  │     │  │  │  ├─ _loop.py
│  │  │     │  │  │  ├─ _lru_cache.py
│  │  │     │  │  │  ├─ _palettes.py
│  │  │     │  │  │  ├─ _pick.py
│  │  │     │  │  │  ├─ _ratio.py
│  │  │     │  │  │  ├─ _spinners.py
│  │  │     │  │  │  ├─ _stack.py
│  │  │     │  │  │  ├─ _timer.py
│  │  │     │  │  │  ├─ _windows.py
│  │  │     │  │  │  ├─ _wrap.py
│  │  │     │  │  │  ├─ __init__.py
│  │  │     │  │  │  └─ __main__.py
│  │  │     │  │  ├─ six.py
│  │  │     │  │  ├─ tenacity
│  │  │     │  │  │  ├─ after.py
│  │  │     │  │  │  ├─ before.py
│  │  │     │  │  │  ├─ before_sleep.py
│  │  │     │  │  │  ├─ nap.py
│  │  │     │  │  │  ├─ retry.py
│  │  │     │  │  │  ├─ stop.py
│  │  │     │  │  │  ├─ tornadoweb.py
│  │  │     │  │  │  ├─ wait.py
│  │  │     │  │  │  ├─ _asyncio.py
│  │  │     │  │  │  ├─ _utils.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ tomli
│  │  │     │  │  │  ├─ _parser.py
│  │  │     │  │  │  ├─ _re.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ typing_extensions.py
│  │  │     │  │  ├─ urllib3
│  │  │     │  │  │  ├─ connection.py
│  │  │     │  │  │  ├─ connectionpool.py
│  │  │     │  │  │  ├─ contrib
│  │  │     │  │  │  │  ├─ appengine.py
│  │  │     │  │  │  │  ├─ ntlmpool.py
│  │  │     │  │  │  │  ├─ pyopenssl.py
│  │  │     │  │  │  │  ├─ securetransport.py
│  │  │     │  │  │  │  ├─ socks.py
│  │  │     │  │  │  │  ├─ _appengine_environ.py
│  │  │     │  │  │  │  ├─ _securetransport
│  │  │     │  │  │  │  │  ├─ bindings.py
│  │  │     │  │  │  │  │  ├─ low_level.py
│  │  │     │  │  │  │  │  └─ __init__.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ exceptions.py
│  │  │     │  │  │  ├─ fields.py
│  │  │     │  │  │  ├─ filepost.py
│  │  │     │  │  │  ├─ packages
│  │  │     │  │  │  │  ├─ backports
│  │  │     │  │  │  │  │  ├─ makefile.py
│  │  │     │  │  │  │  │  └─ __init__.py
│  │  │     │  │  │  │  ├─ six.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ poolmanager.py
│  │  │     │  │  │  ├─ request.py
│  │  │     │  │  │  ├─ response.py
│  │  │     │  │  │  ├─ util
│  │  │     │  │  │  │  ├─ connection.py
│  │  │     │  │  │  │  ├─ proxy.py
│  │  │     │  │  │  │  ├─ queue.py
│  │  │     │  │  │  │  ├─ request.py
│  │  │     │  │  │  │  ├─ response.py
│  │  │     │  │  │  │  ├─ retry.py
│  │  │     │  │  │  │  ├─ ssltransport.py
│  │  │     │  │  │  │  ├─ ssl_.py
│  │  │     │  │  │  │  ├─ ssl_match_hostname.py
│  │  │     │  │  │  │  ├─ timeout.py
│  │  │     │  │  │  │  ├─ url.py
│  │  │     │  │  │  │  ├─ wait.py
│  │  │     │  │  │  │  └─ __init__.py
│  │  │     │  │  │  ├─ _collections.py
│  │  │     │  │  │  ├─ _version.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ vendor.txt
│  │  │     │  │  ├─ webencodings
│  │  │     │  │  │  ├─ labels.py
│  │  │     │  │  │  ├─ mklabels.py
│  │  │     │  │  │  ├─ tests.py
│  │  │     │  │  │  ├─ x_user_defined.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ __init__.py
│  │  │     │  └─ __main__.py
│  │  │     ├─ pip-22.0.4.dist-info
│  │  │     │  ├─ entry_points.txt
│  │  │     │  ├─ INSTALLER
│  │  │     │  ├─ LICENSE.txt
│  │  │     │  ├─ METADATA
│  │  │     │  ├─ RECORD
│  │  │     │  ├─ REQUESTED
│  │  │     │  ├─ top_level.txt
│  │  │     │  └─ WHEEL
│  │  │     ├─ pkg_resources
│  │  │     │  ├─ extern
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ tests
│  │  │     │  │  └─ data
│  │  │     │  │     └─ my-test-package-source
│  │  │     │  │        └─ setup.py
│  │  │     │  ├─ _vendor
│  │  │     │  │  ├─ appdirs.py
│  │  │     │  │  ├─ packaging
│  │  │     │  │  │  ├─ markers.py
│  │  │     │  │  │  ├─ requirements.py
│  │  │     │  │  │  ├─ specifiers.py
│  │  │     │  │  │  ├─ tags.py
│  │  │     │  │  │  ├─ utils.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  ├─ _compat.py
│  │  │     │  │  │  ├─ _structures.py
│  │  │     │  │  │  ├─ _typing.py
│  │  │     │  │  │  ├─ __about__.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pyparsing.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  └─ __init__.py
│  │  │     ├─ setuptools
│  │  │     │  ├─ archive_util.py
│  │  │     │  ├─ build_meta.py
│  │  │     │  ├─ cli-32.exe
│  │  │     │  ├─ cli-64.exe
│  │  │     │  ├─ cli.exe
│  │  │     │  ├─ command
│  │  │     │  │  ├─ alias.py
│  │  │     │  │  ├─ bdist_egg.py
│  │  │     │  │  ├─ bdist_rpm.py
│  │  │     │  │  ├─ build_clib.py
│  │  │     │  │  ├─ build_ext.py
│  │  │     │  │  ├─ build_py.py
│  │  │     │  │  ├─ develop.py
│  │  │     │  │  ├─ dist_info.py
│  │  │     │  │  ├─ easy_install.py
│  │  │     │  │  ├─ egg_info.py
│  │  │     │  │  ├─ install.py
│  │  │     │  │  ├─ install_egg_info.py
│  │  │     │  │  ├─ install_lib.py
│  │  │     │  │  ├─ install_scripts.py
│  │  │     │  │  ├─ launcher manifest.xml
│  │  │     │  │  ├─ py36compat.py
│  │  │     │  │  ├─ register.py
│  │  │     │  │  ├─ rotate.py
│  │  │     │  │  ├─ saveopts.py
│  │  │     │  │  ├─ sdist.py
│  │  │     │  │  ├─ setopt.py
│  │  │     │  │  ├─ test.py
│  │  │     │  │  ├─ upload.py
│  │  │     │  │  ├─ upload_docs.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ config.py
│  │  │     │  ├─ depends.py
│  │  │     │  ├─ dep_util.py
│  │  │     │  ├─ dist.py
│  │  │     │  ├─ errors.py
│  │  │     │  ├─ extension.py
│  │  │     │  ├─ extern
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ glob.py
│  │  │     │  ├─ gui-32.exe
│  │  │     │  ├─ gui-64.exe
│  │  │     │  ├─ gui.exe
│  │  │     │  ├─ installer.py
│  │  │     │  ├─ launch.py
│  │  │     │  ├─ monkey.py
│  │  │     │  ├─ msvc.py
│  │  │     │  ├─ namespaces.py
│  │  │     │  ├─ package_index.py
│  │  │     │  ├─ py34compat.py
│  │  │     │  ├─ sandbox.py
│  │  │     │  ├─ script (dev).tmpl
│  │  │     │  ├─ script.tmpl
│  │  │     │  ├─ unicode_utils.py
│  │  │     │  ├─ version.py
│  │  │     │  ├─ wheel.py
│  │  │     │  ├─ windows_support.py
│  │  │     │  ├─ _deprecation_warning.py
│  │  │     │  ├─ _distutils
│  │  │     │  │  ├─ archive_util.py
│  │  │     │  │  ├─ bcppcompiler.py
│  │  │     │  │  ├─ ccompiler.py
│  │  │     │  │  ├─ cmd.py
│  │  │     │  │  ├─ command
│  │  │     │  │  │  ├─ bdist.py
│  │  │     │  │  │  ├─ bdist_dumb.py
│  │  │     │  │  │  ├─ bdist_msi.py
│  │  │     │  │  │  ├─ bdist_rpm.py
│  │  │     │  │  │  ├─ bdist_wininst.py
│  │  │     │  │  │  ├─ build.py
│  │  │     │  │  │  ├─ build_clib.py
│  │  │     │  │  │  ├─ build_ext.py
│  │  │     │  │  │  ├─ build_py.py
│  │  │     │  │  │  ├─ build_scripts.py
│  │  │     │  │  │  ├─ check.py
│  │  │     │  │  │  ├─ clean.py
│  │  │     │  │  │  ├─ config.py
│  │  │     │  │  │  ├─ install.py
│  │  │     │  │  │  ├─ install_data.py
│  │  │     │  │  │  ├─ install_egg_info.py
│  │  │     │  │  │  ├─ install_headers.py
│  │  │     │  │  │  ├─ install_lib.py
│  │  │     │  │  │  ├─ install_scripts.py
│  │  │     │  │  │  ├─ py37compat.py
│  │  │     │  │  │  ├─ register.py
│  │  │     │  │  │  ├─ sdist.py
│  │  │     │  │  │  ├─ upload.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ config.py
│  │  │     │  │  ├─ core.py
│  │  │     │  │  ├─ cygwinccompiler.py
│  │  │     │  │  ├─ debug.py
│  │  │     │  │  ├─ dep_util.py
│  │  │     │  │  ├─ dir_util.py
│  │  │     │  │  ├─ dist.py
│  │  │     │  │  ├─ errors.py
│  │  │     │  │  ├─ extension.py
│  │  │     │  │  ├─ fancy_getopt.py
│  │  │     │  │  ├─ filelist.py
│  │  │     │  │  ├─ file_util.py
│  │  │     │  │  ├─ log.py
│  │  │     │  │  ├─ msvc9compiler.py
│  │  │     │  │  ├─ msvccompiler.py
│  │  │     │  │  ├─ py35compat.py
│  │  │     │  │  ├─ py38compat.py
│  │  │     │  │  ├─ spawn.py
│  │  │     │  │  ├─ sysconfig.py
│  │  │     │  │  ├─ text_file.py
│  │  │     │  │  ├─ unixccompiler.py
│  │  │     │  │  ├─ util.py
│  │  │     │  │  ├─ version.py
│  │  │     │  │  ├─ versionpredicate.py
│  │  │     │  │  ├─ _msvccompiler.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  ├─ _imp.py
│  │  │     │  ├─ _vendor
│  │  │     │  │  ├─ more_itertools
│  │  │     │  │  │  ├─ more.py
│  │  │     │  │  │  ├─ recipes.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ ordered_set.py
│  │  │     │  │  ├─ packaging
│  │  │     │  │  │  ├─ markers.py
│  │  │     │  │  │  ├─ requirements.py
│  │  │     │  │  │  ├─ specifiers.py
│  │  │     │  │  │  ├─ tags.py
│  │  │     │  │  │  ├─ utils.py
│  │  │     │  │  │  ├─ version.py
│  │  │     │  │  │  ├─ _compat.py
│  │  │     │  │  │  ├─ _structures.py
│  │  │     │  │  │  ├─ _typing.py
│  │  │     │  │  │  ├─ __about__.py
│  │  │     │  │  │  └─ __init__.py
│  │  │     │  │  ├─ pyparsing.py
│  │  │     │  │  └─ __init__.py
│  │  │     │  └─ __init__.py
│  │  │     ├─ setuptools-58.1.0.dist-info
│  │  │     │  ├─ entry_points.txt
│  │  │     │  ├─ INSTALLER
│  │  │     │  ├─ LICENSE
│  │  │     │  ├─ METADATA
│  │  │     │  ├─ RECORD
│  │  │     │  ├─ REQUESTED
│  │  │     │  ├─ top_level.txt
│  │  │     │  └─ WHEEL
│  │  │     └─ _distutils_hack
│  │  │        ├─ override.py
│  │  │        └─ __init__.py
│  │  ├─ pyvenv.cfg
│  │  └─ Scripts
│  │     ├─ activate
│  │     ├─ activate.bat
│  │     ├─ Activate.ps1
│  │     ├─ deactivate.bat
│  │     ├─ pip.exe
│  │     ├─ pip3.10.exe
│  │     ├─ pip3.exe
│  │     ├─ python.exe
│  │     └─ pythonw.exe
│  └─ sample.py
├─ README.md
├─ REFACTORING_GUIDE.md
├─ requirements.txt
└─ VISUAL_REFERENCE.md

```