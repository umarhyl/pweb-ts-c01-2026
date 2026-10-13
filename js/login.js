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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, expiresInMins: 30 })
            });
            if (response.status === 401) {
                throw new Error("INVALID_CREDENTIALS");
            }
            if (!response.ok) {
                throw new Error("SERVER_ERROR");
            }
            const data = await response.json();
            const token = data.accessToken ?? data.token;
            if (!token || !data.firstName || !data.id) {
                throw new Error("INVALID_RESPONSE");
            }
            let role = data.role;
            if (!role) {
                const userResponse = await fetch(`https://dummyjson.com/users/${data.id}`);
                if (!userResponse.ok) {
                    throw new Error("SERVER_ERROR");
                }
                const userData = await userResponse.json();
                role = userData.role;
            }
            if (!role) {
                throw new Error("INVALID_RESPONSE");
            }
            role = role.toLowerCase();
            localStorage.setItem("token", token);
            localStorage.setItem("role", role);
            localStorage.setItem("firstName", data.firstName);
            window.location.href = role === "admin" || role === "moderator"
                ? "index.html"
                : "ambil-antrian.html";
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
