const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const firstName = localStorage.getItem("firstName");
const greetingElement = document.getElementById("greeting");
const logoutButton = document.getElementById("logout-btn");
if (!token || !firstName || (role !== "admin" && role !== "moderator")) {
    window.location.href = "login.html";
}
else if (greetingElement) {
    greetingElement.textContent = `Halo, ${firstName}`;
}
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("firstName");
        localStorage.removeItem("cart");
        window.location.href = "login.html";
    });
}
