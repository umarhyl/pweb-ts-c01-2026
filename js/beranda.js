"use strict";
var PublicHomePage;
(function (PublicHomePage) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const destination = token && (role === "admin" || role === "moderator") ? "index.html"
        : token && role === "user" ? "operator.html" : "login.html";
    document.querySelectorAll("[data-staff-link]").forEach((link) => {
        link.href = destination;
        if (destination !== "login.html")
            link.textContent = role === "user" ? "Kembali ke Operator →" : "Kembali ke Dashboard →";
    });
})(PublicHomePage || (PublicHomePage = {}));
