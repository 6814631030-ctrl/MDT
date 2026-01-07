// ====== fb.js (Auto-Detect User from Login) ======

const firebaseConfig = {
    apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
    authDomain: "law-enforment.firebaseapp.com",
    databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/", // URL จากรูปภาพของคุณ
    projectId: "law-enforment",
    storageBucket: "law-enforment.appspot.com",
    messagingSenderId: "328110715362",
    appId: "1:328110715362:web:6883f14af8be404ecf09bb",
    measurementId: "G-1X08RZGGEF"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    console.log("[System] Dashboard Loaded. Checking Login...");

    // 1. ดึงค่าที่หน้า Login บันทึกมา
    const storedId = localStorage.getItem("officerId");   // อาจเป็นเลข "301"
    const storedUser = localStorage.getItem("username");  // หรืออาจเป็นชื่อ "Henderson"
    
    // Elements
    const els = {
        userInfo: document.getElementById("userInfo"), 
        currentOfficer: document.getElementById("currentOfficer"),
        info: document.getElementById("info"),
        time: document.getElementById("time"),
        logoRoot: document.getElementById("logoRoot"),
        startBtn: document.getElementById("startDuty"),
        endBtn: document.getElementById("endDuty"),
        logs: document.getElementById("logs"),
        clickSound: document.getElementById("clickSound")
    };

    if(els.currentOfficer) els.currentOfficer.textContent = "Authenticating...";

    // ============================================================
    // CASE A: ถ้ามี ID ตัวเลขชัดเจน (เช่น 301, 14002) -> โหลดเลย
    // ============================================================
    if (storedId && !isNaN(storedId)) {
        console.log(`[Login] Found ID: ${storedId}, Loading directly...`);
        loadUserData(storedId, els);
    } 
    // ============================================================
    // CASE B: ถ้ามีแต่ Username (เช่น "Henderson") -> ต้องค้นหา ID ก่อน
    // ============================================================
    else if (storedUser) {
        console.log(`[Login] Found Username: ${storedUser}, Searching for ID...`);
        findIdByUsername(storedUser, els);
    } 
    // ============================================================
    // CASE C: ไม่เจออะไรเลย (ยังไม่ Login) -> Debug Mode
    // ============================================================
    else {
        console.warn("[Login] No credentials found.");
        const debugId = prompt("DEBUG MODE: ไม่พบข้อมูล Login กรุณากรอก ID (เช่น 301, 14002):", "301");
        if(debugId) {
            localStorage.setItem("officerId", debugId);
            loadUserData(debugId, els);
        } else {
             showFatalError("PLEASE LOGIN FIRST / กรุณาเข้าสู่ระบบ");
        }
    }
});

// ============================================================
// ฟังก์ชัน 1: ค้นหา ID จาก Username (แก้ปัญหาข้อมูลไม่ตรง)
// ============================================================
function findIdByUsername(username, els) {
    db.ref("Users").orderByChild("username").equalTo(username).once("value")
        .then(snapshot => {
            if (snapshot.exists()) {
                // เจอข้อมูล! ดึง Key ออกมา (เช่น เจอ username="Henderson" อยู่ใน Key "301")
                const data = snapshot.val();
                const realId = Object.keys(data)[0]; // ได้ค่า "301"
                
                console.log(`[Success] Username "${username}" matches ID "${realId}"`);
                
                // บันทึก ID จริงกลับลงเครื่อง ครั้งหน้าจะได้ไม่ต้องหาใหม่
                localStorage.setItem("officerId", realId);
                
                // โหลดข้อมูลด้วย ID ที่ถูกต้อง
                loadUserData(realId, els);
            } else {
                console.error("User not found via username");
                showFatalError(`USER NOT FOUND: "${username}"`);
            }
        });
}

// ============================================================
// ฟังก์ชัน 2: โหลดข้อมูลและเริ่มระบบ (Main Function)
// ============================================================
function loadUserData(id, els) {
    const userPath = "Users/" + id;
    
    db.ref(userPath).on("value", (snapshot) => { // ใช้ .on เพื่อให้ Realtime
        const user = snapshot.val();
        
        if (!user) {
            showFatalError(`DATABASE ERROR: ID ${id} not found`);
            return;
        }

        // --- 1. แสดงผล Profile ---
        const name = user.name || "Unknown";
        const rank = user.rank || "Officer";
        const callsign = user.callsign || "-";
        
        if(els.currentOfficer) els.currentOfficer.textContent = name;
        if(els.userInfo) els.userInfo.textContent = `${rank} | ${callsign} | ID: ${id}`;
        if(els.info) els.info.textContent = `${rank} ${name}`;
        if(els.time) els.time.textContent = user.loginTime || "-";

        // รูปภาพ
        if(els.logoRoot) {
            if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
                els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                els.logoRoot.textContent = name.substring(0,2).toUpperCase();
            }
        }
        
        // --- 2. เรียกใช้ระบบ Duty ---
        // ส่ง userPath และ id ไปให้ระบบ Duty ทำงาน
        initDutySystem(db.ref(userPath), els, id);
    });
}

// ============================================================
// ฟังก์ชัน 3: ระบบ Start/End Duty (กดได้ + บันทึกได้)
// ============================================================
function initDutySystem(ref, els, id) {
    // เช็คสถานะจาก LocalStorage (เพื่อไม่ให้รีเฟรชแล้วหลุด)
    let isOnDuty = localStorage.getItem("isOnDuty_" + id) === "true"; 
    let currentKey = localStorage.getItem("session_" + id);

    // Helper เล่นเสียง
    const playSound = () => { if(els.clickSound) els.clickSound.play().catch(()=>{}); };

    // Update ปุ่มตามสถานะ
    const updateButtons = () => {
        if(els.startBtn) els.startBtn.disabled = isOnDuty;
        if(els.endBtn) els.endBtn.disabled = !isOnDuty;
        
        // Update สถานะบนหน้าจอ (แถบสีเขียว/แดง ถ้ามี)
        const statusText = document.querySelector(".status-text"); // ถ้ามี class นี้
        if(statusText) statusText.textContent = isOnDuty ? "STATUS: ON DUTY" : "STATUS: OFF DUTY";
    };
    updateButtons();

    // --- กดปุ่ม Start Duty ---
    if(els.startBtn) els.startBtn.onclick = () => {
        const now = new Date().toISOString();
        
        // Push ข้อมูลใหม่ลง Users/ID/dutyLogs
        const newRef = ref.child("dutyLogs").push();
        newRef.set({
            startTime: now,
            action: "เข้าเวรปฏิบัติหน้าที่ (On Duty) 🚨"
        }).then(() => {
            isOnDuty = true;
            currentKey = newRef.key;
            
            // Save State
            localStorage.setItem("isOnDuty_" + id, "true");
            localStorage.setItem("session_" + id, currentKey);
            
            updateButtons();
            playSound();
        });
    };

    // --- กดปุ่ม End Duty ---
    if(els.endBtn) els.endBtn.onclick = () => {
        const now = new Date().toISOString();
        
        if (currentKey) {
            ref.child("dutyLogs/" + currentKey).update({
                endTime: now,
                action: "ออกเวร (Off Duty) ✅"
            });
        }
        
        isOnDuty = false;
        currentKey = null;
        localStorage.removeItem("isOnDuty_" + id);
        localStorage.removeItem("session_" + id);
        
        updateButtons();
        playSound();
    };

    // --- Realtime Logs ---
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        const val = snap.val();
        if(els.logs) {
            // เช็คว่า Log นี้มีอยู่แล้วหรือยัง (กันซ้ำ)
            if(document.getElementById(snap.key)) return;

            const li = document.createElement("li");
            li.id = snap.key;
            const timeStr = new Date(val.startTime).toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            
            li.innerHTML = `<span style="color:#00ccff">[${timeStr}]</span> ${val.action}`;
            els.logs.prepend(li);
        }
    });
}

// ============================================================
// ฟังก์ชัน Error Overlay (แสดงเมื่อหาไม่เจอจริงๆ)
// ============================================================
function showFatalError(msg) {
    let overlay = document.getElementById("error-overlay");
    if(!overlay) {
        overlay = document.createElement("div");
        overlay.id = "error-overlay";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div style="text-align:center; color:red; background:rgba(0,0,0,0.9); width:100%; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <h1 style="font-size:80px; margin:0;">ERROR</h1>
            <h2 style="color:white;">${msg}</h2>
            <button onclick="localStorage.clear(); window.location.href='index.html'" style="padding:15px 30px; font-size:20px; cursor:pointer; margin-top:20px;">RE-LOGIN</button>
        </div>
    `;
}