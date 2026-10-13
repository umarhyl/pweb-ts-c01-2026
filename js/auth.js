"use strict";
var HospitalAuth;
(function (HospitalAuth) {
    function guard(page) {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        const firstName = localStorage.getItem("firstName");
        const validRole = role === "admin" || role === "moderator" || role === "user";
        const staffPage = page === "dashboard" || page === "operator";
        if (!token || !firstName || !validRole || (staffPage && role === "user")) {
            window.location.replace("login.html");
            return false;
        }
        document.querySelectorAll("[data-greeting]").forEach((item) => {
            item.textContent = `${firstName} · ${role === "moderator" ? "Moderator" : role === "admin" ? "Admin" : "User"}`;
        });
        if (role === "user")
            document.querySelectorAll("[data-admin-link]").forEach((item) => { item.hidden = true; });
        window.addEventListener("storage", (event) => {
            if (event.key !== "token" && event.key !== "role" && event.key !== "firstName" && event.key !== null)
                return;
            const currentRole = localStorage.getItem("role");
            if (!localStorage.getItem("token") || !localStorage.getItem("firstName")
                || (currentRole !== "admin" && currentRole !== "moderator" && currentRole !== "user")
                || (staffPage && currentRole === "user")) {
                window.location.replace("login.html");
            }
        });
        return true;
    }
    HospitalAuth.guard = guard;
    function bindLogout() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", () => {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("firstName");
                window.location.replace("login.html");
            });
        });
    }
    HospitalAuth.bindLogout = bindLogout;
})(HospitalAuth || (HospitalAuth = {}));
