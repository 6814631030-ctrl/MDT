// ====== fb.js (ฉบับสมบูรณ์: มีระบบ Loading และ Error Handling) ======

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
  authDomain: "law-enforment.firebaseapp.com",
  databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "law-enforment",
  storageBucket: "law-enforment.appspot.com",
  messagingSenderId: "328110715362",
  appId: "1:328110715362:web:6883f14af8be404ecf09bb",
  measurementId: "G-1X08RZGGEF"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    
    // ============================================
    // STEP 1: ตรวจสอบ ID (สำคัญที่สุด)
    // ============================================
    let currentId = localStorage.getItem("officerId");

    // [DEBUG] ถ้าไม่มี ID ให้ถาม (สำหรับทดสอบ)
    if (!currentId) {
        // ลองหา Default ID เช่น 14002 หรือ 1
        currentId = prompt("System Debug: กรุณากรอก Officer ID (เช่น 1, 301, 14002):", "14002");
        if (currentId) {
            localStorage.setItem("officerId", currentId);
        } else {
            // ถ้าไม่กรอกอะไรเลย -> เรียกหน้าจอ ERROR 404
            showFatalError("MISSING IDENTIFICATION / ไม่พบข้อมูลระบุตัวตน");
            return; // หยุดการทำงานทันที
        }
    }

    console.log("System Start. Target ID:", currentId);

    // ============================================
    // STEP 2: เตรียมการเชื่อมต่อ
    // ============================================
    const officerRef = db.ref("Users/" + currentId);
    
    // อ้างอิง HTML Elements
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

    // แสดงสถานะกำลังโหลด (เปลี่ยนข้อความระหว่างรอ)
    if(els.currentOfficer) els.currentOfficer.textContent = "Connecting to Database...";

    // ============================================
    // STEP 3: ดึงข้อมูล (Main Logic)
    // ============================================
    officerRef.once("value")
        .then(snapshot => {
            // ตรวจสอบว่ามีข้อมูลจริงไหม?
            if (!snapshot.exists()) {
                throw new Error("USER_NOT_FOUND"); // โยนไปเข้า catch ด้านล่าง
            }

            const user = snapshot.val();
            console.log("Data Loaded:", user);

            // --- 3.1 บันทึกข้อมูลลง LocalStorage ---
            localStorage.setItem("name", user.name || "Unknown");
            localStorage.setItem("rank", user.rank || "Officer");
            localStorage.setItem("badgeId", user.badgeId || currentId);

            // --- 3.2 แสดงผลหน้าจอ (Render UI) ---
            const displayName = user.name || "Unknown Officer";
            const displayRank = user.rank || "Officer";
            const displayCallsign = user.callsign || "NO-CODE";
            const displayId = user.badgeId || user.officerId || currentId;

            if(els.currentOfficer) els.currentOfficer.textContent = displayName;
            
            if(els.userInfo) {
                els.userInfo.innerHTML = `<span style="color:#00ff00">${displayRank}</span> | ${displayCallsign} | ID: ${displayId}`;
            }

            if(els.info) els.info.textContent = `${displayRank} ${displayName}`;
            
            // เวลา Login
            if(els.time) els.time.textContent = user.loginTime || new Date().toLocaleString('th-TH');

            // รูปภาพ
            if(els.logoRoot) {
                if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
                    els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    els.logoRoot.textContent = displayName.substring(0,2).toUpperCase();
                }
            }

            // --- 3.3 เริ่มระบบ Duty ---
            initDutySystem(officerRef, els);

        })
        .catch(error => {
            console.error("Critical Error:", error);
            
            // แยกประเภท Error เพื่อแจ้งเตือนให้ตรงจุด
            if (error.message === "USER_NOT_FOUND") {
                showFatalError(`USER NOT FOUND (ID: ${currentId}) / ไม่พบผู้ใช้ในระบบ`);
            } else if (error.code === "PERMISSION_DENIED") {
                showFatalError("PERMISSION DENIED / ไม่มีสิทธิ์เข้าถึงข้อมูล");
            } else {
                showFatalError("CONNECTION ERROR / การเชื่อมต่อล้มเหลว");
            }
        });
});

// ============================================
// ฟังก์ชันจัดการ Duty (แยกมาเพื่อให้โค้ดสะอาด)
// ============================================
function initDutySystem(ref, els) {
    let isOnDuty = localStorage.getItem("isOnDuty") === "true";
    let currentSessionKey = localStorage.getItem("currentSessionKey");

    // Helper: เล่นเสียง
    const playClick = () => { if(els.clickSound) els.clickSound.play().catch(()=>{}); };

    // Setup ปุ่ม
    if(els.startBtn && els.endBtn) {
        els.startBtn.disabled = isOnDuty;
        els.endBtn.disabled = !isOnDuty;

        // กดเริ่มงาน
        els.startBtn.onclick = function() {
            if(isOnDuty) return;
            const startTime = new Date().toISOString();
            
            // Push ข้อมูลใหม่
            const newLog = ref.child("dutyLogs").push();
            newLog.set({
                startTime: startTime,
                action: "เริ่มปฏิบัติหน้าที่ 🚨"
            }).then(() => {
                isOnDuty = true;
                currentSessionKey = newLog.key;
                localStorage.setItem("isOnDuty", "true");
                localStorage.setItem("currentSessionKey", currentSessionKey);
                
                els.startBtn.disabled = true;
                els.endBtn.disabled = false;
                playClick();
            });
        };

        // กดออกเวร
        els.endBtn.onclick = function() {
            if(!isOnDuty) return;
            const endTime = new Date().toISOString();

            if (currentSessionKey) {
                ref.child("dutyLogs/" + currentSessionKey).update({
                    endTime: endTime,
                    action: "ออกเวร ✅"
                }).then(() => {
                    isOnDuty = false;
                    currentSessionKey = null;
                    localStorage.removeItem("isOnDuty");
                    localStorage.removeItem("currentSessionKey");
                    
                    els.startBtn.disabled = false;
                    els.endBtn.disabled = true;
                    playClick();
                });
            } else {
                // กรณี Error ไม่มี Key เก่า (Force Reset)
                isOnDuty = false;
                localStorage.removeItem("isOnDuty");
                els.startBtn.disabled = false;
                els.endBtn.disabled = true;
            }
        };
    }

    // Load Logs (Realtime)
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        const val = snap.val();
        if(els.logs) {
            const li = document.createElement("li");
            const timeObj = new Date(val.startTime);
            const timeStr = timeObj.toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            
            li.innerHTML = `<span style="color:#00ccff">[${timeStr}]</span> ${val.action}`;
            els.logs.prepend(li); // แทรกบนสุด
        }
    });
}

// ============================================
// ฟังก์ชันหน้าจอ Error (Error 404 Overlay)
// ============================================
function showFatalError(message) {
    // สร้าง Overlay ถ้ายังไม่มี
    let overlay = document.getElementById("error-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "error-overlay";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="text-align:center;">
            <h1 class="glitch-text">ERROR 404</h1>
            <p style="color:white; font-size:1.5rem; margin-top:10px;">${message}</p>
            <button id="retryBtn" style="margin-top:20px; padding:10px 20px; font-size:1.2rem; cursor:pointer; background:red; color:white; border:none;">
                RESET SYSTEM (RE-LOGIN)
            </button>
        </div>
    `;

    // ปุ่ม Reset จะล้าง LocalStorage เพื่อให้เริ่มใหม่ได้
    document.getElementById("retryBtn").onclick = () => {
        localStorage.clear();
        window.location.reload(); // รีโหลดหน้าเว็บเพื่อให้ถาม ID ใหม่
    };
    
    // Disable interaction with background
    document.body.style.overflow = "hidden";
}