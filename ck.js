// ====== ck.js (System Timer & Duration Calc) ======

function updateDutyTimer() {
    // 1. หา User ID ปัจจุบัน
    const currentId = localStorage.getItem("officerId");
    if (!currentId) return;

    // 2. ดึงเวลาที่เริ่มกดปุ่ม (Start Time) จากเครื่อง
    const startTimeStr = localStorage.getItem("dutyStartTime_" + currentId);
    const totalTimeEl = document.getElementById("totalTime");

    if (startTimeStr && totalTimeEl) {
        // มีเวลาเริ่ม -> คำนวณความต่าง
        const startTime = new Date(startTimeStr).getTime();
        const now = new Date().getTime();
        const diff = now - startTime; // ผลต่างเป็นมิลลิวินาที

        // แปลงเป็น ชั่วโมง:นาที:วินาที
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        // จัดรูปแบบให้มีเลข 0 นำหน้า (เช่น 01:05:09)
        const hrsStr = hrs.toString().padStart(2, '0');
        const minsStr = mins.toString().padStart(2, '0');
        const secsStr = secs.toString().padStart(2, '0');

        totalTimeEl.textContent = `${hrsStr}:${minsStr}:${secsStr}`;
        totalTimeEl.style.color = "#00ffaa"; // สีเขียวเรืองแสง
        totalTimeEl.style.textShadow = "0 0 10px rgba(0, 255, 170, 0.5)";

    } else if (totalTimeEl) {
        // ไม่มีเวลาเริ่ม (ยังไม่กด On Duty)
        totalTimeEl.textContent = "00:00:00";
        totalTimeEl.style.color = "#555"; // สีเทา
        totalTimeEl.style.textShadow = "none";
    }
}

// สั่งให้ทำงานทุกๆ 1 วินาที (1000 ms)
setInterval(updateDutyTimer, 1000);

// เรียกทำงานครั้งแรกทันทีไม่ต้องรอ 1 วิ
updateDutyTimer();
// // ====== ck.js (System Clock & Duty Timer) ======

// function updateSystemTime() {
//     const now = new Date();
    
//     // 1. นาฬิกาหลัก (มุมขวาบน หรือตรง Session Start ถ้าต้องการให้เป็นเวลาปัจจุบัน)
//     // แต่ใน HTML คุณใช้ id="time" เป็น Session Start (เวลาคงที่) 
//     // ดังนั้นเราอาจจะไม่ได้ยุ่งกับ id="time" ในฟังก์ชันนี้ เว้นแต่คุณอยากให้เป็นนาฬิกาเดิน
    
//     // ถ้าอยากให้มีนาฬิกาเดินที่มุมจอ (สร้าง element เพิ่ม หรือใช้ console ดู)
//     // console.log("Current Time:", now.toLocaleTimeString('th-TH'));
// }

// function updateDutyTimer() {
//     // ดึงค่า ID เพื่อเช็คสถานะเฉพาะบุคคล
//     const currentId = localStorage.getItem("officerId");
//     if (!currentId) return;

//     const isOnDuty = localStorage.getItem("isOnDuty_" + currentId) === "true";
//     const sessionStartKey = localStorage.getItem("session_" + currentId);
    
//     const totalTimeEl = document.getElementById("totalTime");

//     if (isOnDuty && sessionStartKey) {
//         // ในความเป็นจริงเราควรเก็บ startTime ไว้ใน LocalStorage ด้วยเพื่อให้คำนวณแม่นยำ
//         // แต่ถ้าจะเอาแบบง่ายๆ ให้นับจากเวลาที่เปิดหน้าเว็บ หรือต้องดึงจาก Firebase
//         // เพื่อความง่ายใน Client Side เราจะสมมติว่าเริ่มนับเมื่อโหลดหน้า หรือถ้าจะเอาเป๊ะต้องแก้ fb.js ให้ save startTime ลง LocalStorage
        
//         // *แนะนำ*: ให้ fb.js บันทึก dutyStartTime ลง LocalStorage ตอนกดปุ่ม Start
//         const storedStartTime = localStorage.getItem("dutyStartTime_" + currentId);
        
//         if (storedStartTime) {
//             const start = new Date(storedStartTime).getTime();
//             const current = new Date().getTime();
//             const diff = current - start;

//             const hrs = Math.floor(diff / (1000 * 60 * 60));
//             const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//             const secs = Math.floor((diff % (1000 * 60)) / 1000);

//             if (totalTimeEl) {
//                 totalTimeEl.textContent = 
//                     `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//                 totalTimeEl.style.color = "#00ffaa"; // สีเขียว
//             }
//         }
//     } else {
//         if (totalTimeEl) {
//             totalTimeEl.textContent = "00:00:00";
//             totalTimeEl.style.color = "#555"; // สีเทา
//         }
//     }
// }

// // อัปเดตทุก 1 วินาที
// setInterval(() => {
//     updateSystemTime();
//     updateDutyTimer();
// }, 1000);