// ====== fb.js (Calculates Total History Time) ======
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

            // 2. *** คำนวณเวลารวมทั้งหมดจาก Logs ในอดีต ***
            let totalPastMilliseconds = 0;
            if (user.dutyLogs) {
                Object.values(user.dutyLogs).forEach(log => {
                    // เอาเฉพาะ Log ที่จบไปแล้ว (มีทั้ง startTime และ endTime)
                    if (log.startTime && log.endTime) {
                        const start = new Date(log.startTime).getTime();
                        const end = new Date(log.endTime).getTime();
                        totalPastMilliseconds += (end - start);
                    }
                });
            }
            // บันทึกเวลาอดีตลงเครื่อง เพื่อให้ ck.js เอาไปบวกต่อ
            localStorage.setItem("totalPastTime_" + currentId, totalPastMilliseconds);

            // 3. เริ่มระบบปุ่ม
            initDutySystem(officerRef, els, currentId);
        }
    });
});

function initDutySystem(ref, els, id) {
    const updateUI = () => {
        const currentSessionKey = localStorage.getItem("session_" + id);
        const isOnDuty = (currentSessionKey !== null && currentSessionKey !== "");
        const storedStartTime = localStorage.getItem("dutyStartTime_" + id);

        // ปรับสถานะปุ่ม
        if(els.startBtn) {
            els.startBtn.disabled = isOnDuty;
            els.startBtn.style.opacity = isOnDuty ? "0.3" : "1";
            els.startBtn.style.cursor = isOnDuty ? "not-allowed" : "pointer";
        }
        if(els.endBtn) {
            els.endBtn.disabled = !isOnDuty;
            els.endBtn.style.opacity = !isOnDuty ? "0.3" : "1";
            els.endBtn.style.cursor = !isOnDuty ? "not-allowed" : "pointer";
        }

        // แสดงเวลาเริ่มงาน
        if (storedStartTime && els.time) {
            const dateObj = new Date(storedStartTime);
            els.time.textContent = `${dateObj.toLocaleTimeString('th-TH')} (${dateObj.toLocaleDateString('th-TH')})`;
        } else if (els.time && !isOnDuty) {
            els.time.textContent = "--:--:--";
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
            
            const newRef = ref.child("dutyLogs").push();
            newRef.set({ startTime: timeStr, action: "เข้าเวรปฏิบัติหน้าที่ 🚨" }).then(() => {
                localStorage.setItem("session_" + id, newRef.key);
                localStorage.setItem("dutyStartTime_" + id, timeStr);
                updateUI();
                if(els.clickSound) els.clickSound.play().catch(()=>{});
            });
        });
    }

    // ปุ่ม End
    if(els.endBtn) {
        const newEndBtn = els.endBtn.cloneNode(true);
        els.endBtn.parentNode.replaceChild(newEndBtn, els.endBtn);
        els.endBtn = newEndBtn;

        els.endBtn.addEventListener("click", () => {
            const now = new Date().toISOString();
            const currentSessionKey = localStorage.getItem("session_" + id);
            
            if(currentSessionKey) {
                ref.child("dutyLogs/" + currentSessionKey).update({ endTime: now, action: "ออกเวร ✅" }).then(() => {
                    localStorage.removeItem("session_" + id);
                    localStorage.removeItem("dutyStartTime_" + id);
                    updateUI();
                    if(els.clickSound) els.clickSound.play().catch(()=>{});
                });
            } else {
                // บังคับ Reset ถ้าหาคีย์ไม่เจอ
                localStorage.removeItem("session_" + id);
                localStorage.removeItem("dutyStartTime_" + id);
                updateUI();
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
            if(val.action.includes("ออก")) color = "#ff3333";
            if(val.action.includes("เข้า")) color = "#00ff00";

            li.innerHTML = `<span style="color:${color}">[${timeStr}]</span> ${val.action}`;
            els.logs.prepend(li);
        }
    });
}