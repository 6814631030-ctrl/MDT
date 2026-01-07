// ==========================================
// 1. CONFIGURATION (ตั้งค่าระบบ)
// ==========================================
const DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_HERE"; // ⚠️ ใส่ URL Webhook ของคุณที่นี่
const COOLDOWN_TIME_MS = 0 * 60 * 1000; // 3 นาที (หน่วยมิลลิวินาที)

// รายการสถานการณ์ที่จะให้เลือก
const panicSituations = [
    "Hostage Situation (เหตุจับตัวประกัน)",
    "Active Shooter (เหตุกราดยิง)",
    "Officer Down (เจ้าหน้าที่ถูกยิง/บาดเจ็บ)",
    "Felony Stop / High Risk (สกัดจับความเสี่ยงสูง)",
    "Bank Robbery (ปล้นธนาคาร)",
    "Terrorist Threat (เหตุก่อการร้าย)",
    "10-13 Emergency (ต้องการความช่วยเหลือฉุกเฉิน)"
];

// ==========================================
// 2. INITIALIZATION (เริ่มทำงานเมื่อโหลดหน้าเว็บ)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 2.1 เติมตัวเลือกสถานการณ์ลงใน Select Box
    const sitSelect = document.getElementById("panicSituation");
    if(sitSelect) {
        panicSituations.forEach(sit => {
            const opt = document.createElement("option");
            opt.value = sit;
            opt.innerText = sit;
            sitSelect.appendChild(opt);
        });
        sitSelect.selectedIndex = 0;
    }

    // 2.2 เริ่มระบบนับเวลาถอยหลัง (Cooldown)
    checkCooldownTimer();
    setInterval(checkCooldownTimer, 1000); // เช็คทุก 1 วินาที

    // 2.3 ผูกปุ่มกด Panic (ที่แถบเมนูบน)
    const panicHeaderBtn = document.querySelector(".btn-header.btn-admin b");
    if (panicHeaderBtn) {
        const btn = panicHeaderBtn.parentElement;
        btn.id = "mainPanicBtn"; // ตั้ง ID ให้ปุ่มเพื่อให้เรียกใช้ง่าย
        btn.onclick = (e) => {
            e.preventDefault();
            openPanicModal();
        };
    }
});

// ==========================================
// 3. MODAL LOGIC (ควบคุมหน้าต่าง Pop-up)
// ==========================================
function openPanicModal() {
    // ถ้าติด Cooldown ห้ามเปิด
    if(localStorage.getItem("panicCooldownEnd")) {
        alert("⚠️ ระบบ Panic Button ยังอยู่ในช่วงพัก (Cooldown)");
        return; 
    }
    const modal = document.getElementById("panicModal");
    if(modal) {
        modal.style.display = "flex";
        nextPanicStep(1); // เริ่มที่หน้า 1 เสมอ
    }
}

function closePanicModal() {
    const modal = document.getElementById("panicModal");
    if(modal) modal.style.display = "none";
}

function nextPanicStep(step) {
    const s1 = document.getElementById("step1");
    const s2 = document.getElementById("step2");
    if(s1 && s2) {
        s1.style.display = step === 1 ? "block" : "none";
        s2.style.display = step === 2 ? "block" : "none";
    }
}

// ==========================================
// 4. CONFIRM & SEND DATA (ยืนยันและส่งข้อมูล)
// ==========================================
function confirmPanic() {
    // 4.1 ดึงข้อมูลจาก Input
    const sitSelect = document.getElementById("panicSituation");
    const unitSelect = document.getElementById("panicUnit");
    const locInput = document.getElementById("panicLocation");

    const situation = sitSelect.value;
    const location = locInput.value || "Unknown Location";
    
    // ดึง data-role และชื่อหน่วย
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const roleId = selectedOption.getAttribute("data-role") || ""; 
    const unitName = selectedOption.value;

    // ดึง ID ผู้ใช้ปัจจุบัน
    const currentId = localStorage.getItem("officerId");

    // 4.2 ดึงชื่อเจ้าหน้าที่จาก Firebase
    if(typeof db !== 'undefined') {
        db.ref("Users/" + currentId).once("value").then(snap => {
            const user = snap.val();
            const senderName = user ? `${user.rank} ${user.name} (${user.callsign || currentId})` : "Unknown Officer";

            // 4.3 ส่งข้อมูลเข้า Firebase (GlobalPanic)
            db.ref("GlobalPanic").push({
                sender: senderName,
                situation: situation,
                location: location,
                targetUnit: unitName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // 4.4 ส่ง Webhook เข้า Discord
            sendToDiscord(senderName, roleId, location, situation);

            // 4.5 ตั้งค่า Cooldown
            const cooldownEnd = new Date().getTime() + COOLDOWN_TIME_MS;
            localStorage.setItem("panicCooldownEnd", cooldownEnd);
            checkCooldownTimer();

            // 4.6 ปิด Modal และเคลียร์ค่า
            closePanicModal();
            locInput.value = "";
        });
    } else {
        console.error("Firebase 'db' variable is not defined.");
    }
}

// ==========================================
// 5. DISCORD WEBHOOK
// ==========================================
function sendToDiscord(sender, roleId, location, situation) {
    const message = {
        content: `## PAGER — PAGER — PAGER❗\n**FROM:** ${sender}\n**TO:** <@${roleId}>\n**LOC:** ${location}\n**SIT:** ${situation}\n## PAGER — PAGER — PAGER❗`
    };

    fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    }).catch(console.error);
}

// ==========================================
// 6. COOLDOWN TIMER (นับเวลาถอยหลังปุ่ม)
// ==========================================
function checkCooldownTimer() {
    const btn = document.getElementById("mainPanicBtn");
    if(!btn) return;

    const end = localStorage.getItem("panicCooldownEnd");
    if(end) {
        const remaining = parseInt(end) - new Date().getTime();
        if(remaining > 0) {
            // ยังติด Cooldown
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            const sText = s < 10 ? '0'+s : s;
            
            btn.innerHTML = `<b>⏳ WAIT ${m}:${sText}</b>`;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.style.borderColor = "#555";
            btn.style.color = "#aaa";
        } else {
            // หมด Cooldown
            localStorage.removeItem("panicCooldownEnd");
            resetPanicBtn(btn);
        }
    } else {
        resetPanicBtn(btn);
    }
}

function resetPanicBtn(btn) {
    btn.innerHTML = `<b>🚨 Panic Button / ปุ่มฉุกเฉิน</b>`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.borderColor = "#ff3333";
    btn.style.color = "#ff3333";
}

// ==========================================
// 7. REALTIME LISTENER (รับสัญญาณและเล่นเสียง)
// ==========================================
if(typeof db !== 'undefined') {
    // ดึงข้อมูลย้อนหลัง 10 รายการ (เพื่อให้เห็นประวัติ)
    db.ref("GlobalPanic").limitToLast(10).on("child_added", snapshot => {
        const data = snapshot.val();
        const now = new Date().getTime();

        // --- ส่วนที่ 1: แสดง Log (ทำเสมอ) ---
        const logs = document.getElementById("logs");
        if(logs) {
            const li = document.createElement("li");
            li.style.borderLeft = "4px solid #ff0000";
            li.style.backgroundColor = "rgba(255, 0, 0, 0.15)";
            li.style.color = "#ffcccc";
            li.style.fontWeight = "bold";
            li.style.marginBottom = "5px";
            li.style.padding = "5px";
            li.style.listStyleType = "none";

            const timeStr = new Date(data.timestamp).toLocaleTimeString('th-TH');

            li.innerHTML = `
                <span style="color:#ff0000">[PANIC ${timeStr}]</span> 
                ${data.situation} <br>
                <small style="color:#bbb">📍 ${data.location} | 👮 ${data.sender}</small>
            `;
            
            // แทรกไว้บนสุด
            logs.prepend(li);
        }

        // --- ส่วนที่ 2: เล่นเสียง (เฉพาะข้อมูลใหม่ < 10 วิ) ---
        if (now - data.timestamp < 10000) {
            const audio = document.getElementById("panicSound");
            if (audio) {
                audio.currentTime = 0; 
                var playPromise = audio.play();

                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                        console.log("🔊 Audio started playing.");
                    })
                    .catch(error => {
                        console.warn("⚠️ Browser blocked audio autoplay.");
                        console.error(error);
                    });
                }
            }
        }
    });
}