// dashboard.js
// ตรวจสอบสิทธิ์ Admin
const adminBtn = document.getElementById("adminBtn");
const isAdmin = localStorage.getItem("isAdmin") === "true";

if (adminBtn) {
  if (isAdmin) {
    adminBtn.style.display = "block"; // แสดงปุ่ม Admin
  } else {
    adminBtn.style.display = "none"; // ซ่อนถ้าไม่ใช่ Admin
  }

  // คลิกปุ่ม Admin ไปหน้า Admincmds.html
  adminBtn.addEventListener("click", () => {
    window.location.href = "../Commands/Admincmds.html";
  });
}

