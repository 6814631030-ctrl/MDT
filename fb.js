// ====== fb.js (With ERROR 404) ======

const firebaseConfig = {
    apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
    authDomain: "law-enforment.firebaseapp.com",
    databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "law-enforment",
    storageBucket: "law-enforment.firebasestorage.app",
    messagingSenderId: "328110715362",
    appId: "1:328110715362:web:6883f14af8be404ecf09bb",
    measurementId: "G-1X08RZGGEF"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. ตรวจสอบ ID
    let currentId = localStorage.getItem("officerId");

    // ถ้าไม่มี ID ให้ลองถามดู (Debug Mode)
    if (!currentId) {
        currentId = prompt("System Debug: กรุณากรอก Officer ID (เช่น 1, 14002):");
    }

    // ถ้ายังไม่มี ID อีก -> เรียก Error 404 ทันที
    if (!currentId) {
        showFatalError("NO IDENTIFICATION FOUND / ไม่พบข้อมูลการยืนยันตัวตน");
        return; 
    }

    const userPath = "Users/" + currentId;
    const officerRef = db.ref(userPath);

    const els = {
        userInfo: document.getElementById("userInfo"), 
        currentOfficer: document.getElementById("currentOfficer"),
        info: document.getElementById("info"),
        time: document.getElementById("time"),
        logoRoot: document.getElementById("logoRoot"),
        startBtn: document.getElementById("startDuty"),
        endBtn: document.getElementById("endDuty"),
        callsignInput: document.getElementById("callsignInput"),
        updateBtn: document.getElementById("updateCallsignBtn"),
        logs: document.getElementById("logs")
    };

    // 2. ดึงข้อมูล User
    officerRef.once("value").then(snapshot => {
        const user = snapshot.val();
        
        if (user) {
            // --- เจอข้อมูล (ทำงานปกติ) ---
            localStorage.setItem("name", user.name || "");
            localStorage.setItem("rank", user.rank || "");
            localStorage.setItem("badgeId", user.badgeId || user.officerId);
            localStorage.setItem("callsign", user.callsign || "");

            if(els.currentOfficer) els.currentOfficer.textContent = user.name || "Unknown";
            
            const idShow = user.officerId || user.badgeId || currentId;
            if(els.userInfo) els.userInfo.textContent = `${user.rank || ''} | ${user.callsign || ''} | ID: ${idShow}`;
            if(els.info) els.info.textContent = user.name;
            if(els.time) els.time.textContent = user.loginTime || "N/A";

            if(els.logoRoot) {
                if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
                    els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    els.logoRoot.textContent = (user.name || "SP").substring(0, 2).toUpperCase();
                }
            }

            // โหลดระบบ Duty ต่อ
            initDutySystem(officerRef, els);

        } else {
            // --- ไม่เจอข้อมูลใน Database -> เรียก Error 404 ---
            showFatalError("DATA NOT FOUND IN DATABASE / ไม่พบข้อมูลในระบบ");
        }
    }).catch(err => {
        // --- เกิดข้อผิดพลาดการเชื่อมต่อ -> เรียก Error 404 ---
        console.error(err);
        showFatalError("CONNECTION FAILED / การเชื่อมต่อล้มเหลว");
    });
});

// ==========================================
// ฟังก์ชันเรียกหน้าจอแดงเดือด (Error 404)
// ==========================================
function showFatalError(reason) {
    // 1. สร้างหน้าจอ Overlay สีดำ
    const overlay = document.createElement("div");
    overlay.id = "error-overlay";
    overlay.innerHTML = `
        <h1>ERROR 404</h1>
        <p>${reason}</p>
        <button onclick="window.location.href='index.html'">RETURN TO LOGIN</button>
    `;
    document.body.appendChild(overlay);

    // 2. ปิดการใช้งานปุ่มทุกอย่างข้างหลัง (Disable All)
    const allButtons = document.querySelectorAll("button");
    const allInputs = document.querySelectorAll("input");
    const allLinks = document.querySelectorAll("a");

    allButtons.forEach(btn => {
        if(btn.parentElement.id !== "error-overlay") { // ยกเว้นปุ่มในหน้า Error
            btn.disabled = true;
            btn.style.opacity = "0.2";
            btn.style.pointerEvents = "none";
        }
    });

    allInputs.forEach(inp => {
        inp.disabled = true;
        inp.style.opacity = "0.2";
    });
    
    allLinks.forEach(link => {
        link.style.pointerEvents = "none";
        link.style.cursor = "default";
    });

    // เล่นเสียง Error ถ้ามีไฟล์เสียง
    // const audio = new Audio('error.mp3'); audio.play();
}

// ==========================================
// ระบบ Duty (แยกออกมาให้ดูง่าย)
// ==========================================
function initDutySystem(ref, els) {
    let isOnDuty = localStorage.getItem("isOnDuty") === "true";
    let currentSessionKey = localStorage.getItem("currentSessionKey");

    if(els.startBtn && els.endBtn) {
        els.startBtn.disabled = isOnDuty;
        els.endBtn.disabled = !isOnDuty;

        els.startBtn.onclick = () => {
            const startTime = new Date().toISOString();
            const newLogRef = ref.child("dutyLogs").push();
            newLogRef.set({ startTime, action: "เริ่มปฏิบัติหน้าที่ 🚨" });
            
            isOnDuty = true;
            currentSessionKey = newLogRef.key;
            localStorage.setItem("isOnDuty", "true");
            localStorage.setItem("currentSessionKey", currentSessionKey);
            
            els.startBtn.disabled = true;
            els.endBtn.disabled = false;
        };

        els.endBtn.onclick = () => {
            const endTime = new Date().toISOString();
            ref.child("dutyLogs/" + currentSessionKey).update({ endTime, action: "ออกเวร ✅" });
            
            isOnDuty = false;
            currentSessionKey = null;
            localStorage.removeItem("isOnDuty");
            localStorage.removeItem("currentSessionKey");
            
            els.startBtn.disabled = false;
            els.endBtn.disabled = true;
        };
    }
    
    // Realtime Logs
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        const val = snap.val();
        if(els.logs) {
            const li = document.createElement("li");
            const time = new Date(val.startTime).toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            li.innerHTML = `<span style="color:#00ccff">[${time}]</span> ${val.action}`;
            els.logs.prepend(li);
        }
    });
}