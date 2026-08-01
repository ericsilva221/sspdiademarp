class AuthSystem {
    constructor() {
        this.useLocalStorage = false;

        this.init().catch(err => {
        });
    }
    async init() {

        if (!window.dbAPI || this.useLocalStorage) {

            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users['admin']) {

                delete users['admin'];
                localStorage.setItem('users', JSON.stringify(users));
            }

        }

        await this.checkAuth();

        const tryUpdateUI = (attempt = 1, maxAttempts = 5) => {

            let currentUser = null;
            try {
                currentUser = localStorage.getItem('currentUser');
            } catch (e) {

                try {
                    currentUser = sessionStorage.getItem('currentUser');
                } catch (e2) {

                }
            }

            if (currentUser) {
                try {
                    const user = JSON.parse(currentUser);

                    const headerTicketsAdminLink = document.getElementById('header-tickets-admin-link');
                    const headerAdminLink = document.getElementById('header-admin-link');

                    if (headerTicketsAdminLink || headerAdminLink || attempt >= maxAttempts) {
                        this.updateUI(user);
                    } else {
                        setTimeout(() => tryUpdateUI(attempt + 1, maxAttempts), attempt * 200);
                    }
                } catch (e) {
                }
            }
        };

        setTimeout(() => tryUpdateUI(), 500);

        setInterval(async () => {

            let currentUser = null;
            let useSessionStorage = false;
            try {
                currentUser = localStorage.getItem('currentUser');
            } catch (e) {

                try {
                    currentUser = sessionStorage.getItem('currentUser');
                    useSessionStorage = true;
                } catch (e2) {

                }
            }

            if (currentUser && window.dbAPI && typeof window.dbAPI.getUsers === 'function') {
                try {
                    const user = JSON.parse(currentUser);
                    if (user.username || user.id) {
                        const users = await window.dbAPI.getUsers();
                        const dbUser = users.find(u => u.username === user.username || u.id === user.id);
                        if (dbUser) {

                            let needsUpdate = false;
                            if (dbUser.role && dbUser.role !== user.role) {
                                user.role = dbUser.role;
                                needsUpdate = true;
                            }
                            if (dbUser.role2 !== user.role2) {
                                user.role2 = dbUser.role2 || null;
                                needsUpdate = true;
                            }

                            if (needsUpdate) {
                                try {
                                    if (useSessionStorage) {
                                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                                    } else {
                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                    }
                                } catch (storageError) {

                                    try {
                                        if (useSessionStorage) {
                                            localStorage.setItem('currentUser', JSON.stringify(user));
                                        } else {
                                            sessionStorage.setItem('currentUser', JSON.stringify(user));
                                        }
                                    } catch (e) {

                                    }
                                }
                                this.updateUI(user);
                            }
                        }
                    }
                } catch (error) {

                }
            }
        }, 5000);

        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser') {
                setTimeout(() => {
                    const currentUser = localStorage.getItem('currentUser');
                    if (currentUser) {
                        try {
                            const user = JSON.parse(currentUser);
                            this.updateUI(user);
                        } catch (err) {
                        }
                    } else {
                        this.updateUI(null);
                    }
                }, 100);
            }
        });

        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'currentUser' && window.auth) {
                setTimeout(() => {
                    try {
                        const user = value ? JSON.parse(value) : null;
                        window.auth.updateUI(user);
                    } catch (err) {
                    }
                }, 100);
            }
        };
    }
    async checkAuth() {

        if (this._checkingAuth) {
            return;
        }
        this._checkingAuth = true;

        try {

            let currentUser = null;
            let useSessionStorage = false;
            try {
                currentUser = localStorage.getItem('currentUser');
            } catch (e) {

                try {
                    currentUser = sessionStorage.getItem('currentUser');
                    useSessionStorage = true;
                } catch (e2) {

                }
            }

            if (currentUser) {
                const user = JSON.parse(currentUser);

                if (window.dbAPI && typeof window.dbAPI.getUsers === 'function' && user.username) {
                    try {
                        const users = await window.dbAPI.getUsers();
                        const dbUser = users.find(u => u.username === user.username || u.id === user.id);
                        if (dbUser) {

                            let needsUpdate = false;
                            const newRole = dbUser.role || user.role;
                            if (newRole && newRole !== user.role) {
                                user.role = newRole;
                                needsUpdate = true;
                            }

                            if (dbUser.role2 !== user.role2) {
                                user.role2 = dbUser.role2 || null;
                                needsUpdate = true;
                            }

                            if (needsUpdate) {

                                try {
                                    if (useSessionStorage) {
                                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                                    } else {
                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                    }
                                } catch (storageError) {

                                    try {
                                        if (useSessionStorage) {
                                            localStorage.setItem('currentUser', JSON.stringify(user));
                                        } else {
                                            sessionStorage.setItem('currentUser', JSON.stringify(user));
                                        }
                                    } catch (e) {

                                    }
                                }

                                setTimeout(() => this.updateUI(user), 100);
                            } else {
                                user.role = newRole;
                                user.role2 = dbUser.role2 || null;
                            }
                            user.email = dbUser.email || user.email;
                            user.id = dbUser.id || user.id;
                            try {
                                if (useSessionStorage) {
                                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                                } else {
                                    localStorage.setItem('currentUser', JSON.stringify(user));
                                }
                            } catch (storageError) {

                                try {
                                    if (useSessionStorage) {
                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                    } else {
                                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                                    }
                                } catch (e) {

                                }
                            }
                        } else {
                            // User not found in DB or DB list empty/inaccessible (403)
                            // Do NOT re-save to storage. Let the 403 handler in database-api-php.js do its job (clearing storage).
                            // In fact, if we didn't find the user, we should probably logout, but let's be passive.

                            /*
                            try {
                                if (useSessionStorage) {
                                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                                } else {
                                    localStorage.setItem('currentUser', JSON.stringify(user));
                                }
                            } catch (storageError) {
                                try {
                                    if (useSessionStorage) {
                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                    } else {
                                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                                    }
                                } catch (e) { }
                            }
                            */
                        }
                    } catch (error) {

                    }
                } else {

                    try {
                        const users = JSON.parse(localStorage.getItem('users') || '{}');
                        if (users[user.username] && users[user.username].role) {
                            user.role = users[user.username].role;
                            try {
                                if (useSessionStorage) {
                                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                                } else {
                                    localStorage.setItem('currentUser', JSON.stringify(user));
                                }
                            } catch (storageError) {

                                try {
                                    if (useSessionStorage) {
                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                    } else {
                                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                                    }
                                } catch (e) {

                                }
                            }
                        }
                    } catch (e) {

                    }
                }

                if (!window.location.pathname.includes('login')) {
                    this.updateUI(user);
                }
            }
        } catch (error) {

            try {

                const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
                if (!storedUser) {

                }

            } catch (e) {

            }
        } finally {
            this._checkingAuth = false;
        }
    }

    logout() {

        if (window.adminLogger) {
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                window.adminLogger.logLogout(
                    currentUser.username || 'Desconhecido',
                    currentUser.email || 'N/A',
                    currentUser.role || 'N/A'
                ).catch(err => {

                });
            }
        }

        localStorage.removeItem('currentUser');
        this.updateUI(null);
        window.location.href = '/';
    }
    async register(username, password, email, recaptchaToken = null, discordId = null) {
        try {

            if (!discordId || discordId.trim() === '') {
                return { success: false, message: 'ID do Discord é obrigatório' };
            }

            if (!/^\d{17,19}$/.test(discordId.trim())) {
                return { success: false, message: 'ID do Discord inválido! Deve ser um número com 17-19 dígitos.' };
            }

            if (window.dbAPI && typeof window.dbAPI.createUser === 'function') {

                const existingUsers = await window.dbAPI.getUsers();
                const userExists = existingUsers.find(u => u.username === username || u.email === email);

                if (userExists) {
                    if (userExists.username === username) {
                        return { success: false, message: 'Usuário já existe' };
                    }
                    if (userExists.email === email) {
                        return { success: false, message: 'E-mail já está em uso' };
                    }
                }

                const discordLinked = existingUsers.find(u => u.discord_id === discordId.trim());
                if (discordLinked) {
                    return { success: false, message: 'Este ID do Discord já está vinculado a outra conta' };
                }

                const userData = {
                    username,
                    password,
                    email,
                    role: 'user',
                    recaptchaToken: recaptchaToken,
                    discord_id: discordId.trim(),
                };

                const result = await window.dbAPI.createUser(userData);

                if (result && result.success) {
                    return {
                        success: true,
                        message: 'Conta criada com sucesso!'
                    };
                } else {
                    throw new Error(result?.error || result?.message || 'Erro ao criar usuário');
                }
            } else {

                const users = JSON.parse(localStorage.getItem('users') || '{}');
                if (users[username]) {
                    return { success: false, message: 'Usuário já existe' };
                }
                const existingUser = Object.values(users).find(u => u.email === email);
                if (existingUser) {
                    return { success: false, message: 'E-mail já está em uso' };
                }
                users[username] = {
                    username,
                    password,
                    email,
                    role: 'user',
                    createdAt: new Date().toISOString()
                };
                localStorage.setItem('users', JSON.stringify(users));
                return {
                    success: true,
                    message: 'Usuário criado com sucesso! (salvo localmente)'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Erro ao criar conta. Tente novamente.'
            };
        }
    }
    changePassword(username, oldPassword, newPassword) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username] || users[username].password !== oldPassword) {
            return { success: false, message: 'Senha atual incorreta' };
        }
        users[username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Senha alterada com sucesso' };
    }
    getCurrentUser() {

        try {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                try {
                    return JSON.parse(currentUser);
                } catch (e) {

                }
            }
        } catch (localError) {

        }

        try {
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                try {
                    return JSON.parse(sessionUser);
                } catch (e) {
                    return null;
                }
            }
        } catch (sessionError) {

        }

        return null;
    }

    normalizeRole(role) {
        if (!role) return null;
        let normalized = String(role).toLowerCase().trim();
        normalized = normalized.replace(/\s+/g, '').replace(/_/g, '/');
        if (normalized === 'em/pm' || normalized === 'em_pm' || normalized === 'empm') {
            normalized = 'em/pm';
        }
        return normalized;
    }

    hasAnyRole(user, roles) {
        if (!user || !Array.isArray(roles)) return false;
        const normalizedRoles = roles.map(r => this.normalizeRole(r));
        const userRole = this.normalizeRole(user.role);
        const userRole2 = this.normalizeRole(user.role2);
        return (userRole && normalizedRoles.includes(userRole)) ||
            (userRole2 && normalizedRoles.includes(userRole2));
    }

    isAdminRole(role) {
        const adminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'rf'];
        return role && adminRoles.includes(role.toLowerCase());
    }

    isAdmin() {
        const user = this.getCurrentUser();
        if (!user) return false;
        const adminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'rf'];
        return this.hasAnyRole(user, adminRoles);
    }
    isGovernador() {
        const user = this.getCurrentUser();
        return user && (this.normalizeRole(user.role) === 'governador' || this.normalizeRole(user.role2) === 'governador');
    }
    isComandante() {
        const user = this.getCurrentUser();
        return user && (this.normalizeRole(user.role) === 'comandante' || this.normalizeRole(user.role2) === 'comandante');
    }
    isP5() {
        const user = this.getCurrentUser();
        return user && (this.normalizeRole(user.role) === 'p5' || this.normalizeRole(user.role2) === 'p5');
    }
    isPolicial() {
        const user = this.getCurrentUser();
        return user && (this.normalizeRole(user.role) === 'policial' || this.normalizeRole(user.role2) === 'policial');
    }
    hasPermission(panel) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const role = this.normalizeRole(user.role);
        const role2 = this.normalizeRole(user.role2);

        const checkRole = (r) => {
            if (!r) return false;

            if (r === 'admin' || r === 'em/pm' || r === 'ssp') return true;

            if (panel === 'users') {
                return r === 'admin' || r === 'em/pm' || r === 'ssp';
            }

            if (panel === 'banner') {
                return r === 'admin' || r === 'em/pm' || r === 'ssp';
            }

            if (panel === 'formularios') {
                return (r !== 'policial' && r !== 'user') || r === 'rf';
            }

            if (r === 'governador') {
                return panel === 'news' || panel === 'videos' || panel === 'activities' ||
                    panel === 'numbers' || panel === 'concursos' || panel === 'diario';
            }

            if (r === 'comandante') {
                return panel === 'news' || panel === 'videos' || panel === 'activities' ||
                    panel === 'numbers' || panel === 'concursos';
            }

            if (r === 'p5') {
                return panel === 'news' || panel === 'videos' || panel === 'activities' || panel === 'numbers' || panel === 'concursos';
            }

            return false;
        };

        return checkRole(role) || checkRole(role2);
    }
    createUser(username, password, email, role = 'user') {
        if (!this.isAdmin()) {
            return { success: false, message: 'Apenas administradores podem criar usuários' };
        }
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (users[username]) {
            return { success: false, message: 'Usuário já existe' };
        }
        const existingUser = Object.values(users).find(u => u.email === email);
        if (existingUser) {
            return { success: false, message: 'E-mail já está em uso' };
        }
        const validRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'policial', 'user', 'corregedoria', 'gcg', 'em/pm', 'dec', 'coordop', 'rf'];
        if (!validRoles.includes(role)) {
            return { success: false, message: 'Cargo inválido' };
        }
        users[username] = {
            username,
            password,
            email,
            role: role,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Usuário criado com sucesso' };
    }
    changeUserPassword(username, newPassword) {
        if (!this.isAdmin()) {
            return { success: false, message: 'Apenas administradores podem alterar senhas' };
        }
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        if (!users[username]) {
            return { success: false, message: 'Usuário não encontrado' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'A senha deve ter no mínimo 6 caracteres' };
        }
        users[username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, message: 'Senha alterada com sucesso' };
    }

    async sendVerificationEmail(email) {
        try {
            const response = await fetch('/api/php/send-email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'send_verification',
                    email: email
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Erro desconhecido');
                return {
                    success: false,
                    message: 'Erro ao enviar e-mail de verificação. Status: ' + response.status
                };
            }

            const responseText = await response.text();

            if (!responseText || responseText.trim() === '') {
                return {
                    success: false,
                    message: 'Resposta vazia do servidor ao enviar e-mail de verificação'
                };
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {

                return {
                    success: false,
                    message: 'Resposta inválida do servidor. A conta foi criada, mas não foi possível enviar o e-mail de verificação.',
                    rawResponse: responseText.substring(0, 200)
                };
            }

            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao enviar e-mail de verificação: ' + (error.message || 'Erro desconhecido')
            };
        }
    }

    async verifyEmail(email, token) {
        try {
            const response = await fetch('/api/php/verify-email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    token: token
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao verificar e-mail: ' + error.message
            };
        }
    }

    async forgotPassword(email) {
        try {
            const response = await fetch('/api/php/send-email.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'send_password_reset',
                    email: email
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao solicitar recuperação de senha: ' + error.message
            };
        }
    }

    async resetPassword(email, token, newPassword) {
        try {
            const response = await fetch('/api/php/reset-password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    token: token,
                    new_password: newPassword
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Erro ao redefinir senha: ' + error.message
            };
        }
    }
    updateUI(user) {

        const headerLoginBtn = document.getElementById('header-login-btn');
        const headerRegisterBtn = document.getElementById('header-register-btn');
        const headerUserMenu = document.getElementById('header-user-menu');
        const headerTicketsAdminLink = document.getElementById('header-tickets-admin-link');
        const headerAdminLink = document.getElementById('header-admin-link');
        const userNameHeader = document.querySelector('.user-name-header');

        if (user) {
            if (headerLoginBtn) headerLoginBtn.style.display = 'none';
            if (headerRegisterBtn) headerRegisterBtn.style.display = 'none';
            if (headerUserMenu) {
                headerUserMenu.style.display = 'flex';
                if (userNameHeader) userNameHeader.textContent = user.username;
            }

            const userRole = this.normalizeRole(user.role);
            const userRole2 = this.normalizeRole(user.role2);

            const ticketRoles = ['corregedoria', 'gcg', 'em/pm', 'dec', 'coordop'];

            const hasTicketAccess = this.hasAnyRole(user, ticketRoles);

            const adminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'rf'];
            const hasAdminAccess = this.hasAnyRole(user, adminRoles);

            const finalHasTicketAccess = hasTicketAccess || hasAdminAccess;

            const isCoordop = userRole === 'coordop' || userRole2 === 'coordop';

            if (headerTicketsAdminLink) {
                if (finalHasTicketAccess) {
                    headerTicketsAdminLink.style.display = 'flex';
                    headerTicketsAdminLink.style.visibility = 'visible';

                    headerTicketsAdminLink.removeAttribute('hidden');
                } else {
                    if (!isCoordop) {
                        headerTicketsAdminLink.style.display = 'none';
                    }
                }
            } else {

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        const retryTicketsLink = document.getElementById('header-tickets-admin-link');
                        const retryAdminLink = document.getElementById('header-admin-link');
                        if (retryTicketsLink || retryAdminLink) {
                            const retryUser = localStorage.getItem('currentUser');
                            if (retryUser) {
                                try {
                                    const retryUserObj = JSON.parse(retryUser);

                                    const retryHasAccess = this.hasAnyRole(retryUserObj, ticketRoles);
                                    const retryAdminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'rf'];
                                    const retryHasAdminAccess = this.hasAnyRole(retryUserObj, retryAdminRoles);

                                    if (retryTicketsLink && (retryHasAccess || retryHasAdminAccess)) {
                                        retryTicketsLink.style.display = 'flex';
                                        retryTicketsLink.style.visibility = 'visible';
                                        retryTicketsLink.removeAttribute('hidden');
                                    }

                                    if (retryAdminLink && retryHasAdminAccess) {
                                        retryAdminLink.style.display = 'flex';
                                        retryAdminLink.style.visibility = 'visible';
                                        retryAdminLink.removeAttribute('hidden');
                                    }
                                } catch (e) {

                                }
                            }
                        }
                    });
                } else {

                    setTimeout(() => {
                        const retryTicketsLink = document.getElementById('header-tickets-admin-link');
                        const retryAdminLink = document.getElementById('header-admin-link');
                        const retryUser = localStorage.getItem('currentUser');
                        if ((retryTicketsLink || retryAdminLink) && retryUser) {
                            try {
                                const retryUserObj = JSON.parse(retryUser);

                                const retryHasAccess = this.hasAnyRole(retryUserObj, ticketRoles);
                                const retryAdminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5'];
                                const retryHasAdminAccess = this.hasAnyRole(retryUserObj, retryAdminRoles);

                                if (retryTicketsLink && (retryHasAccess || retryHasAdminAccess)) {
                                    retryTicketsLink.style.display = 'flex';
                                    retryTicketsLink.style.visibility = 'visible';
                                    retryTicketsLink.removeAttribute('hidden');
                                }

                                if (retryAdminLink && retryHasAdminAccess) {
                                    retryAdminLink.style.display = 'flex';
                                    retryAdminLink.style.visibility = 'visible';
                                    retryAdminLink.removeAttribute('hidden');
                                }
                            } catch (e) {

                            }
                        }
                    }, 200);

                    setTimeout(() => {
                        const finalTicketsLink = document.getElementById('header-tickets-admin-link');
                        const finalAdminLink = document.getElementById('header-admin-link');
                        const finalUser = localStorage.getItem('currentUser');
                        if ((finalTicketsLink || finalAdminLink) && finalUser) {
                            try {
                                const finalUserObj = JSON.parse(finalUser);

                                const finalHasAccess = this.hasAnyRole(finalUserObj, ticketRoles);
                                const finalAdminRoles = ['admin', 'ssp', 'governador', 'comandante', 'p5', 'rf'];
                                const finalHasAdminAccess = this.hasAnyRole(finalUserObj, finalAdminRoles);

                                if (finalTicketsLink && (finalHasAccess || finalHasAdminAccess)) {
                                    finalTicketsLink.style.display = 'flex';
                                    finalTicketsLink.style.visibility = 'visible';
                                    finalTicketsLink.removeAttribute('hidden');
                                }

                                if (finalAdminLink && finalHasAdminAccess) {
                                    finalAdminLink.style.display = 'flex';
                                    finalAdminLink.style.visibility = 'visible';
                                    finalAdminLink.removeAttribute('hidden');
                                }
                            } catch (e) {

                            }
                        }
                    }, 1000);
                }
            }

            if (headerAdminLink) {
                if (hasAdminAccess) {
                    headerAdminLink.style.display = 'flex';
                } else {
                    headerAdminLink.style.display = 'none';
                }
            } else {
            }
        } else {
            if (headerLoginBtn) headerLoginBtn.style.display = 'flex';
            if (headerRegisterBtn) headerRegisterBtn.style.display = 'flex';
            if (headerUserMenu) headerUserMenu.style.display = 'none';
        }
    }
}
const auth = new AuthSystem();
