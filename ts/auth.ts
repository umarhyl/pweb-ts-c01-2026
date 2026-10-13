namespace HospitalAuth {
  export type Role = "admin" | "moderator" | "user";

  export function guard(page: "dashboard" | "operator"): boolean {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const firstName = localStorage.getItem("firstName");
    const validRole = role === "admin" || role === "moderator" || role === "user";
    if (!token || !firstName || !validRole || (page === "dashboard" && role === "user")) {
      window.location.replace("login.html");
      return false;
    }
    document.querySelectorAll<HTMLElement>("[data-greeting]").forEach((item) => {
      item.textContent = `${firstName} · ${role === "moderator" ? "Moderator" : role === "admin" ? "Admin" : "User"}`;
    });
    if (role === "user") document.querySelectorAll<HTMLElement>("[data-admin-link]").forEach((item) => { item.hidden = true; });
    window.addEventListener("storage", (event) => {
      if (event.key !== "token" && event.key !== "role" && event.key !== "firstName" && event.key !== null) return;
      const currentRole = localStorage.getItem("role");
      if (!localStorage.getItem("token") || !localStorage.getItem("firstName")
        || (currentRole !== "admin" && currentRole !== "moderator" && currentRole !== "user")
        || (page === "dashboard" && currentRole === "user")) {
        window.location.replace("login.html");
      }
    });
    return true;
  }

  export function bindLogout(): void {
    document.querySelectorAll<HTMLButtonElement>("[data-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("firstName");
        window.location.replace("login.html");
      });
    });
  }
}
