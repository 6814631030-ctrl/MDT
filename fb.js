// ====== fb.js (แก้ไขใหม่) ======

// 1. ตั้งค่า Firebase (ใช้ค่าเดิมของคุณ)
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

// 2. ฟังก์ชันแปลงเวลา
function parseDuration(durationStr) {
    const match = durationStr && durationStr.match(/(\d+)\s*ชั่วโมง\s*(\d+)\s*นาที\s*(\d+)\s*วินาที/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
}

// 3. เริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    
    // --- จุดสำคัญ: ตั้งค่า ID ให้ตรงกับ Database ของคุณ (ในรูปคือ 1) ---
    // ถ้าไม่มีใน localStorage ให้ใช้ "1" เป็นค่าเริ่มต้น (แก้จาก 4)
    window.officerId = localStorage.getItem("officerId") || "1";
    console.log("Current Officer ID:", window.officerId); // เช็คใน Console

    const officerRef = db.ref("Users/" + window.officerId);

    // ประกาศตัวแปร HTML Elements
    const elements = {
        logs: document.getElementById("logs"),
        startBtn: document.getElementById("startDuty"),
        endBtn: document.getElementById("endDuty"),
        totalTime: document.getElementById("totalTime"),
        userInfo: document.getElementById("userInfo"),      // ข้อความเล็กใต้ชื่อ
        currentOfficer: document.getElementById("currentOfficer"), // ชื่อตัวใหญ่
        info: document.getElementById("info"),              // ในกล่อง Status
        time: document.getElementById("time"),              // เวลา Login
        clickSound: document.getElementById("clickSound"),
        logoRoot: document.getElementById("logoRoot")
    };

    // --- ส่วนดึงข้อมูล User (User Profile) ---
    officerRef.once("value").then(snapshot => {
        const user = snapshot.val();
        
        if (user) {
            console.log("User Data Found:", user); // เช็คว่าเจอข้อมูลไหม
            
            // บันทึกค่าลงเครื่อง
            localStorage.setItem("officerId", user.officerId); // ควรเป็น 1
            localStorage.setItem("name", user.name);
            localStorage.setItem("rank", user.rank);
            localStorage.setItem("callsign", user.callsign);

            // แสดงผลหน้าเว็บ (แก้ปัญหา undefined)
            if(elements.currentOfficer) elements.currentOfficer.textContent = user.name || "Unknown Officer";
            
            // แสดง Rank | Callsign | ID
            if(elements.userInfo) {
                elements.userInfo.textContent = `${user.rank || ''} | ${user.callsign || 'No Callsign'} | ID: ${user.officerId}`;
            }

            // แสดงในกล่อง Status
            if(elements.info) elements.info.textContent = user.name;

            // แสดงโลโก้
            updateLogo(user);

            // แสดงเวลา Login
            if(elements.time) {
                // ถ้าใน DB มี loginTime ให้ใช้ ถ้าไม่มีให้ใช้เวลาปัจจุบัน
                elements.time.textContent = user.loginTime || new Date().toLocaleTimeString('th-TH');
            }

        } else {
            console.error("ไม่พบข้อมูล User ID: " + window.officerId);
            if(elements.currentOfficer) elements.currentOfficer.textContent = "USER NOT FOUND (ID wrong)";
        }
    }).catch(err => {
        console.error("Firebase Error:", err);
    });

    // --- ส่วนจัดการระบบ Duty (On/Off) ---
    let isOnDuty = localStorage.getItem("isOnDuty") === "true";
    let currentSessionKey = localStorage.getItem("currentSessionKey");

    // ปรับสถานะปุ่มตอนเริ่ม
    if(elements.startBtn && elements.endBtn) {
        elements.startBtn.disabled = isOnDuty;
        elements.endBtn.disabled = !isOnDuty;
    }

    // ฟังก์ชันเริ่มงาน
    window.startDuty = function() { // ทำให้เรียกใช้จาก HTML ได้ง่ายขึ้น
        if (isOnDuty) return alert("คุณเข้าเวรอยู่แล้ว!");
        
        const startTime = new Date().toISOString();
        const logRef = officerRef.child("dutyLogs").push({
            startTime: startTime,
            action: "เริ่มปฏิบัติหน้าที่ 🚨"
        });

        isOnDuty = true;
        currentSessionKey = logRef.key;
        localStorage.setItem("isOnDuty", "true");
        localStorage.setItem("currentSessionKey", currentSessionKey);

        elements.startBtn.disabled = true;
        elements.endBtn.disabled = false;
        playSound();
        
        // ส่ง Discord
        sendToDiscord("ON DUTY");
    };

    // ฟังก์ชันออกเวร
    window.endDuty = function() {
        if (!isOnDuty) return alert("คุณยังไม่ได้เข้าเวร!");
        
        const endTime = new Date().toISOString();
        
        officerRef.child("dutyLogs/" + currentSessionKey).once("value", snap => {
            const data = snap.val();
            let durationStr = "0 นาที";
            
            if (data && data.startTime) {
                const diff = new Date(endTime) - new Date(data.startTime);
                const hrs = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                durationStr = `${hrs} ชม. ${mins} นาที ${secs} วิ.`;
            }

            officerRef.child("dutyLogs/" + currentSessionKey).update({
                endTime: endTime,
                duration: durationStr,
                action: "ออกเวร ✅"
            });

            // Reset สถานะ
            isOnDuty = false;
            currentSessionKey = null;
            localStorage.removeItem("isOnDuty");
            localStorage.removeItem("currentSessionKey");

            elements.startBtn.disabled = false;
            elements.endBtn.disabled = true;
            playSound();
            
            // ส่ง Discord
            sendToDiscord("OFF DUTY");
        });
    };

    // เชื่อมปุ่ม
    if(elements.startBtn) elements.startBtn.onclick = window.startDuty;
    if(elements.endBtn) elements.endBtn.onclick = window.endDuty;

    // --- ส่วนแสดง Logs (Realtime) ---
    officerRef.child("dutyLogs").limitToLast(10).on("child_added", snapshot => {
        const val = snapshot.val();
        const li = document.createElement("li");
        
        // แปลงเวลาให้สวยงาม
        const timeStr = new Date(val.startTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
        
        li.innerHTML = `<span style="color:#00ccff">[${timeStr}]</span> ${val.action} ${val.duration ? `(รวม: ${val.duration})` : ''}`;
        
        // ใส่ไว้บนสุด
        if(elements.logs) elements.logs.prepend(li);
    });

    // --- Helper Functions ---
    function playSound() {
        if(elements.clickSound) elements.clickSound.play().catch(()=>{});
    }

    function updateLogo(user) {
        if(!elements.logoRoot) return;
        if(user.profilePicBase64) {
             elements.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
             elements.logoRoot.textContent = user.name.substring(0,2).toUpperCase();
        }
    }

    function sendToDiscord(action) {
        // ใส่โค้ด Discord Webhook เดิมของคุณตรงนี้
        // (ผมละไว้เพื่อไม่ให้ยาวเกินไป แต่ใส่ Logic เดิมได้เลย)
    }

});