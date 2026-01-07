// ====== fb.js (Logic บันทึกเวลาและการกดปุ่ม) ======
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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
    let currentId = localStorage.getItem("officerId");
    if (!currentId) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        window.location.href = "index.html"; 
        return;
    }

    const officerRef = db.ref("Users/" + currentId);
    
    // Elements
    const els = {
        userInfo: document.getElementById("userInfo"), 
        currentOfficer: document.getElementById("currentOfficer"),
        info: document.getElementById("info"),
        time: document.getElementById("time"), // ช่อง Session Start
        logoRoot: document.getElementById("logoRoot"),
        startBtn: document.getElementById("startDuty"),
        endBtn: document.getElementById("endDuty"),
        logs: document.getElementById("logs"),
        clickSound: document.getElementById("clickSound")
    };

    officerRef.on("value", snapshot => {
        const user = snapshot.val();
        if (user) {
            const name = user.name || "Unknown";
            const rank = user.rank || "Officer";
            
            if(els.currentOfficer) els.currentOfficer.textContent = name;
            if(els.info) els.info.textContent = `${rank} ${name}`;
            if(els.userInfo) els.userInfo.textContent = `${rank} | ${user.callsign || '-'} | ID: ${currentId}`;
            
            // แสดงรูปภาพ
            if(els.logoRoot) {
                if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
                    els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    els.logoRoot.textContent = name.substring(0,2).toUpperCase();
                }
            }
            
            initDutySystem(officerRef, els, currentId);
        }
    });
});

function initDutySystem(ref, els, id) {
    let isOnDuty = localStorage.getItem("isOnDuty_" + id) === "true";
    let currentKey = localStorage.getItem("session_" + id);

    // ฟังก์ชันอัปเดต UI ปุ่มและเวลาเริ่ม
    const updateUI = () => {
        if(els.startBtn) els.startBtn.disabled = isOnDuty;
        if(els.endBtn) els.endBtn.disabled = !isOnDuty;

        // ดึงเวลาที่เริ่มกด On Duty มาแสดงในช่อง Session Start
        const storedStartTime = localStorage.getItem("dutyStartTime_" + id);
        if (storedStartTime && els.time) {
            const dateObj = new Date(storedStartTime);
            // แสดงผลแบบ: 10:30:00 (07/01/2025)
            els.time.textContent = `${dateObj.toLocaleTimeString('th-TH')} (${dateObj.toLocaleDateString('th-TH')})`;
        } else if (els.time) {
            els.time.textContent = "--:--:--";
        }
    };
    updateUI();

    // --- กดเริ่มงาน (ON DUTY) ---
    if(els.startBtn) els.startBtn.onclick = () => {
        const now = new Date(); // เวลาปัจจุบัน
        const timeStr = now.toISOString();

        const newRef = ref.child("dutyLogs").push();
        newRef.set({ 
            startTime: timeStr, 
            action: "เข้าเวรปฏิบัติหน้าที่ 🚨" 
        }).then(() => {
            isOnDuty = true;
            currentKey = newRef.key;
            
            // Save LocalStorage (สำคัญมากสำหรับ Timer)
            localStorage.setItem("isOnDuty_" + id, "true");
            localStorage.setItem("session_" + id, currentKey);
            localStorage.setItem("dutyStartTime_" + id, timeStr); // บันทึกเวลาเริ่ม
            
            updateUI();
            if(els.clickSound) els.clickSound.play().catch(()=>{});
        });
    };

    // --- กดออกเวร (OFF DUTY) ---
    if(els.endBtn) els.endBtn.onclick = () => {
        const now = new Date().toISOString();
        if(currentKey) {
            ref.child("dutyLogs/" + currentKey).update({ 
                endTime: now, 
                action: "ออกเวร / จบการทำงาน ✅" 
            });
        }
        
        isOnDuty = false;
        currentKey = null;
        
        // Clear LocalStorage
        localStorage.removeItem("isOnDuty_" + id);
        localStorage.removeItem("session_" + id);
        localStorage.removeItem("dutyStartTime_" + id); // ลบเวลาเริ่ม
        
        updateUI();
        if(els.clickSound) els.clickSound.play().catch(()=>{});
    };

    // Realtime Logs
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        if(els.logs && !document.getElementById(snap.key)) {
            const val = snap.val();
            const li = document.createElement("li");
            li.id = snap.key;
            const time = new Date(val.startTime).toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            li.innerHTML = `<span style="color:#00ccff">[${time}]</span> ${val.action}`;
            els.logs.prepend(li);
        }
    });
}
// // ====== fb.js (Final Version) ======
// const firebaseConfig = {
//     apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
//     authDomain: "law-enforment.firebaseapp.com",
//     databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/",
//     projectId: "law-enforment",
//     storageBucket: "law-enforment.appspot.com",
//     messagingSenderId: "328110715362",
//     appId: "1:328110715362:web:6883f14af8be404ecf09bb",
//     measurementId: "G-1X08RZGGEF"
// };

// if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
// const db = firebase.database();

// document.addEventListener("DOMContentLoaded", () => {
//     // 1. รับค่า ID จากที่หน้า Login บันทึกไว้
//     let currentId = localStorage.getItem("officerId");

//     // Check: ถ้าไม่มี ID ให้ดีดกลับไป Login
//     if (!currentId) {
//         alert("กรุณาเข้าสู่ระบบก่อน / Please Login First");
//         window.location.href = "index.html"; 
//         return;
//     }

//     console.log(`Loading Data for ID: ${currentId}`);
//     const officerRef = db.ref("Users/" + currentId);

//     // Elements
//     const els = {
//         userInfo: document.getElementById("userInfo"), 
//         currentOfficer: document.getElementById("currentOfficer"),
//         info: document.getElementById("info"),
//         time: document.getElementById("time"),
//         logoRoot: document.getElementById("logoRoot"),
//         startBtn: document.getElementById("startDuty"),
//         endBtn: document.getElementById("endDuty"),
//         logs: document.getElementById("logs"),
//         clickSound: document.getElementById("clickSound")
//     };

//     // 2. ดึงข้อมูล
//     officerRef.on("value", snapshot => {
//         const user = snapshot.val();
//         if (user) {
//             // แสดงผล
//             const name = user.name || "Unknown";
//             const rank = user.rank || "Officer";
            
//             if(els.currentOfficer) els.currentOfficer.textContent = name;
//             if(els.info) els.info.textContent = `${rank} ${name}`;
//             if(els.userInfo) els.userInfo.textContent = `${rank} | ${user.callsign || '-'} | ID: ${currentId}`;
//             if(els.time) els.time.textContent = user.loginTime || "-";

//             // รูปภาพ
//             if(els.logoRoot) {
//                 if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
//                     els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
//                 } else {
//                     els.logoRoot.textContent = name.substring(0,2).toUpperCase();
//                 }
//             }
            
//             // เริ่มระบบ Duty (ส่ง ID ไปด้วย)
//             initDutySystem(officerRef, els, currentId);
//         } else {
//              alert("ไม่พบข้อมูล User ID นี้ในระบบ");
//              // window.location.href = "index.html";
//         }
//     });
// });

// // ฟังก์ชัน Duty (เหมือนเดิม)
// function initDutySystem(ref, els, id) {
//     let isOnDuty = localStorage.getItem("isOnDuty_" + id) === "true";
//     let currentKey = localStorage.getItem("session_" + id);

//     const updateBtns = () => {
//         if(els.startBtn) els.startBtn.disabled = isOnDuty;
//         if(els.endBtn) els.endBtn.disabled = !isOnDuty;
//     };
//     updateBtns();

//     if(els.startBtn) els.startBtn.onclick = () => {
//         const now = new Date().toISOString();
//         const newRef = ref.child("dutyLogs").push();
//         newRef.set({ startTime: now, action: "เข้าเวร 🚨" }).then(() => {
//             isOnDuty = true;
//             currentKey = newRef.key;
//             localStorage.setItem("isOnDuty_" + id, "true");
//             localStorage.setItem("session_" + id, currentKey);
//             updateBtns();
//             if(els.clickSound) els.clickSound.play().catch(()=>{});
//         });
//     };

//     if(els.endBtn) els.endBtn.onclick = () => {
//         const now = new Date().toISOString();
//         if(currentKey) {
//             ref.child("dutyLogs/" + currentKey).update({ endTime: now, action: "ออกเวร ✅" });
//         }
//         isOnDuty = false;
//         currentKey = null;
//         localStorage.removeItem("isOnDuty_" + id);
//         localStorage.removeItem("session_" + id);
//         updateBtns();
//         if(els.clickSound) els.clickSound.play().catch(()=>{});
//     };

//     // Realtime Logs
//     ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
//         if(els.logs && !document.getElementById(snap.key)) {
//             const val = snap.val();
//             const li = document.createElement("li");
//             li.id = snap.key;
//             const time = new Date(val.startTime).toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
//             li.innerHTML = `<span style="color:#00ccff">[${time}]</span> ${val.action}`;
//             els.logs.prepend(li);
//         }
//     });
// }