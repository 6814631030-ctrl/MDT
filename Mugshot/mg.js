document.addEventListener("DOMContentLoaded", () => {

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

  const imageInput = document.getElementById("imageInput");
  const fileName = document.getElementById("fileName");

  // ====== แสดงชื่อไฟล์เมื่อเลือก ======
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    fileName.textContent = file ? `📷 ${file.name}` : '';
  });

  // ====== โหลดข้อมูลผู้ใช้ ======
  const officerId = localStorage.getItem("officerId") || "4";
  db.ref("Users/" + officerId).once("value").then(snapshot => {
    const user = snapshot.val();
    if(user){
      localStorage.setItem("officerName", user.name);
      localStorage.setItem("callsign", user.callsign);
      localStorage.setItem("badgeId", user.officerId);
      localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");

      document.getElementById("userInfo").textContent = `${user.name} | ${user.callsign} | ${user.officerId}`;

      // เรียก initReportForm
      initReportForm(user);

      // ตั้งโลโก้
      setLogoFromUser(user);
    }
  });

  // ====== ส่งรายงาน ======
  function initReportForm(user) {
    const reportForm = document.getElementById("reportForm");

    reportForm.addEventListener("submit", function(e) {
      e.preventDefault();

      const suspect = document.getElementById("suspectInput").value.trim();
      const type = document.getElementById("typeInput").value.trim();
      const items = document.getElementById("itemsInput").value.trim();
      const file = imageInput.files[0];

      if(!suspect || !type || !items) return;

      const newReportRef = reportsRef.push();

      const reportData = {
        officerName: user.name,
        callsign: user.callsign,
        badgeId: user.officerId,
        suspect,
        type,
        items,
        image: null,
        timestamp: new Date().toISOString()
      };

      if(file){
        const reader = new FileReader();
        reader.onload = function(event){
          reportData.image = event.target.result;
          newReportRef.set(reportData);
          reportForm.reset();
          fileName.textContent = '';
        };
        reader.readAsDataURL(file);
      } else {
        newReportRef.set(reportData);
        reportForm.reset();
        fileName.textContent = '';
      }
    });
  }

  // ====== ฟังก์ชันตั้งโลโก้จาก user ======
  function setLogoFromUser(user) {
    const logoRoot = document.getElementById("logoRoot");
    if (!logoRoot) return;

    const imgSrc = user && (user.profilePicBase64 || user.profilePic);

    function getInitials(name) {
      if (!name) return "SP";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    }

    function setFallback() {
      logoRoot.innerHTML = "";
      logoRoot.textContent = getInitials(user && (user.name || user.username) || "SP");
      logoRoot.style.background = "#5865f2";
    }

    if (!imgSrc) {
      setFallback();
      return;
    }

    const img = new Image();
    img.onload = function() {
      logoRoot.innerHTML = "";
      logoRoot.appendChild(img);
    };
    img.onerror = function() {
      setFallback();
    };
    img.src = imgSrc;
    img.alt = user.name || user.username || "profile";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.display = "block";
  }

  // ====== แสดงโพสต์ ======
  function renderMessage(data, key) {
    const messagesArea = document.getElementById("messagesArea");
    const emptyState = document.getElementById("emptyState");

    const messageEl = document.createElement("div");
    messageEl.className = "message";
    messageEl.setAttribute("data-key", key);

    db.ref("Users/" + data.badgeId).once("value").then(userSnap => {
      const user = userSnap.val();
      let avatarHTML = "";
      if(user && (user.profilePicBase64 || user.profilePic)) {
        const imgSrc = user.profilePicBase64 || user.profilePic;
        avatarHTML = `<div class="message-avatar"><img src="${imgSrc}" alt="avatar" class="avatar-img"></div>`;
      } else {
        const initial = data.officerName ? data.officerName.charAt(0) : "S";
        avatarHTML = `<div class="message-avatar">${initial}</div>`;
      }

      const imgHTML = data.image ? `<img src="${data.image}" class="message-image">` : "";

      const currentOfficerId = Number(localStorage.getItem("badgeId")); 
      const isAdmin = localStorage.getItem("isAdmin") === "true";

      let actionButtons = "";
      if (data.badgeId === currentOfficerId) actionButtons += `<button class="edit-btn">✏️ แก้ไข</button>`;
      if (data.badgeId === currentOfficerId || isAdmin) actionButtons += `<button class="delete-btn">🗑️ ลบ</button>`;

      messageEl.innerHTML = `
        ${avatarHTML}
        <div class="message-content">
          <div class="message-header">
            <span class="message-author">${data.officerName} | ${data.callsign} | ${data.badgeId}</span>
            <span class="message-timestamp">${new Date(data.timestamp).toLocaleString("th-TH")}</span>
          </div>

          <div class="report-card">
            <h2>📑 EVIDENCE REPORT</h2>

            <div class="section">
              <h3>SUSPECT INFORMATION</h3>
              <ul>
                <li><strong>Suspect Name:</strong> ${data.suspect}</li>
                <li><strong>Evidence Type:</strong> ${data.type}</li>
                <li><strong>Item(s):</strong> ${data.items}</li>
              </ul>
            </div>

            <div class="section">
              <h3>EVIDENCE PICTURE</h3>
              ${imgHTML}
            </div>
          </div>

          <div class="message-actions">${actionButtons}</div>
        </div>
      `;

      messagesArea.appendChild(messageEl);
      if (emptyState) emptyState.style.display = "none";

      const editBtn = messageEl.querySelector(".edit-btn");
      if(editBtn){
        editBtn.addEventListener("click", () => {
          const newSuspect = prompt("แก้ไขชื่อผู้ต้องสงสัย:", data.suspect) || data.suspect;
          const newType = prompt("แก้ไขประเภทหลักฐาน:", data.type) || data.type;
          const newItems = prompt("แก้ไขรายการหลักฐาน:", data.items) || data.items;
          reportsRef.child(key).update({ suspect: newSuspect, type: newType, items: newItems });
        });
      }

      const deleteBtn = messageEl.querySelector(".delete-btn");
      if(deleteBtn){
        deleteBtn.addEventListener("click", () => {
          if(confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายงานนี้?")){
            reportsRef.child(key).remove();
          }
        });
      }

    }).catch(err => {
      console.warn("ไม่สามารถดึง user profile:", err);
      messageEl.innerHTML = `<div>${data.officerName || "Unknown"}</div>`;
      messagesArea.appendChild(messageEl);
    });
  }

  // ====== Listener realtime ======
  reportsRef.on("child_added", snap => {
    const data = snap.val();
    const key = snap.key;
    renderMessage(data, key);
  });

  reportsRef.on("child_removed", snap => {
    const key = snap.key;
    const el = document.querySelector(`.message[data-key="${key}"]`);
    if(el) el.remove();
  });

  reportsRef.on("child_changed", snap => {
    const data = snap.val();
    const key = snap.key;
    const el = document.querySelector(`.message[data-key="${key}"]`);
    if(el) el.remove();
    renderMessage(data, key);
  });

});