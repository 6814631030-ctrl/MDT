// ====== ck.js (Total Duration Calculator) ======

function updateDutyTimer() {
    const currentId = localStorage.getItem("officerId");
    if (!currentId) return;

    // 1. ดึงเวลาสะสมในอดีต (คำนวณจาก fb.js)
    let totalMs = parseInt(localStorage.getItem("totalPastTime_" + currentId) || "0");

    // 2. บวกเวลา Session ปัจจุบัน (ถ้ากำลังเข้าเวรอยู่)
    const startTimeStr = localStorage.getItem("dutyStartTime_" + currentId);
    
    // ถ้ามีเวลาเริ่ม แปลว่ากำลังเข้าเวร ให้บวกเพิ่มเข้าไปเลย
    if (startTimeStr) {
        const startTime = new Date(startTimeStr).getTime();
        const now = new Date().getTime();
        const currentSessionDuration = now - startTime;
        
        // รวมเวลาเก่า + เวลาใหม่
        totalMs += currentSessionDuration;
    }

    // 3. แปลงหน่วยเป็น ชั่วโมง:นาที:วินาที
    const totalSeconds = Math.floor(totalMs / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    // 4. แสดงผล
    const totalTimeEl = document.getElementById("totalTime");
    if (totalTimeEl) {
        // จัด Format สวยๆ (00:00:00)
        const hrsStr = hrs.toString().padStart(2, '0');
        const minsStr = mins.toString().padStart(2, '0');
        const secsStr = secs.toString().padStart(2, '0');
        
        totalTimeEl.textContent = `${hrsStr}:${minsStr}:${secsStr}`;

        // เปลี่ยนสีถ้ามีการนับเวลา (ให้รู้ว่าระบบเดินอยู่)
        if (startTimeStr) {
            totalTimeEl.style.color = "#00ffaa"; // สีเขียวสว่าง
            totalTimeEl.style.textShadow = "0 0 10px rgba(0, 255, 170, 0.6)";
        } else {
            // ถ้าไม่ได้เข้าเวร แสดงเวลาสะสมเฉยๆ เป็นสีขาว/เทา
            totalTimeEl.style.color = "#e0f7fa"; 
            totalTimeEl.style.textShadow = "none";
        }
    }
}

// อัปเดตทุก 1 วินาที
setInterval(updateDutyTimer, 1000);
updateDutyTimer(); // เรียกทันทีครั้งแรก