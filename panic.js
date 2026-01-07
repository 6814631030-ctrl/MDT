// ====== CONFIGURATION ======
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1458501367210447040/FAjI0D3o_9xkHmxf-gmynt2geNgdxKZUWtW0jCuAbKRkqjKk2NXzik9suNvB8c_7w0cH";
const COOLDOWN_TIME_MS = 3 * 60 * 1000; // 3 นาที

// รายการสถานการณ์
const panicSituations = [
    "Hostage Situation (เหตุจับตัวประกัน)",
    "Active Shooter (เหตุกราดยิง)",
    "Officer Down (เจ้าหน้าที่ถูกยิง/บาดเจ็บ)",
    "Felony Stop / High Risk (สกัดจับความเสี่ยงสูง)",
    "Bank Robbery (ปล้นธนาคาร)",
    "Terrorist Threat (เหตุก่อการร้าย)",
    "10-13 Emergency (ต้องการความช่วยเหลือฉุกเฉิน)"
];


// ====== INIT SYSTEM ======
document.addEventListener("DOMContentLoaded", () => {
    // 1. เติมตัวเลือกสถานการณ์ลงใน Select Box
    const sitSelect = document.getElementById("panicSituation");
    if(sitSelect) {
        panicSituations.forEach(sit => {
            const opt = document.createElement("option");
            opt.value = sit;
            opt.innerText = sit;
            sitSelect.appendChild(opt);
        });
        sitSelect.selectedIndex = 0; // เลือกตัวแรกเป็นค่าเริ่มต้น
    }

    // 2. ตรวจสอบ Cooldown
    checkCooldownTimer();
    setInterval(checkCooldownTimer, 1000);

    // 3. ผูกปุ่มกด Panic (ปุ่มบน Header)
    // ตรงนี้ผม selector ตามที่คุณส่งมาก่อนหน้า
    const panicHeaderBtn = document.querySelector(".btn-header.btn-admin b");
    if (panicHeaderBtn) {
        const btn = panicHeaderBtn.parentElement; // ปุ่มแม่
        btn.id = "mainPanicBtn";
        btn.onclick = (e) => {
            e.preventDefault();
            openPanicModal();
        };
    }
});

// ====== MODAL LOGIC ======
function openPanicModal() {
    // ถ้าติด Cooldown ห้ามเปิด
    if(localStorage.getItem("panicCooldownEnd")) {
        // อาจจะใส่เสียง Error ตรงนี้ได้
        return; 
    }
    document.getElementById("panicModal").style.display = "flex";
    nextPanicStep(1); // เริ่มที่หน้า 1 เสมอ
}

function closePanicModal() {
    document.getElementById("panicModal").style.display = "none";
}

function nextPanicStep(step) {
    document.getElementById("step1").style.display = step === 1 ? "block" : "none";
    document.getElementById("step2").style.display = step === 2 ? "block" : "none";
}

// ====== CONFIRM & SEND DATA ======
function confirmPanic() {
    // 1. ดึงข้อมูลจาก Input
    const sitSelect = document.getElementById("panicSituation");
    const unitSelect = document.getElementById("panicUnit");
    const locInput = document.getElementById("panicLocation");

    const situation = sitSelect.value;
    const location = locInput.value || "Unknown Location";
    
    // ดึง data-role จาก option ที่ถูกเลือก (สำคัญมาก!)
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const roleId = selectedOption.getAttribute("data-role"); 
    const unitName = selectedOption.value;

    const currentId = localStorage.getItem("officerId");

    // 2. ดึงชื่อเจ้าหน้าที่จาก Firebase (เพื่อให้ชัวร์)
    db.ref("Users/" + currentId).once("value").then(snap => {
        const user = snap.val();
        const senderName = user ? `${user.rank} ${user.name} (${user.callsign || currentId})` : "Unknown Officer";

        // 3. ส่งข้อมูลเข้า Firebase (GlobalPanic) -> เพื่อให้ทุกคนได้ยินเสียง
        db.ref("GlobalPanic").push({
            sender: senderName,
            situation: situation,
            location: location,
            targetUnit: unitName,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // 4. ส่ง Webhook เข้า Discord
        sendToDiscord(senderName, roleId, location, situation);

        // 5. ตั้งค่า Cooldown
        const cooldownEnd = new Date().getTime() + COOLDOWN_TIME_MS;
        localStorage.setItem("panicCooldownEnd", cooldownEnd);
        checkCooldownTimer();

        // 6. ปิด Modal และเคลียร์ค่า
        closePanicModal();
        locInput.value = "";
    });
}

// ====== DISCORD WEBHOOK ======
function sendToDiscord(sender, roleId, location, situation) {
    // จัดรูปแบบข้อความตามที่ขอ
    const message = {
        content: `## PAGER — PAGER — PAGER❗\n**FROM:** ${sender}\n**TO:** <@${roleId.replace('&', '&')}>\n**LOC:** ${location}\n**SIT:** ${situation}\n## PAGER — PAGER — PAGER❗`
    };

    fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    }).catch(console.error);
}

// ====== COOLDOWN TIMER ======
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
            btn.innerHTML = `<b>⏳ WAIT ${m}:${s < 10 ? '0'+s : s}</b>`;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.style.border = "1px solid #555";
            btn.style.color = "#aaa";
            btn.onclick = (e) => e.preventDefault();
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
    btn.innerHTML = `<b> Panic Button / ปุ่มฉุกเฉิน</b>`;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.border = "1px solid #ff3333"; // คืนสีแดง
    btn.style.color = "#ff3333";
    btn.onclick = (e) => {
        e.preventDefault();
        openPanicModal();
    };
}

// ====== REALTIME LISTENER (ทุกคนจะได้ยินเสียงจากตรงนี้) ======
db.ref("GlobalPanic").limitToLast(1).on("child_added", snapshot => {
    const data = snapshot.val();
    const now = new Date().getTime();

    // เช็คเวลาว่าข้อมูลนี้เพิ่งเกิดไม่เกิน 10 วินาที (ป้องกันเสียงดังตอนรีเฟรชหน้าแล้วเจอข้อมูลเก่า)
    if (now - data.timestamp < 10000) {
        
        // 1. เล่นเสียง Panic
        const audio = document.getElementById("panicSound");
        if(audio) {
            audio.currentTime = 0;
            // Hack: เบราว์เซอร์อาจบล็อกเสียงถ้าไม่มี user interaction มาก่อน
            // แต่เนื่องจาก dashboard มีการกดคลิกไปมา ปกติจะเล่นได้ครับ
            audio.play().catch(err => console.log("Sound Autoplay Blocked:", err));
        }

        // 2. เพิ่ม Logs สีแดง
        const logs = document.getElementById("logs");
        if(logs) {
            const li = document.createElement("li");
            li.style.borderLeft = "4px solid #ff0000"; // ขอบแดง
            li.style.backgroundColor = "rgba(255, 0, 0, 0.15)";
            li.style.color = "#ffcccc";
            li.style.fontWeight = "bold";
            li.style.marginBottom = "5px";
            
            // Format ข้อความใน Log
            li.innerHTML = `
                <span style="color:#ff0000">[PANIC]</span> 
                ${data.situation} <br>
                LOC: ${data.location} | BY: ${data.sender}
            `;
            
            logs.prepend(li);
        }
    }
});