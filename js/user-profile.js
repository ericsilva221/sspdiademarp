class UserProfile {
    constructor() {
        this.modal = null;
        this.init();
    }

    getCurrentUser() {
        // Tenta obter o usuário de múltiplas formas
        let currentUser = null;
        
        // Primeiro tenta via window.auth
        if (window.auth && typeof window.auth.getCurrentUser === 'function') {
            try {
                currentUser = window.auth.getCurrentUser();
                if (currentUser) {
                    return currentUser;
                }
            } catch (e) {
                console.warn('[UserProfile] Erro ao obter usuário via window.auth:', e);
            }
        }
        
        // Se não encontrou, tenta localStorage/sessionStorage diretamente
        try {
            const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
            if (userStr) {
                currentUser = JSON.parse(userStr);
                if (currentUser && (currentUser.username || currentUser.id)) {
                    return currentUser;
                }
            }
        } catch (e) {
            console.warn('[UserProfile] Erro ao obter usuário do storage:', e);
        }
        
        return null;
    }

    init() {
        // Aguarda o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupModal();
                // Tenta adicionar o botão várias vezes com delays crescentes
                this.attemptAddButton(0);
            });
        } else {
            this.setupModal();
            this.attemptAddButton(0);
        }

        // Observa mudanças no menu do usuário
        this.observeUserMenu();
    }

    attemptAddButton(attempt = 0) {
        const maxAttempts = 10;
        const delay = attempt * 200; // 0ms, 200ms, 400ms, etc.
        
        setTimeout(() => {
            const userMenu = document.getElementById('header-user-menu');
            const currentUser = this.getCurrentUser();
            
            if (userMenu && currentUser) {
                const computedStyle = window.getComputedStyle(userMenu);
                const isVisible = userMenu.style.display !== 'none' && 
                                 userMenu.getAttribute('hidden') === null &&
                                 computedStyle.display !== 'none' &&
                                 computedStyle.visibility !== 'hidden';
                
                if (isVisible) {
                    this.addEditProfileButton();
                } else if (attempt < maxAttempts) {
                    this.attemptAddButton(attempt + 1);
                }
            } else if (attempt < maxAttempts) {
                this.attemptAddButton(attempt + 1);
            }
        }, delay);
    }

    addEditProfileButton() {
        const userMenu = document.getElementById('header-user-menu');
        if (!userMenu) return;

        // Verifica se o menu está visível (usuário logado)
        const computedStyle = window.getComputedStyle(userMenu);
        const isHidden = userMenu.style.display === 'none' || 
                        userMenu.getAttribute('hidden') !== null ||
                        computedStyle.display === 'none' ||
                        computedStyle.visibility === 'hidden';
        
        if (isHidden) {
            return;
        }

        // Verifica se o botão já existe
        if (document.getElementById('header-edit-profile-link')) return;

        // Verifica se o usuário está realmente logado
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            return;
        }

        // Encontra o botão de logout para inserir antes dele
        const logoutLink = userMenu.querySelector('a[onclick*="auth.logout"]');
        if (!logoutLink) return;

        // Cria o botão de editar perfil
        const editProfileLink = document.createElement('a');
        editProfileLink.id = 'header-edit-profile-link';
        editProfileLink.href = '#';
        editProfileLink.className = 'auth-link';
        editProfileLink.onclick = (e) => {
            e.preventDefault();
            this.openModal();
            return false;
        };
        editProfileLink.innerHTML = `
            <i class="fas fa-user-edit"></i>
            <span>Editar Perfil</span>
        `;

        // Insere antes do botão de logout
        logoutLink.parentNode.insertBefore(editProfileLink, logoutLink);
    }

    observeUserMenu() {
        // Observa mudanças no DOM para adicionar o botão quando o menu aparecer
        const observer = new MutationObserver(() => {
            const userMenu = document.getElementById('header-user-menu');
            if (!userMenu || document.getElementById('header-edit-profile-link')) {
                return;
            }
            
            // Verifica se o menu está visível
            const computedStyle = window.getComputedStyle(userMenu);
            const isVisible = userMenu.style.display !== 'none' && 
                             userMenu.getAttribute('hidden') === null &&
                             computedStyle.display !== 'none' &&
                             computedStyle.visibility !== 'hidden';
            
            if (isVisible) {
                // Verifica se o usuário está logado antes de adicionar o botão
                const currentUser = this.getCurrentUser();
                if (currentUser) {
                    this.addEditProfileButton();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'display', 'hidden', 'visibility']
        });
    }

    setupModal() {
        // Cria o modal se não existir
        if (!document.getElementById('user-profile-modal')) {
            this.createModal();
        }
        this.modal = document.getElementById('user-profile-modal');
        
        // Garante que o modal está fechado inicialmente
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    createModal() {
        // Adiciona estilos CSS específicos para o modal de perfil
        if (!document.getElementById('user-profile-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'user-profile-modal-styles';
            style.textContent = `
                #user-profile-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 10000;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease-out;
                }
                
                #user-profile-modal.show {
                    display: flex !important;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                #user-profile-modal-content {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 0;
                    max-width: 520px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    position: relative;
                    animation: slideUp 0.3s ease-out;
                    display: flex;
                    flex-direction: column;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                #user-profile-modal-header {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    color: white;
                    padding: 24px 30px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-radius: 16px 16px 0 0;
                }
                
                #user-profile-modal-header h2 {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                #user-profile-modal-header h2 i {
                    font-size: 20px;
                }
                
                #user-profile-modal-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    font-size: 24px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    line-height: 1;
                    padding: 0;
                }
                
                #user-profile-modal-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: rotate(90deg);
                }
                
                #user-profile-modal-body {
                    padding: 30px;
                }
                
                #user-profile-form .form-group {
                    margin-bottom: 24px;
                }
                
                #user-profile-form .form-group:last-of-type {
                    margin-bottom: 0;
                }
                
                #user-profile-form label {
                    display: block;
                    margin-bottom: 8px;
                    color: #1f2937;
                    font-weight: 600;
                    font-size: 14px;
                }
                
                #user-profile-form input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 15px;
                    box-sizing: border-box;
                    font-family: inherit;
                    transition: all 0.2s;
                    background: #ffffff;
                }
                
                #user-profile-form input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                #user-profile-form small {
                    display: block;
                    margin-top: 6px;
                    color: #6b7280;
                    font-size: 13px;
                    line-height: 1.5;
                }
                
                #user-profile-form small i {
                    margin-right: 4px;
                    color: #3b82f6;
                }
                
                #user-profile-modal-footer {
                    padding: 20px 30px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    border-radius: 0 0 16px 16px;
                }
                
                #user-profile-modal-footer button {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                #user-profile-modal-footer .btn-primary {
                    background: #3b82f6;
                    color: white;
                }
                
                #user-profile-modal-footer .btn-primary:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
                
                #user-profile-modal-footer .btn-primary:active {
                    transform: translateY(0);
                }
                
                #user-profile-modal-footer .btn-secondary {
                    background: #ffffff;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                }
                
                #user-profile-modal-footer .btn-secondary:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                    color: #374151;
                }
                
                #user-profile-modal-footer .btn-primary:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    #user-profile-modal-content {
                        background: #1f2937;
                    }
                    
                    #user-profile-form label {
                        color: #f9fafb;
                    }
                    
                    #user-profile-form input {
                        background: #374151;
                        border-color: #4b5563;
                        color: #f9fafb;
                    }
                    
                    #user-profile-form input:focus {
                        border-color: #3b82f6;
                    }
                    
                    #user-profile-form small {
                        color: #9ca3af;
                    }
                    
                    #user-profile-modal-footer {
                        background: #111827;
                        border-top-color: #374151;
                    }
                    
                    #user-profile-modal-footer .btn-secondary {
                        background: #374151;
                        color: #f9fafb;
                        border-color: #4b5563;
                    }
                    
                    #user-profile-modal-footer .btn-secondary:hover {
                        background: #4b5563;
                        border-color: #6b7280;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        const modalHTML = `
            <div id="user-profile-modal">
                <div id="user-profile-modal-content">
                    <div id="user-profile-modal-header">
                        <h2>
                            <i class="fas fa-user-edit"></i>
                            Editar Perfil
                        </h2>
                        <button id="user-profile-modal-close" onclick="userProfile.closeModal()" aria-label="Fechar">
                            &times;
                        </button>
                    </div>
                    <div id="user-profile-modal-body">
                        <form id="user-profile-form">
                            <div class="form-group">
                                <label for="profile-username">
                                    <i class="fas fa-user"></i> Nome de Usuário
                                </label>
                                <input 
                                    type="text" 
                                    id="profile-username" 
                                    name="username" 
                                    required
                                    autocomplete="username"
                                >
                                <small>
                                    <i class="fas fa-info-circle"></i>
                                    Você pode alterar seu nome de usuário a qualquer momento
                                </small>
                            </div>
                            <div class="form-group">
                                <label for="profile-discord-id">
                                    <i class="fab fa-discord"></i> ID do Discord
                                </label>
                                <input 
                                    type="text" 
                                    id="profile-discord-id" 
                                    name="discord_id" 
                                    placeholder="123456789012345678"
                                    autocomplete="off"
                                >
                                <small>
                                    <i class="fas fa-info-circle"></i>
                                    ID do Discord deve ter 17-19 dígitos. Deixe em branco para remover o vínculo.
                                </small>
                            </div>
                        </form>
                    </div>
                    <div id="user-profile-modal-footer">
                        <button type="button" class="btn-secondary" onclick="userProfile.closeModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" form="user-profile-form" class="btn-primary">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adiciona event listener ao formulário
        const form = document.getElementById('user-profile-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Fecha ao clicar fora do modal
        const modal = document.getElementById('user-profile-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    async openModal() {
        // Tenta obter o usuário
        let currentUser = this.getCurrentUser();
        
        // Se não encontrou, tenta novamente após um pequeno delay (pode ser problema de timing)
        if (!currentUser) {
            await new Promise(resolve => setTimeout(resolve, 100));
            currentUser = this.getCurrentUser();
        }
        
        if (!currentUser) {
            this.showAlert('Você precisa estar logado para editar seu perfil', 'error');
            return;
        }

        // Garante que o modal existe
        if (!this.modal) {
            this.setupModal();
            this.modal = document.getElementById('user-profile-modal');
        }

        // Preenche o formulário com os dados atuais
        const usernameField = document.getElementById('profile-username');
        const discordIdField = document.getElementById('profile-discord-id');
        
        if (usernameField) {
            usernameField.value = currentUser.username || '';
        }
        
        if (discordIdField) {
            discordIdField.value = currentUser.discord_id || '';
        }

        // Abre o modal
        if (this.modal) {
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Previne scroll do body
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
            document.body.style.overflow = ''; // Restaura scroll do body
        }
        
        // Limpa o formulário
        const form = document.getElementById('user-profile-form');
        if (form) {
            form.reset();
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Obtém o usuário atual
        const currentUser = this.getCurrentUser();
        
        if (!currentUser || !currentUser.id) {
            this.showAlert('Erro: Usuário não encontrado. Faça login novamente.', 'error');
            return;
        }

        const usernameField = document.getElementById('profile-username');
        const discordIdField = document.getElementById('profile-discord-id');
        
        if (!usernameField || !discordIdField) {
            this.showAlert('Erro: Campos do formulário não encontrados', 'error');
            return;
        }

        const username = usernameField.value.trim();
        const discordId = discordIdField.value.trim();

        // Validações
        if (!username) {
            this.showAlert('O nome de usuário é obrigatório', 'error');
            return;
        }

        if (discordId && !/^\d{17,19}$/.test(discordId)) {
            this.showAlert('ID do Discord inválido! Deve ser um número com 17-19 dígitos.', 'error');
            return;
        }

        // Verifica se o username já existe (se mudou)
        if (username !== currentUser.username) {
            try {
                if (window.dbAPI && typeof window.dbAPI.getUsers === 'function') {
                    const users = await window.dbAPI.getUsers();
                    const userExists = users.find(u => u.username === username && u.id !== currentUser.id);
                    
                    if (userExists) {
                        this.showAlert('Este nome de usuário já está em uso', 'error');
                        return;
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar usuário existente:', error);
            }
        }

        // Verifica se o discord_id já está em uso (se mudou ou foi adicionado)
        if (discordId && discordId !== (currentUser.discord_id || '')) {
            try {
                if (window.dbAPI && typeof window.dbAPI.getUsers === 'function') {
                    const users = await window.dbAPI.getUsers();
                    const discordLinked = users.find(u => u.discord_id === discordId && u.id !== currentUser.id);
                    
                    if (discordLinked) {
                        this.showAlert('Este ID do Discord já está vinculado a outra conta', 'error');
                        return;
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar Discord ID existente:', error);
            }
        }

        // Desabilita o botão de submit
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }

        try {
            // Prepara os dados para atualização
            const updateData = {
                username: username
            };

            // Adiciona ou remove discord_id
            if (discordId) {
                updateData.discord_id = discordId;
            } else {
                // Se estava preenchido e agora está vazio, remove
                updateData.discord_id = null;
            }

            // Atualiza o usuário
            if (window.dbAPI && typeof window.dbAPI.updateUser === 'function') {
                const result = await window.dbAPI.updateUser(currentUser.id, updateData);
                
                if (result && result.success) {
                    // Atualiza o usuário no storage
                    const updatedUser = {
                        ...currentUser,
                        username: username,
                        discord_id: discordId || null
                    };

                    // Atualiza localStorage/sessionStorage
                    try {
                        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
                        const useSessionStorage = !localStorage.getItem('currentUser');
                        
                        if (useSessionStorage) {
                            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        } else {
                            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        }
                    } catch (storageError) {
                        console.error('Erro ao atualizar storage:', storageError);
                    }

                    // Atualiza a UI
                    if (window.auth && typeof window.auth.updateUI === 'function') {
                        window.auth.updateUI(updatedUser);
                    }

                    this.showAlert('Perfil atualizado com sucesso!', 'success');
                    this.closeModal();
                } else {
                    throw new Error(result?.error || 'Erro ao atualizar perfil');
                }
            } else {
                throw new Error('API de banco de dados não disponível');
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            this.showAlert('Erro ao atualizar perfil: ' + (error.message || 'Erro desconhecido'), 'error');
        } finally {
            // Reabilita o botão
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    showAlert(message, type = 'info') {
        // Tenta usar o sistema de alertas existente se disponível
        if (window.showAlert && typeof window.showAlert === 'function') {
            window.showAlert(message, type);
            return;
        }

        // Fallback: cria um alert simples
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            max-width: 400px;
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializa quando o script é carregado
const userProfile = new UserProfile();

// Torna disponível globalmente
if (typeof window !== 'undefined') {
    window.userProfile = userProfile;
}

