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


// ====== PANIC SYSTEM CONFIG ======
const WEBHOOK_URL = "https://discord.com/api/webhooks/1458501367210447040/FAjI0D3o_9xkHmxf-gmynt2geNgdxKZUWtW0jCuAbKRkqjKk2NXzik9suNvB8c_7w0cH";
const COOLDOWN_TIME = 3 * 60 * 1000; // 3 นาที

// รายชื่อสถานการณ์ (ตามรูปภาพ)
const situationList = [
    "Active Shooter Incident (เหตุกราดยิง)",
    "Hostage Situation (เหตุจับตัวประกัน)",
    "Mass Casualty Incident (เหตุการณ์ที่มีผู้บาดเจ็บจำนวนมาก)",
    "Civil Unrest / Riot (เหตุจลาจลหรือการประท้วงรุนแรง)",
    "Terrorist Threat / Bomb Threat (ภัยก่อการร้าย / ขู่วางระเบิด)",
    "Major Gang Shootout (เหตุยิงกันระหว่างแก๊งค์ใหญ่)",
    "Natural Disaster / Emergency Response (ภัยธรรมชาติหรือกู้ภัย)"
];

// Reference UI Elements
const panicModal = document.getElementById("panicModal");
const panicSituationSelect = document.getElementById("panicSituation");
const panicUnitSelect = document.getElementById("panicUnit");
const panicLocationInput = document.getElementById("panicLocation");
const panicBtn = document.querySelector(".btn-header.btn-admin b").parentNode; // จับปุ่ม Panic เดิม

// 1. Setup เมื่อหน้าเว็บโหลด
document.addEventListener("DOMContentLoaded", () => {
    // เติม Option สถานการณ์
    if(panicSituationSelect) {
        situationList.forEach(sit => {
            const opt = document.createElement("option");
            opt.value = sit;
            opt.innerText = sit;
            panicSituationSelect.appendChild(opt);
        });
        // เลือกอันแรกเป็นค่า Default
        panicSituationSelect.selectedIndex = 0;
    }

    // ตรวจสอบ Cooldown ปุ่ม
    checkPanicCooldown();
    setInterval(checkPanicCooldown, 1000); // เช็คทุกวินาที
    
    // ตั้งค่าปุ่ม Panic ให้เปิด Modal
    if(panicBtn) {
        panicBtn.addEventListener("click", () => {
            if(!panicBtn.disabled) {
                openPanicModal();
            }
        });
    }
});

// 2. Modal Functions
function openPanicModal() {
    if(localStorage.getItem("panicCooldown")) return; // กันเหนียว
    panicModal.style.display = "flex";
    nextPanicStep(1); // รีเซ็ตไปหน้า 1
}

function closePanicModal() {
    panicModal.style.display = "none";
}

function nextPanicStep(step) {
    document.getElementById("step1").style.display = step === 1 ? "block" : "none";
    document.getElementById("step2").style.display = step === 2 ? "block" : "none";
}

// 3. ฟังก์ชันกดยืนยัน (CONFIRM)
function confirmPanic() {
    const currentId = localStorage.getItem("officerId");
    const officerRef = db.ref("Users/" + currentId);
    
    officerRef.once("value").then(snapshot => {
        const user = snapshot.val();
        const senderName = user ? `${user.rank} ${user.name} (${currentId})` : `Unknown (${currentId})`;
        const callsign = user.callsign || "NO-CALLSIGN";

        const situation = panicSituationSelect.value;
        const selectedUnitOption = panicUnitSelect.options[panicUnitSelect.selectedIndex];
        const unitName = selectedUnitOption.text;
        // ดึง Role ID จาก attribute data-role (ใส่เลข ID จริงที่ต้องการแท็กใน HTML)
        const roleId = selectedUnitOption.getAttribute("data-role") || "&1156904628726808602"; 
        const location = panicLocationInput.value || "Unknown Location";

        // A. ส่งเข้า Firebase เพื่อให้ทุกคนได้ยินเสียงและเห็น Log
        const panicRef = db.ref("GlobalPanic").push();
        panicRef.set({
            sender: senderName,
            situation: situation,
            location: location,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // B. ส่งเข้า Discord
        sendToDiscord(senderName, roleId, location, situation);

        // C. เริ่มนับ Cooldown
        const now = new Date().getTime();
        localStorage.setItem("panicCooldown", now + COOLDOWN_TIME);
        checkPanicCooldown();

        // ปิด Modal
        closePanicModal();
    });
}

// 4. ระบบ Cooldown
function checkPanicCooldown() {
    const cooldownEnd = localStorage.getItem("panicCooldown");
    if (cooldownEnd) {
        const remaining = parseInt(cooldownEnd) - new Date().getTime();
        if (remaining > 0) {
            // ยังติด Cooldown
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            panicBtn.disabled = true;
            panicBtn.style.opacity = "0.5";
            panicBtn.style.cursor = "not-allowed";
            panicBtn.innerHTML = `<b>⏳ COOLDOWN (${minutes}:${seconds < 10 ? '0'+seconds : seconds})</b>`;
        } else {
            // หมด Cooldown
            localStorage.removeItem("panicCooldown");
            resetPanicBtn();
        }
    } else {
        resetPanicBtn();
    }
}

function resetPanicBtn() {
    if(panicBtn) {
        panicBtn.disabled = false;
        panicBtn.style.opacity = "1";
        panicBtn.style.cursor = "pointer";
        panicBtn.innerHTML = `<b> Panic Button / ปุ่มฉุกเฉิน</b>`;
    }
}

// 5. Discord Webhook Sender
function sendToDiscord(sender, roleId, location, situation) {
    const message = {
        content: `## PAGER — PAGER — PAGER ❗\n**FROM:** ${sender}\n**TO:** <@${roleId}>\n**LOC:** ${location}\n**SIT:** ${situation}\n## PAGER — PAGER — PAGER ❗`
    };

    fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    }).catch(err => console.error("Discord Error:", err));
}

// 6. GLOBAL LISTENER (ส่วนที่ทำให้ทุกคนได้ยินเสียง)
// ใส่ไว้ท้ายสุดเพื่อให้ทำงานตลอดเวลา
db.ref("GlobalPanic").limitToLast(1).on("child_added", snapshot => {
    const data = snapshot.val();
    const now = new Date().getTime();
    
    // เช็คว่า Alert นี้เพิ่งเกิดไม่เกิน 10 วินาที (ป้องกันเล่นเสียงเก่าตอน Refresh หน้าจอ)
    if (now - data.timestamp < 10000) {
        
        // 1. เล่นเสียง
        const audio = document.getElementById("panicSound");
        if(audio) {
            audio.currentTime = 0;
            audio.volume = 1.0;
            audio.play().catch(e => console.log("Audio play failed (interact first):", e));
        }

        // 2. เพิ่มลง Realtime Logs (Log สีแดงกระพริบ)
        const logs = document.getElementById("logs");
        if(logs) {
            const li = document.createElement("li");
            li.style.borderLeft = "3px solid #ff0000";
            li.style.background = "rgba(255, 0, 0, 0.2)";
            li.style.color = "#ffcccc";
            li.innerHTML = `[PANIC] 🚨 ${data.situation} @ ${data.location} (By: ${data.sender})`;
            logs.prepend(li);
        }
    }
});