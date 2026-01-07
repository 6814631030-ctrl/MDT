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

// ====== fb.js (ส่วนฟังก์ชัน initDutySystem ที่แก้ไขแล้ว) ======

function initDutySystem(ref, els, id) {
    // ฟังก์ชันช่วยเช็คสถานะและปรับปุ่ม
    const updateUI = () => {
        // อ่านค่าสดๆ จาก LocalStorage ทุกครั้งที่อัปเดตปุ่ม
        const isOnDuty = localStorage.getItem("isOnDuty_" + id) === "true";
        const storedStartTime = localStorage.getItem("dutyStartTime_" + id);

        if(els.startBtn) els.startBtn.disabled = isOnDuty; // ถ้าเข้าเวรอยู่ -> ห้ามกดเริ่ม
        if(els.endBtn) els.endBtn.disabled = !isOnDuty;    // ถ้าเข้าเวรอยู่ -> ให้กดออกได้

        // แสดงเวลาเริ่มงาน
        if (storedStartTime && els.time) {
            const dateObj = new Date(storedStartTime);
            els.time.textContent = `${dateObj.toLocaleTimeString('th-TH')} (${dateObj.toLocaleDateString('th-TH')})`;
        } else if (els.time) {
            els.time.textContent = "--:--:--";
        }
    };

    // เรียกทำงานครั้งแรกเพื่อจัดหน้าตาปุ่ม
    updateUI();

    // --- ส่วนที่ 1: กดปุ่มเข้าเวร (Start Duty) ---
    if(els.startBtn) {
        // ลบ Event Listener เก่าออกก่อน (กันกดเบิ้ล)
        const newStartBtn = els.startBtn.cloneNode(true);
        els.startBtn.parentNode.replaceChild(newStartBtn, els.startBtn);
        els.startBtn = newStartBtn; // อัปเดต reference

        els.startBtn.addEventListener("click", () => {
            const now = new Date();
            const timeStr = now.toISOString();

            // ส่งข้อมูลขึ้น Firebase
            const newRef = ref.child("dutyLogs").push();
            newRef.set({ 
                startTime: timeStr, 
                action: "เข้าเวรปฏิบัติหน้าที่ 🚨" 
            }).then(() => {
                // บันทึก Key และสถานะลงเครื่อง
                localStorage.setItem("isOnDuty_" + id, "true");
                localStorage.setItem("session_" + id, newRef.key); // จำ Key ไว้ใช้ตอนออก
                localStorage.setItem("dutyStartTime_" + id, timeStr);
                
                updateUI(); // อัปเดตปุ่มทันที
                if(els.clickSound) els.clickSound.play().catch(()=>{});
            }).catch(err => alert("Error Start: " + err.message));
        });
    }

    // --- ส่วนที่ 2: กดปุ่มออกเวร (End Duty) ---
    if(els.endBtn) {
        // ลบ Event Listener เก่าออกก่อน
        const newEndBtn = els.endBtn.cloneNode(true);
        els.endBtn.parentNode.replaceChild(newEndBtn, els.endBtn);
        els.endBtn = newEndBtn; // อัปเดต reference

        els.endBtn.addEventListener("click", () => {
            const now = new Date().toISOString();
            
            // *** จุดสำคัญที่แก้: ดึง Key จาก LocalStorage โดยตรง ***
            const currentSessionKey = localStorage.getItem("session_" + id);

            if(currentSessionKey) {
                // อัปเดตเวลาออกที่ Key นั้น
                ref.child("dutyLogs/" + currentSessionKey).update({ 
                    endTime: now, 
                    action: "ออกเวร / จบการทำงาน ✅" 
                }).then(() => {
                    // เคลียร์ค่าในเครื่อง
                    localStorage.removeItem("isOnDuty_" + id);
                    localStorage.removeItem("session_" + id);
                    localStorage.removeItem("dutyStartTime_" + id);
                    
                    updateUI(); // อัปเดตปุ่มทันที
                    if(els.clickSound) els.clickSound.play().catch(()=>{});
                }).catch(err => alert("Error End: " + err.message));
            } else {
                // กรณีฉุกเฉิน: หา Key ไม่เจอ (แต่ปุ่มดันกดได้) ให้บังคับ Reset
                alert("ไม่พบ Session เก่า - ทำการรีเซ็ตระบบ");
                localStorage.removeItem("isOnDuty_" + id);
                updateUI();
            }
        });
    }

    // --- ส่วนที่ 3: Realtime Logs (ไม่แก้) ---
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