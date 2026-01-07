// ====== Firebase Config ======
const firebaseConfig = {
  apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
  authDomain: "law-enforment.firebaseapp.com",
  databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "law-enforment",
  storageBucket: "law-enforment.firebasestorage.app",
  messagingSenderId: "328110715362",
  appId: "1:328110715362:web:6883f14af8be404ecf09bb",
  measurementId: "G-1X08RZGGEF"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const reportsRef = db.ref("evidenceReports");

// ฟังก์ชันช่วยแปลงเวลา (เก็บไว้ข้างนอกเพื่อเรียกใช้ได้)
function parseDuration(durationStr){
  const match = durationStr && durationStr.match(/(\d+)\s*ชั่วโมง\s*(\d+)\s*นาที\s*(\d+)\s*วินาที/);
  if(!match) return 0;
  return parseInt(match[1],10)*3600 + parseInt(match[2],10)*60 + parseInt(match[3],10);
}

// main init after DOM ready
document.addEventListener("DOMContentLoaded", () => {
// ตั้งค่า officerId ให้แน่นอน และเป็น global
window.officerId = localStorage.getItem("officerId") || localStorage.getItem("badgeId") || "4";
const officerRef = firebase.database().ref("Users/" + window.officerId);


  // DOM elements (ต้องมีใน HTML)
  const logsEl = document.getElementById("logs");
  const startBtn = document.getElementById("startDuty");
  const endBtn = document.getElementById("endDuty");
  const totalTimeEl = document.getElementById("totalTime");
  const userInfoEl = document.getElementById("userInfo");
  const infoEl = document.getElementById("info");
  const timeEl = document.getElementById("time");
  const clickSound = document.getElementById("clickSound");

  if(!logsEl || !startBtn || !endBtn || !totalTimeEl){
    console.error("Missing required DOM elements. ตรวจสอบ IDs: logs, startDuty, endDuty, totalTime");
    return;
  }

  // โหลดข้อมูลผู้ใช้จาก Firebase และเซ็ต localStorage/UI
  officerRef.once("value").then(snapshot => {
    const user = snapshot.val();
    if(user){
      // เซ็ตคีย์ให้สอดคล้องกัน
      localStorage.setItem("officerId", user.officerId);
      localStorage.setItem("name", user.name || "");
      localStorage.setItem("rank", user.rank || "");
      localStorage.setItem("callsign", user.callsign || "");
      localStorage.setItem("officerName", user.name || "");
      localStorage.setItem("badgeId", user.officerId);

      if(userInfoEl) userInfoEl.textContent = `${user.name} | ${user.callsign} | ${user.officerId}`;
      if(typeof setLogoFromUser === "function") setLogoFromUser(user);

      // เรียกฟังก์ชันที่คุณมี (ถ้ามี)
      if(typeof initReportForm === "function") initReportForm(user);
      if(typeof loadReports === "function") loadReports();
    } else {
      if(userInfoEl) userInfoEl.textContent = "N/A | N/A | N/A";
    }
  }).catch(err => {
    console.error("Firebase user load error:", err);
  });

  // แสดงข้อมูลผู้ใช้จาก localStorage (ถ้ามี)
  const name = localStorage.getItem("name");
  const rank = localStorage.getItem("rank");
  const loginTime = localStorage.getItem("loginTime");
  const callsign = localStorage.getItem("callsign") || "N/A";
  if(infoEl && name && officerId){
    infoEl.textContent = `${rank} ${name} | Callsign: ${callsign} | Badge ID: ${officerId}`;
    if(timeEl) timeEl.textContent = `Login: ${loginTime || "N/A"}`;
  }

  // อ่านสถานะจาก localStorage
  let currentSessionKey = localStorage.getItem("currentSessionKey");
  let isOnDuty = localStorage.getItem("isOnDuty") === "true";

  // ถ้าพบ inconsistency ให้รีเซ็ต (เช่น isOnDuty=true แต่ไม่มี session key)
  if(isOnDuty && !currentSessionKey){
    console.warn("isOnDuty=true but no currentSessionKey — auto-resetting.");
    isOnDuty = false;
    localStorage.removeItem("isOnDuty");
  }

  // ปรับปุ่มตามสถานะ
  startBtn.disabled = !!isOnDuty;
  endBtn.disabled = !isOnDuty;

  // ปลอดภัยสำหรับการเล่นเสียง (ไม่ให้ error ตัด flow)
  function safePlay(soundEl){
    if(!soundEl) return;
    try{
      const p = soundEl.play();
      if(p && typeof p.catch === "function") p.catch(()=>{/* ignore autoplay rejections */});
    }catch(e){}
  }

  // ฟังก์ชัน effect ปุ่ม (ของเดิม)
  function buttonEffect(button,message,tempColor){
    const originalText = button.textContent;
    const originalBg = button.style.background;
    button.textContent = message;
    button.style.background = tempColor;
    setTimeout(()=>{
      button.textContent = originalText;
      button.style.background = originalBg;
    },1000);
  }

  // ฟังก์ชันส่ง Webhook (ใช้ของคุณเดิม)
  function sendToDiscord(action, badgeId, officerName, callsign) {
    const webhookUrl = "https://discord.com/api/webhooks/1415997551777157131/aXS1m3R6F2pM159TVqI5ZsGUee0SJ5rY3xuhJSRF3vQTtPKSpY_RGs3RPa6IRG7GOUeZ";
    const nowUnix = Math.floor(Date.now() / 1000);
    const color = action === "ON DUTY" ? 3066993 : 15158332;
    const payload = {
      username: "SanAndreasHP Bots",
      embeds: [{
        title: `**${officerName} — ${action}**`,
        color: color,
        description: 
          `**Name:** ${officerName}\n` +
          `**Callsign:** ${callsign}\n` +
          `**Badge ID:** ${badgeId}\n` +
          `**Date & Time:** <t:${nowUnix}:f>\n` +
          `**Last Activity:** <t:${nowUnix}:R>`,
        footer: { text: "SAHP : ระบบ MDT" },
        thumbnail: { url: "https://cdn.discordapp.com/icons/1156904628659683348/555f6317af8cd42a7dd1e1a4a8f8ce09.png?size=256" },
        timestamp: new Date()
      }]
    };
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Webhook Error:", err));
  }

  // START DUTY
  function startDuty(){
    if(isOnDuty) return alert("คุณเริ่มงานไปแล้ว กรุณาออกเวรก่อน");
    const startTime = new Date().toISOString();
    if(!officerRef) return alert("ไม่พบข้อมูลเจ้าหน้าที่ กรุณารีเฟรชหน้า");
    const logRef = officerRef.child("dutyLogs").push({ startTime, action:"เริ่มปฏิบัติหน้าที่ 🚨" });
    currentSessionKey = logRef.key;
    isOnDuty = true;
    localStorage.setItem("currentSessionKey", currentSessionKey);
    localStorage.setItem("isOnDuty", "true");
    startBtn.disabled = true;
    endBtn.disabled = false;
    safePlay(clickSound);
    buttonEffect(startBtn,"🚨 เริ่มแล้ว!","#FFC107");
    const name = localStorage.getItem("name") || "Unknown";
    const rank = localStorage.getItem("rank") || "";
    const callsign = localStorage.getItem("callsign") || "N/A";
    sendToDiscord("ON DUTY", localStorage.getItem("officerId") || officerId, `${rank} ${name}`, callsign);
  }

  // END DUTY
  function endDuty(){
    if(!isOnDuty || !currentSessionKey) return alert("ยังไม่ได้เริ่มงาน");
    const endTime = new Date().toISOString();
    officerRef.child("dutyLogs/" + currentSessionKey).once("value", snap=>{
      const data = snap.val();
      if(!data || !data.startTime) return alert("ไม่พบข้อมูลการเริ่มงาน");
      const durationMs = new Date(endTime) - new Date(data.startTime);
      const hours = Math.floor(durationMs / 1000 / 60 / 60);
      const minutes = Math.floor((durationMs / 1000 / 60) % 60);
      const seconds = Math.floor((durationMs / 1000) % 60);
      const durationStr = `${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`;
      officerRef.child("dutyLogs/" + currentSessionKey).update({
        endTime,
        duration: durationStr,
        action:"ออกเวร ✅"
      });
      currentSessionKey = null;
      isOnDuty = false;
      localStorage.removeItem("currentSessionKey");
      localStorage.removeItem("isOnDuty");
      startBtn.disabled = false;
      endBtn.disabled = true;
      safePlay(clickSound);
      buttonEffect(endBtn,"✅ เสร็จสิ้น!","#FFC107");
      const name = localStorage.getItem("name") || "Unknown";
      const rank = localStorage.getItem("rank") || "";
      const callsign = localStorage.getItem("callsign") || "N/A";
      sendToDiscord("OFF DUTY", localStorage.getItem("officerId") || officerId, `${rank} ${name}`, callsign);
    });
  }

  // รีเซ็ตและคำนวนเวลาทั้งหมด
  function updateTotalTime(totalSeconds){
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600)/60);
    const totalSecs = totalSeconds % 60;
    totalTimeEl.textContent = `รวมเวลา: ${totalHours} ชั่วโมง ${totalMinutes} นาที ${totalSecs} วินาที`;
  }

  function updateAllLogsTotalTime(){
    officerRef.child("dutyLogs").once("value", snap=>{
      let totalSeconds = 0;
      snap.forEach(childSnap=>{
        const log = childSnap.val();
        if(log.duration) totalSeconds += parseDuration(log.duration);
      });
      updateTotalTime(totalSeconds);
    });
  }

  // แสดง Duty Logs
  function renderLog(snapshot,isUpdate=false){
    const log = snapshot.val();
    const liId = "log-" + snapshot.key;
    let li = document.getElementById(liId);
    if(!li){
      li = document.createElement("li");
      li.id = liId;
      logsEl.appendChild(li);
    }
    let text = `${log.action || ""}`;
    if(log.startTime) text += ` | Start: ${new Date(log.startTime).toLocaleString("th-TH")}`;
    if(log.endTime) text += ` | End: ${new Date(log.endTime).toLocaleString("th-TH")}`;
    if(log.duration) text += ` | รวมเวลา: ${log.duration}`;
    li.textContent = text;
  }

  // listeners
  startBtn.addEventListener("click", startDuty);
  endBtn.addEventListener("click", endDuty);

  // realtime listeners
  officerRef.child("dutyLogs").on("child_added", snap=>{
    renderLog(snap);
    updateAllLogsTotalTime();
  });
  officerRef.child("dutyLogs").on("child_changed", snap=>{
    renderLog(snap,true);
    updateAllLogsTotalTime();
  });

  // debug helper: เรียกใน Console เพื่อรีเซ็ตสถานะเวร
  window.__resetDutyState = function(){
    localStorage.removeItem("isOnDuty");
    localStorage.removeItem("currentSessionKey");
    alert("รีเซ็ตสถานะเวรเรียบร้อยแล้ว — รีโหลดหน้าใหม่เพื่อให้มีผล");
  };

}); // end DOMContentLoaded


// ฟังก์ชันตั้งโลโก้จากข้อมูล user
function setLogoFromUser(user) {
  const logoRoot = document.getElementById("logoRoot");
  if (!logoRoot) return;

  // ถ้ามี field profilePicBase64 (data URL) หรือ profilePic (URL) ให้ใช้
  const imgSrc = user && (user.profilePicBase64 || user.profilePic);

  // helper: สร้างชื่อย่อจากชื่อจริง
  function getInitials(name) {
    if (!name) return "SP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }

  // helper: ใส่ fallback (ตัวอักษร)
  function setFallback() {
    logoRoot.innerHTML = "";
    logoRoot.textContent = getInitials(user && (user.name || user.username) || "SP");
    // ปรับ background ตามต้องการ (ตัวอย่าง)
    logoRoot.style.background = "#5865f2";
  }

  if (!imgSrc) {
    setFallback();
    return;
  }

  // สร้าง <img> และเซ็ต src ทั้ง case base64 หรือ URL
  const img = new Image();
  img.onload = function() {
    logoRoot.innerHTML = "";
    logoRoot.appendChild(img);
  };
  img.onerror = function() {
    console.warn("Logo image load failed, using fallback");
    setFallback();
  };
  img.src = imgSrc;
  img.alt = user.name || user.username || "profile";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";
}

// เรียกใช้งานทันทีหลังโหลด user (ในบล็อกของคุณที่ได้ user)
db.ref("Users/" + officerId).once("value").then(snapshot => {
  const user = snapshot.val();
  if(user){
    localStorage.setItem("officerName", user.name);
    localStorage.setItem("callsign", user.callsign);
    localStorage.setItem("badgeId", user.officerId);

    document.getElementById("userInfo").textContent = `${user.name} | ${user.callsign} | ${user.officerId}`;

    // <-- ใส่ตรงนี้เพื่อเซ็ตโลโก้ทันที
    setLogoFromUser(user);

    // เรียกใช้งานฟังก์ชันแสดงโพสต์หลังโหลด user
    initReportForm(user);
    loadReports();
  } else {
    document.getElementById("userInfo").textContent = "N/A | N/A | N/A";
  }
});

