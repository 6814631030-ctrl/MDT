// ====== fb.js (Auto Recovery & Unlocked Buttons) ======
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

            // 2. *** ระบบกู้คืนสถานะ (Auto Recovery) ***
            // เช็คว่าใน Database มี Log ล่าสุดที่ยังไม่จบไหม?
            let lastUnfinishedLogKey = null;
            let lastUnfinishedLogTime = null;
            let totalPastMilliseconds = 0;

            if (user.dutyLogs) {
                Object.keys(user.dutyLogs).forEach(key => {
                    const log = user.dutyLogs[key];
                    
                    // คำนวณเวลาเก่า
                    if (log.startTime && log.endTime) {
                        const s = new Date(log.startTime).getTime();
                        const e = new Date(log.endTime).getTime();
                        if(e > s) totalPastMilliseconds += (e - s);
                    }

                    // หา Log ที่ยังค้างอยู่ (มี start แต่ไม่มี end)
                    if (log.startTime && !log.endTime) {
                        lastUnfinishedLogKey = key;
                        lastUnfinishedLogTime = log.startTime;
                    }
                });
            }

            // บันทึกเวลาเก่ารวม
            localStorage.setItem("totalPastTime_" + currentId, totalPastMilliseconds);

            // ถ้าเจอ Log ค้างใน Database แต่ในเครื่องไม่มี Session -> กู้คืนทันที!
            if (lastUnfinishedLogKey && !localStorage.getItem("session_" + currentId)) {
                console.log("Found unfinished session, recovering...");
                localStorage.setItem("session_" + currentId, lastUnfinishedLogKey);
                localStorage.setItem("dutyStartTime_" + currentId, lastUnfinishedLogTime);
            }

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

        // --- ปุ่ม Start (ห้ามล็อคตาย แค่เปลี่ยนสี) ---
        if(els.startBtn) {
            if (isOnDuty) {
                // เข้าเวรอยู่ -> ทำปุ่มจางๆ พอ
                els.startBtn.style.opacity = "0.5";
                els.startBtn.innerHTML = "ON DUTY (ทำงานอยู่)";
                els.startBtn.style.color = "#00ff00";
                els.startBtn.style.border = "1px solid #00ff00";
            } else {
                // พร้อมเริ่ม -> ปุ่มปกติ
                els.startBtn.style.opacity = "1";
                els.startBtn.innerHTML = "🚨 ON DUTY / เริ่มงาน";
                els.startBtn.style.color = "";
                els.startBtn.style.border = "";
            }
        }

        // --- ปุ่ม End (ห้ามล็อคตาย! เพื่อให้กดแก้ปัญหาได้) ---
        if(els.endBtn) {
            // เอา disabled ออกให้หมด
            els.endBtn.disabled = false;
            els.endBtn.style.pointerEvents = "auto"; 
            
            if (!isOnDuty) {
                // ออกเวรแล้ว -> ทำปุ่มจางๆ
                els.endBtn.style.opacity = "0.3";
                els.endBtn.style.border = "1px solid #555";
            } else {
                // เข้าเวรอยู่ -> ปุ่มชัดๆ
                els.endBtn.style.opacity = "1";
                els.endBtn.style.border = "1px solid #ff0000";
                els.endBtn.style.color = "#ff0000";
            }
        }

        // เวลาเริ่ม
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
            // ถ้าเข้าเวรอยู่แล้ว ห้ามกดซ้ำ (แต่ไม่ล็อคปุ่ม)
            if(localStorage.getItem("session_" + id)) {
                alert("คุณเข้าเวรอยู่แล้วครับ! (You are already on duty)");
                return;
            }

            const now = new Date();
            const timeStr = now.toISOString();
            
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            const newRef = ref.child("dutyLogs").push();
            newRef.set({ startTime: timeStr, action: "เข้าเวรปฏิบัติหน้าที่ 🚨" }).then(() => {
                localStorage.setItem("session_" + id, newRef.key);
                localStorage.setItem("dutyStartTime_" + id, timeStr);
                updateUI();
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
            const now = new Date().toISOString();
            const currentSessionKey = localStorage.getItem("session_" + id);
            
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            if(currentSessionKey) {
                // 1. เคสปกติ: มี Session อยู่
                ref.child("dutyLogs/" + currentSessionKey).update({ endTime: now, action: "ออกเวร / จบการทำงาน ✅" }).then(() => {
                    localStorage.removeItem("session_" + id);
                    localStorage.removeItem("dutyStartTime_" + id);
                    updateUI();
                    if(typeof updateDutyTimer === "function") updateDutyTimer();
                });
            } else {
                // 2. เคสฉุกเฉิน: ไม่มี Session แต่ผู้ใช้พยายามกดออกเวร
                // ให้เช็ค Database ครั้งสุดท้ายเผื่อมี log ค้าง
                ref.child("dutyLogs").limitToLast(1).once("value", snap => {
                    let foundOpenLog = false;
                    snap.forEach(child => {
                        const val = child.val();
                        if(val.startTime && !val.endTime) {
                            // เจอตัวค้าง! ปิดให้เลย
                            foundOpenLog = true;
                            ref.child("dutyLogs/" + child.key).update({ endTime: now, action: "ออกเวร (Forced) ✅" }).then(() => {
                                alert("ระบบปิด Log ที่ค้างอยู่ให้แล้วครับ");
                                updateUI();
                            });
                        }
                    });

                    if(!foundOpenLog) {
                        alert("ไม่ได้เข้าเวรอยู่ครับ (No active session found)");
                        updateUI();
                    }
                });
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