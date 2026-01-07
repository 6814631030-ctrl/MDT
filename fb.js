// ====== fb.js (Final Fix: Auto Reload on Log out) ======
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
    
    // Elements Reference
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

    officerRef.on("value", snapshot => {
        const user = snapshot.val();
        if (user) {
            // 1. แสดงข้อมูลพื้นฐาน
            const name = user.name || "Unknown";
            const rank = user.rank || "Officer";
            
            if(els.currentOfficer) els.currentOfficer.textContent = name;
            if(els.info) els.info.textContent = `${rank} ${name}`;
            if(els.userInfo) els.userInfo.textContent = `${rank} | ${user.callsign || '-'} | ID: ${currentId}`;
            
            if(els.logoRoot) {
                if (user.profilePicBase64 && user.profilePicBase64.length > 50) {
                    els.logoRoot.innerHTML = `<img src="${user.profilePicBase64}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    els.logoRoot.textContent = name.substring(0,2).toUpperCase();
                }
            }

            // 2. คำนวณเวลาเก่า
            let totalPastMilliseconds = 0;
            if (user.dutyLogs) {
                Object.values(user.dutyLogs).forEach(log => {
                    if (log.startTime && log.endTime) {
                        const start = new Date(log.startTime).getTime();
                        const end = new Date(log.endTime).getTime();
                        totalPastMilliseconds += (end - start);
                    }
                });
            }
            localStorage.setItem("totalPastTime_" + currentId, totalPastMilliseconds);

            // 3. เริ่มระบบปุ่ม
            initDutySystem(officerRef, els, currentId);
        }
    });
});

function initDutySystem(ref, els, id) {
    // ฟังก์ชันอัปเดตหน้าจอ
    const updateUI = () => {
        // เช็คสถานะจาก LocalStorage
        const currentSessionKey = localStorage.getItem("session_" + id);
        const isOnDuty = (currentSessionKey !== null && currentSessionKey !== "");

        // --- 1. ปุ่ม Start (เข้าเวร) ---
        if(els.startBtn) {
            // ปลดล็อค pointer-events เพื่อไม่ให้ปุ่มตาย
            els.startBtn.style.pointerEvents = "auto"; 
            
            if (isOnDuty) {
                // ถ้าเข้าเวรอยู่: ปุ่ม Start เป็นสีเทา
                els.startBtn.disabled = true;
                els.startBtn.style.opacity = "0.5";
                els.startBtn.style.filter = "grayscale(100%)";
                els.startBtn.innerHTML = "ON DUTY (ทำงานอยู่)";
                els.startBtn.style.border = "1px solid #555";
            } else {
                // ถ้าออกเวรแล้ว: ปุ่ม Start เป็นสีปกติ พร้อมกด
                els.startBtn.disabled = false;
                els.startBtn.style.opacity = "1";
                els.startBtn.style.filter = "none";
                els.startBtn.innerHTML = "🚨 ON DUTY / เริ่มงาน";
                els.startBtn.style.border = "1px solid #00ff00";
                els.startBtn.style.color = "#00ff00";
            }
        }

        // --- 2. ปุ่ม End (ออกเวร) ---
        if(els.endBtn) {
            // ปลดล็อค pointer-events เพื่อไม่ให้ปุ่มตาย
            els.endBtn.style.pointerEvents = "auto";

            if (!isOnDuty) {
                // ถ้าออกเวรแล้ว: ปุ่ม End เป็นสีเทา
                els.endBtn.disabled = true;
                els.endBtn.style.opacity = "0.5";
                els.endBtn.style.filter = "grayscale(100%)";
                els.endBtn.style.border = "1px solid #555";
            } else {
                // ถ้าเข้าเวรอยู่: ปุ่ม End เป็นสีแดง พร้อมกด
                els.endBtn.disabled = false;
                els.endBtn.style.opacity = "1";
                els.endBtn.style.filter = "none";
                els.endBtn.style.border = "1px solid #ff0000";
                els.endBtn.style.color = "#ff0000";
            }
        }

        // --- 3. เวลาเริ่มงาน ---
        const storedStartTime = localStorage.getItem("dutyStartTime_" + id);
        if (storedStartTime && els.time) {
            const dateObj = new Date(storedStartTime);
            els.time.textContent = `${dateObj.toLocaleTimeString('th-TH')} (${dateObj.toLocaleDateString('th-TH')})`;
            els.time.style.color = "#00ff00";
        } else if (els.time) {
            els.time.textContent = "--:--:--";
            els.time.style.color = "#aaa";
        }
    };

    updateUI();

    // ปุ่ม Start
    if(els.startBtn) {
        const newStartBtn = els.startBtn.cloneNode(true);
        els.startBtn.parentNode.replaceChild(newStartBtn, els.startBtn);
        els.startBtn = newStartBtn;
        
        els.startBtn.addEventListener("click", () => {
            const now = new Date();
            const timeStr = now.toISOString();
            
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            const newRef = ref.child("dutyLogs").push();
            newRef.set({ startTime: timeStr, action: "เข้าเวรปฏิบัติหน้าที่ 🚨" }).then(() => {
                localStorage.setItem("session_" + id, newRef.key);
                localStorage.setItem("dutyStartTime_" + id, timeStr);
                
                updateUI(); 
                // บังคับ ck.js ทำงาน
                if(typeof updateDutyTimer === "function") updateDutyTimer();
            });
        });
    }

    // ปุ่ม End
    if(els.endBtn) {
        const newEndBtn = els.endBtn.cloneNode(true);
        els.endBtn.parentNode.replaceChild(newEndBtn, els.endBtn);
        els.endBtn = newEndBtn;

        els.endBtn.addEventListener("click", () => {
            // เล่นเสียง
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            const now = new Date().toISOString();
            const currentSessionKey = localStorage.getItem("session_" + id);

            // ฟังก์ชันสำหรับเคลียร์ค่าและรีโหลด
            const performLogout = () => {
                localStorage.removeItem("session_" + id);
                localStorage.removeItem("dutyStartTime_" + id);
                updateUI();
                
                // *** เพิ่มการรีโหลดหน้าจอเพื่อแก้ UI ค้าง ***
                setTimeout(() => {
                    window.location.reload(); 
                }, 500); // รอ 0.5 วินาทีแล้วรีโหลดเลย
            };

            if(currentSessionKey) {
                ref.child("dutyLogs/" + currentSessionKey).update({ endTime: now, action: "ออกเวร / จบการทำงาน ✅" })
                .then(() => {
                    performLogout();
                })
                .catch(() => {
                    // ถ้า Error ก็บังคับออกเลย
                    performLogout();
                });
            } else {
                // ถ้าหา Key ไม่เจอ ก็บังคับออกเลย
                performLogout();
            }
        });
    }

    // Realtime Logs
    ref.child("dutyLogs").off(); 
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        if(els.logs && !document.getElementById(snap.key)) {
            const val = snap.val();
            const li = document.createElement("li");
            li.id = snap.key;
            
            const timeObj = new Date(val.startTime);
            const timeStr = timeObj.toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            
            let color = "#00ccff"; 
            if(val.action && val.action.includes("ออก")) color = "#ff3333";
            if(val.action && val.action.includes("เข้า")) color = "#00ff00";

            li.innerHTML = `<span style="color:${color}">[${timeStr}]</span> ${val.action}`;
            els.logs.prepend(li);
        }
    });
}