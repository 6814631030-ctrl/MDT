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
    // ฟังก์ชันอัปเดตหน้าจอ (ฉบับแก้ไข: บังคับคืนค่าเดิม Force Reset)
    const updateUI = () => {
        // 1. เช็คสถานะปัจจุบัน
        const currentSessionKey = localStorage.getItem("session_" + id);
        const isOnDuty = (currentSessionKey !== null && currentSessionKey !== "");

        console.log("Duty Status Check:", isOnDuty); // ดู Log ว่าเป็น true/false

        // 2. จัดการปุ่ม Start (เข้าเวร)
        if(els.startBtn) {
            if (isOnDuty) {
                // ถ้าเข้าเวรอยู่ -> ปิดปุ่ม Start
                els.startBtn.classList.add("disabled"); // เพิ่ม class disabled เผื่อธีมใช้
                els.startBtn.style.opacity = "0.2";
                els.startBtn.style.pointerEvents = "none";
                els.startBtn.style.filter = "grayscale(100%)"; // ทำเป็นสีเทาไปเลย
                els.startBtn.innerHTML = '<i class="fa fa-ban"></i> ON DUTY'; // เปลี่ยนข้อความ
            } else {
                // ถ้าออกเวรแล้ว -> เปิดปุ่ม Start ให้สุด
                els.startBtn.classList.remove("disabled");
                els.startBtn.style.opacity = "1";
                els.startBtn.style.pointerEvents = "auto";
                els.startBtn.style.filter = "none";
                els.startBtn.style.border = "1px solid #00ff00"; // บังคับขอบเขียว
                els.startBtn.style.color = "#00ff00"; // บังคับตัวหนังสือเขียว
                els.startBtn.innerHTML = '🚨 ON DUTY / เริ่มงาน'; // คืนข้อความเดิม
            }
        }

        // 3. จัดการปุ่ม End (ออกเวร)
        if(els.endBtn) {
            if (!isOnDuty) {
                // ถ้าออกเวรแล้ว -> ปิดปุ่ม End
                els.endBtn.classList.add("disabled");
                els.endBtn.style.opacity = "0.2";
                els.endBtn.style.pointerEvents = "none";
                els.endBtn.style.filter = "grayscale(100%)";
                els.endBtn.style.border = "1px solid #555";
            } else {
                // ถ้าเข้าเวรอยู่ -> เปิดปุ่ม End ให้ชัดๆ
                els.endBtn.classList.remove("disabled");
                els.endBtn.style.opacity = "1";
                els.endBtn.style.pointerEvents = "auto";
                els.endBtn.style.filter = "none";
                els.endBtn.style.border = "1px solid #ff0000"; // บังคับขอบแดง
                els.endBtn.style.color = "#ff0000"; // บังคับตัวหนังสือแดง
            }
        }

        // 4. จัดการเวลา Session Start
        const storedStartTime = localStorage.getItem("dutyStartTime_" + id);
        if (storedStartTime && els.time) {
            const dateObj = new Date(storedStartTime);
            els.time.textContent = `${dateObj.toLocaleTimeString('th-TH')} (${dateObj.toLocaleDateString('th-TH')})`;
            els.time.style.color = "#00ff00"; // สีเขียวตอนทำงาน
        } else if (els.time) {
            els.time.textContent = "--:--:--"; // รีเซ็ตเวลา
            els.time.style.color = "#aaa"; // สีเทาตอนพัก
        }
    };

    // เรียกใช้ครั้งแรกเพื่อปรับปุ่มตามสถานะจริง
    updateUI();

    // --- ส่วนของ Event Listener (เหมือนเดิม แต่เรียก updateUI ให้ชัวร์ขึ้น) ---

    // ปุ่ม Start
    if(els.startBtn) {
        const newStartBtn = els.startBtn.cloneNode(true);
        els.startBtn.parentNode.replaceChild(newStartBtn, els.startBtn);
        els.startBtn = newStartBtn;
        
        els.startBtn.addEventListener("click", () => {
            const now = new Date();
            const timeStr = now.toISOString();
            
            // เล่นเสียงก่อน
            if(els.clickSound) els.clickSound.currentTime = 0;
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            const newRef = ref.child("dutyLogs").push();
            newRef.set({ startTime: timeStr, action: "เข้าเวรปฏิบัติหน้าที่ 🚨" }).then(() => {
                localStorage.setItem("session_" + id, newRef.key);
                localStorage.setItem("dutyStartTime_" + id, timeStr);
                
                // อัปเดต UI ทันที
                updateUI(); 
                
                // บังคับโหลด ck.js ใหม่เบาๆ (ถ้าจำเป็น)
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
            
            // เล่นเสียง
            if(els.clickSound) els.clickSound.currentTime = 0;
            if(els.clickSound) els.clickSound.play().catch(()=>{});

            if(currentSessionKey) {
                ref.child("dutyLogs/" + currentSessionKey).update({ endTime: now, action: "ออกเวร / จบการทำงาน ✅" }).then(() => {
                    // เคลียร์ค่า
                    localStorage.removeItem("session_" + id);
                    localStorage.removeItem("dutyStartTime_" + id);
                    
                    // อัปเดต UI ทันที
                    updateUI();
                    
                    // บังคับ ck.js ให้หยุดนับทันที
                    if(typeof updateDutyTimer === "function") updateDutyTimer();
                    
                    // *** ถ้า UI ยังดื้อไม่ยอมเปลี่ยน ให้ใช้ท่าไม้ตายนี้ (เอา Comment ออกถ้าจำเป็น) ***
                    // setTimeout(() => window.location.reload(), 500); 
                });
            } else {
                // กรณีฉุกเฉิน หาคีย์ไม่เจอ ก็บังคับ Reset
                localStorage.removeItem("session_" + id);
                localStorage.removeItem("dutyStartTime_" + id);
                updateUI();
            }
        });
    }

    // Realtime Logs (ส่วนแสดงผล Log)
    ref.child("dutyLogs").off(); 
    ref.child("dutyLogs").limitToLast(10).on("child_added", snap => {
        if(els.logs && !document.getElementById(snap.key)) {
            const val = snap.val();
            const li = document.createElement("li");
            li.id = snap.key;
            
            const timeObj = new Date(val.startTime);
            const timeStr = timeObj.toLocaleTimeString("th-TH", {hour:'2-digit', minute:'2-digit'});
            
            let color = "#00ccff"; // สีฟ้า (เข้า)
            if(val.action && val.action.includes("ออก")) color = "#ff3333"; // สีแดง (ออก)

            li.innerHTML = `<span style="color:${color}">[${timeStr}]</span> ${val.action}`;
            els.logs.prepend(li); // ใส่ไว้บนสุด
        }
    });
}