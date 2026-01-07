// ====== fb.js (Dynamic ID Support) ======

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

// ฟังก์ชันแปลงเวลา
function parseDuration(durationStr) {
    const match = durationStr && durationStr.match(/(\d+)\s*ชั่วโมง\s*(\d+)\s*นาที\s*(\d+)\s*วินาที/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
}

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. ระบุตัวตน: ตรวจสอบว่าใคร Login อยู่?
    // ==========================================
    // พยายามดึง ID จาก LocalStorage ที่หน้า Login บันทึกไว้
    let currentId = localStorage.getItem("officerId");

    // [DEBUG MODE] ถ้าไม่มี ID (เช่นเปิดไฟล์ตรงๆ) ให้ถาม หรือใช้ค่า Default
    if (!currentId) {
        // ลองหาจาก badgeId เผื่อบันทึกผิด key
        currentId = localStorage.getItem("badgeId");
        
        // ถ้ายังไม่มีอีก ให้ถาม User เลย (เฉพาะช่วงทดสอบ)
        if (!currentId) {
            currentId = prompt("System Debug: กรุณากรอก Officer ID เพื่อจำลองการ Login (เช่น 1, 301, 14002):", "14002");
            if (currentId) {
                localStorage.setItem("officerId", currentId);
            } else {
                alert("ไม่พบข้อมูลผู้ใช้ กรุณา Login ใหม่");
                window.location.href = "index.html"; // ดีดกลับหน้า Login
                return; 
            }
        }
    }

    // กำหนด Path ไปยัง User คนนั้นโดยเฉพาะ
    const userPath = "Users/" + currentId;
    const officerRef = db.ref(userPath);

    console.log("Loading data for Officer ID:", currentId);
    console.log("Database Path:", userPath);

    // ==========================================
    // 2. ดึงข้อมูล User มาแสดง (Profile)
    // ==========================================
    const els = {
        userInfo: document.getElementById("userInfo"), // ใต้ชื่อ (Rank | Callsign | ID)
        currentOfficer: document.getElementById("currentOfficer"), // ชื่อใหญ่
        info: document.getElementById("info"), // ในกล่อง Status
        time: document.getElementById("time"),
        logoRoot: document.getElementById("logoRoot"),
        startBtn: document.getElementById("startDuty"),
        endBtn: document.getElementById("endDuty"),
        logs: document.getElementById("logs"),
        totalTime: document.getElementById("totalTime"),
        clickSound: document.getElementById("clickSound")
    };

    officerRef.once("value").then(snapshot => {
        const user = snapshot.val();
        
        if (user) {
            // บันทึกข้อมูลล่าสุดลงเครื่อง
            localStorage.setItem("name", user.name || "");
            localStorage.setItem("rank", user.rank || "");
            localStorage.setItem("callsign", user.callsign || "");
            localStorage.setItem("badgeId", user.badgeId || user.officerId);

            // --- แสดงผล ---
            // 1. ชื่อใหญ่บนหัว
            if(els.currentOfficer) els.currentOfficer.textContent = user.name || "Unknown Officer";

            // 2. ข้อมูลย่อย (Rank | Callsign | BadgeID)
            const rankShow = user.rank || "Officer";
            const callsignShow = user.callsign || "NO-CODE";
            const idShow = user.badgeId || user.officerId || currentId;
            
            if(els.userInfo) {
                els.userInfo.textContent = `${rankShow} | ${callsignShow} | ${idShow}`;
            }

            // 3. ชื่อในกล่อง Status
            if(els.info) els.info.textContent = `${rankShow} ${user.name}`;

            // 4. เวลา Login
            if(els.time) els.time.textContent = user.loginTime || "N/A";

            // 5. รูปโปรไฟล์ (Check base64)
            if(els.logoRoot) {
                if (user.profilePicBase64 && user.profilePicBase64.startsWith("data:image")) {
                    els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    // ถ้าไม่มีรูป ให้แสดงตัวอักษรย่อ
                    els.logoRoot.textContent = (user.name || "SP").substring(0, 2).toUpperCase();
                    els.logoRoot.style.background = "#005580";
                    els.logoRoot.style.display = "flex";
                    els.logoRoot.style.alignItems = "center";
                    els.logoRoot.style.justifyContent = "center";
                }
            }

        } else {
            console.error("ไม่พบข้อมูลที่ path: " + userPath);
            alert(`Error: ไม่พบข้อมูล User ID: ${currentId} ในฐานข้อมูล`);
        }
    });

    // ==========================================
    // 3. ระบบ Duty (On/Off)
    // ==========================================
    let isOnDuty = localStorage.getItem("isOnDuty") === "true";
    let currentSessionKey = localStorage.getItem("currentSessionKey");

    // Set ปุ่มตอนโหลดหน้า
    if(els.startBtn && els.endBtn) {
        els.startBtn.disabled = isOnDuty;
        els.endBtn.disabled = !isOnDuty;
    }

    // ฟังก์ชันเริ่มงาน
    window.startDuty = function() {
        if(isOnDuty) return;
        
        const startTime = new Date().toISOString();
        // บันทึกลง dutyLogs ภายใน Users/ID/dutyLogs
        const newLogRef = officerRef.child("dutyLogs").push();
        
        newLogRef.set({
            startTime: startTime,
            action: "เริ่มปฏิบัติหน้าที่ 🚨"
        });

        isOnDuty = true;
        currentSessionKey = newLogRef.key;
        localStorage.setItem("isOnDuty", "true");
        localStorage.setItem("currentSessionKey", currentSessionKey);

        els.startBtn.disabled = true;
        els.endBtn.disabled = false;
        playSound();
        sendDiscordWebhook("ON DUTY");
    };

    // ฟังก์ชันออกเวร
    window.endDuty = function() {
        if(!isOnDuty) return;

        const endTime = new Date().toISOString();
        
        // ไปดึง Log ตัวปัจจุบันมาคำนวณเวลา
        officerRef.child("dutyLogs/" + currentSessionKey).once("value", snap => {
            const data = snap.val();
            let durationStr = "ไม่ทราบเวลา";

            if(data && data.startTime) {
                const diff = new Date(endTime) - new Date(data.startTime);
                // แปลง ms เป็น ชม. นาที
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                durationStr = `${h} ชั่วโมง ${m} นาที ${s} วินาที`;
            }

            // อัปเดตข้อมูลกลับไป
            officerRef.child("dutyLogs/" + currentSessionKey).update({
                endTime: endTime,
                duration: durationStr,
                action: "ออกเวร ✅"
            });

            // Reset
            isOnDuty = false;
            currentSessionKey = null;
            localStorage.removeItem("isOnDuty");
            localStorage.removeItem("currentSessionKey");

            els.startBtn.disabled = false;
            els.endBtn.disabled = true;
            playSound();
            sendDiscordWebhook("OFF DUTY");
        });
    };

    // เชื่อมปุ่ม
    if(els.startBtn) els.startBtn.addEventListener("click", window.startDuty);
    if(els.endBtn) els.endBtn.addEventListener("click", window.endDuty);

    // ==========================================
    // 4. Realtime Logs (แสดงผลสด)
    // ==========================================
    officerRef.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        const val = snap.val();
        const li = document.createElement("li");
        const time = new Date(val.startTime).toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
        
        li.innerHTML = `<span style="color:#00ccff">[${time}]</span> ${val.action} ${val.duration ? `(${val.duration})` : ''}`;
        
        // ใส่บนสุด
        if(els.logs) els.logs.prepend(li);
    });

    // ==========================================
    // Helper Functions
    // ==========================================
    function playSound() {
        if(els.clickSound) els.clickSound.play().catch(()=>{});
    }

    function sendDiscordWebhook(status) {
        // ใส่โค้ด Webhook ตรงนี้ (ใช้ User ID ปัจจุบันส่ง)
        // ...
    }

});