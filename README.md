# ✨ GestureX – AI Powered Gesture Control Camera App

GestureX is a smart web-based application that allows users to control camera actions using **hand gestures** in real-time.  
Built using **React.js** and **MediaPipe**, the project transforms normal camera interaction into a touchless and futuristic experience.

---

## 🚀 Live Demo
🔗 Add your deployed link here: `https://gesture-x-seven.vercel.app`

---

## 📌 Features

✅ Real-time Hand Gesture Detection  
✅ Capture Photos using Gestures 📸  
✅ Start / Stop Video Recording 🎥  
✅ Smooth Camera Integration  
✅ Interactive Gesture Overlay UI  
✅ Fast & Lightweight Performance  
✅ Contactless Experience  

---

## 🛠️ Tech Stack

- **Frontend:** React.js  
- **Styling:** CSS3  
- **AI / ML:** MediaPipe Hand Tracking  
- **Language:** JavaScript  
- **Deployment:** Vercel / Netlify  

---

## 🧠 How It Works

1. User allows camera access in browser.  
2. MediaPipe detects hand landmarks in real-time.  
3. Specific hand gestures are recognized.  
4. Based on gesture:
   - 📸 Capture image  
   - 🎥 Start recording  
   - ⏹️ Stop recording  
5. Output is shown instantly on screen.

---

## 📂 Project Structure

```bash
src/
│── components/
│   ├── Camera.jsx
│   ├── CanvasBoard.jsx
│   ├── Capture.jsx
│   ├── Game.jsx
│   ├── HandTracking.jsx
│   ├── UIOverlay.jsx
│   └── poseActions.jsx
│
│── utils/
│   └── gestures.js
│
│── App.jsx
│── main.jsx
│── index.css
