(function () {
    const storageKey = "spMedPortalSession";

    const profileMap = {
        doctor: {
            name: "Врач отделения",
            role: "Врач",
            greeting: "Рабочая панель врача готова к смене"
        },
        nurse: {
            name: "Медицинская сестра",
            role: "Медсестра",
            greeting: "Добро пожаловать в кабинет отделения"
        },
        admin: {
            name: "Администратор портала",
            role: "Администратор",
            greeting: "Панель управления порталом готова"
        },
        default: {
            name: "Сотрудник учреждения",
            role: "Персонал",
            greeting: "Добро пожаловать в портал"
        }
    };

    function readSession() {
        try {
            const raw = window.localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function writeSession(session) {
        window.localStorage.setItem(storageKey, JSON.stringify(session));
    }

    function clearSession() {
        window.localStorage.removeItem(storageKey);
    }

    function getProfile(email) {
        const localPart = String(email || "").split("@")[0].toLowerCase();
        if (localPart.includes("doctor")) {
            return profileMap.doctor;
        }
        if (localPart.includes("nurse")) {
            return profileMap.nurse;
        }
        if (localPart.includes("admin")) {
            return profileMap.admin;
        }
        return profileMap.default;
    }

    function formatDate() {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date());
    }

    function handleLoginPage() {
        const form = document.getElementById("login-form");
        if (!form) {
            return;
        }

        const message = document.getElementById("form-message");
        const session = readSession();
        if (session) {
            window.location.href = "dashboard.html";
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            const email = String(formData.get("email") || "").trim();
            const password = String(formData.get("password") || "").trim();

            if (!email || !password || password.length < 6) {
                message.textContent = "Проверьте почту и длину пароля.";
                message.className = "form-message error";
                return;
            }

            const profile = getProfile(email);
            writeSession({
                email: email,
                name: profile.name,
                role: profile.role,
                greeting: profile.greeting,
                signedInAt: new Date().toISOString()
            });

            message.textContent = "Вход выполнен. Переходим в кабинет.";
            message.className = "form-message success";

            window.setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 320);
        });
    }

    function handleDashboardPage() {
        const emailNode = document.getElementById("session-email");
        if (!emailNode) {
            return;
        }

        const session = readSession();
        if (!session) {
            window.location.href = "login.html";
            return;
        }

        const nameNode = document.getElementById("session-name");
        const roleNode = document.getElementById("session-role");
        const greetingNode = document.getElementById("greeting-title");
        const dateNode = document.getElementById("current-date");

        emailNode.textContent = session.email || "demo@sp-medportal.ru";
        if (nameNode) {
            nameNode.textContent = session.name || "Сотрудник учреждения";
        }
        if (roleNode) {
            roleNode.textContent = session.role || "Персонал";
        }
        if (greetingNode) {
            greetingNode.textContent = session.greeting || "Добро пожаловать в портал";
        }
        if (dateNode) {
            dateNode.textContent = formatDate();
        }

        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                clearSession();
                window.location.href = "login.html";
            });
        }
    }

    handleLoginPage();
    handleDashboardPage();
})();
