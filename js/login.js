"use strict";
function isLoginRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const errorMessage = document.querySelector("#error-message");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
if (loginForm && loginButton && errorMessage && usernameInput && passwordInput) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        errorMessage.textContent = "";
        if (!username || !password) {
            errorMessage.textContent = "Username dan password wajib diisi.";
            return;
        }
        loginButton.disabled = true;
        loginButton.setAttribute("aria-busy", "true");
        loginButton.textContent = "Memverifikasi...";
        try {
            const response = await fetch("https://dummyjson.com/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    password,
                    expiresInMins: 30
                })
            });
            if (response.status === 400 || response.status === 401) {
                throw new Error("INVALID_CREDENTIALS");
            }
            if (!response.ok) {
                throw new Error("SERVER_ERROR");
            }
            const data = await response.json();
            if (!isLoginRecord(data))
                throw new Error("INVALID_RESPONSE");
            const token = typeof data.accessToken === "string" ? data.accessToken
                : typeof data.token === "string" ? data.token : "";
            const firstName = typeof data.firstName === "string" ? data.firstName : "";
            const id = typeof data.id === "number" && Number.isSafeInteger(data.id) ? data.id : 0;
            if (!token || !firstName || !id) {
                throw new Error("INVALID_RESPONSE");
            }
            let role = typeof data.role === "string" ? data.role : "";
            if (!role) {
                const userResponse = await fetch(`https://dummyjson.com/users/${id}`);
                if (!userResponse.ok) {
                    throw new Error("SERVER_ERROR");
                }
                const userData = await userResponse.json();
                role = isLoginRecord(userData) && typeof userData.role === "string" ? userData.role : "";
            }
            if (!role) {
                throw new Error("INVALID_RESPONSE");
            }
            role = role.toLowerCase();
            if (role !== "admin" && role !== "moderator" && role !== "user") {
                throw new Error("INVALID_RESPONSE");
            }
            localStorage.setItem("token", token);
            localStorage.setItem("role", role);
            localStorage.setItem("firstName", firstName);
            const destination = role === "admin" || role === "moderator"
                ? "index.html" : "operator.html";
            window.location.href = destination;
        }
        catch (error) {
            const errorCode = error instanceof Error ? error.message : "";
            errorMessage.textContent = errorCode === "INVALID_CREDENTIALS"
                ? "Username atau password salah."
                : "Tidak dapat terhubung ke server. Silakan coba lagi.";
            loginButton.disabled = false;
            loginButton.removeAttribute("aria-busy");
            loginButton.textContent = "Masuk →";
        }
    });
}
