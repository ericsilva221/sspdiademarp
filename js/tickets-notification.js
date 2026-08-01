

class TicketsNotification {
    constructor() {
        this.checkInterval = 30000; 
        this.intervalId = null;
        this.notificationShown = false;
        this.lastCheckedMessages = new Set(); 
        this.currentUser = null;
        this.initialized = false;

        setTimeout(() => {
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }, 2000); 
    }

    async init() {
        
        if (this.initialized) {
            return;
        }

        await this.waitForAuth();
        
        this.initialized = true;

        if (!this.currentUser) {
            if (window.auth && typeof window.auth.getCurrentUser === 'function') {
                this.currentUser = window.auth.getCurrentUser();
            } else if (typeof auth !== 'undefined' && typeof auth.getCurrentUser === 'function') {
                this.currentUser = auth.getCurrentUser();
            } else {
                
                try {
                    const currentUserStr = localStorage.getItem('currentUser');
                    this.currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
                } catch (error) {
                    this.currentUser = null;
                }
            }
        }
        
        if (!this.currentUser) {
            return;
        }

        if (window.location.pathname.includes('meus-tickets') || window.location.pathname.includes('/meus-tickets')) {
            // Quando está na página de tickets, marca todas as mensagens como vistas
            this.clearNotification();
            // Força uma verificação imediata para marcar tudo como visto
            setTimeout(async () => {
                await this.markAllAsViewed();
            }, 500);
            return;
        }

        await this.waitForManagers();

        this.loadViewedMessages();

        setTimeout(async () => {
            await this.checkForNewMessages();
        }, 1000);

        this.startPeriodicCheck();
    }

    async waitForAuth() {
        
        try {
            const currentUserStr = localStorage.getItem('currentUser');
            if (currentUserStr) {
                const user = JSON.parse(currentUserStr);
                if (user && user.id) {
                    this.currentUser = user;
                    return;
                }
            }
        } catch (error) {
        }

        let attempts = 0;
        const maxAttempts = 10; 
        
        while (attempts < maxAttempts) {
            
            if ((typeof window.auth !== 'undefined' && window.auth) || 
                (typeof auth !== 'undefined' && auth)) {
                
                if (typeof window.auth === 'undefined' && typeof auth !== 'undefined') {
                    window.auth = auth;
                }

                try {
                    if (window.auth && typeof window.auth.getCurrentUser === 'function') {
                        this.currentUser = window.auth.getCurrentUser();
                    } else if (typeof auth !== 'undefined' && typeof auth.getCurrentUser === 'function') {
                        this.currentUser = auth.getCurrentUser();
                    }
                } catch (error) {
                }
                
                if (this.currentUser) {
                    return;
                }
            }
            
            if (attempts % 2 === 0 && attempts < 4) { 
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
    }

    async waitForManagers() {
        let attempts = 0;
        const maxAttempts = 20; 
        
        while (attempts < maxAttempts) {
            if (typeof window.ticketsManagerV2 !== 'undefined' && window.ticketsManagerV2) {
                
                if (typeof window.denunciasManager !== 'undefined' && window.denunciasManager) {
                    return;
                }
            }
            if (attempts % 2 === 0) { 
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
    }

    loadViewedMessages() {
        try {
            const viewedStr = localStorage.getItem('tickets_viewed_messages');
            if (viewedStr) {
                const viewed = JSON.parse(viewedStr);
                this.lastCheckedMessages = new Set(viewed);
            }
        } catch (error) {
            this.lastCheckedMessages = new Set();
        }
    }

    saveViewedMessages() {
        try {
            const viewed = Array.from(this.lastCheckedMessages);
            localStorage.setItem('tickets_viewed_messages', JSON.stringify(viewed));
        } catch (error) {
        }
    }

    async checkForNewMessages() {
        if (!this.currentUser) {
            this.currentUser = window.auth?.getCurrentUser();
            if (!this.currentUser) {
                return;
            }
        }

        const hasTicketsManager = typeof window.ticketsManagerV2 !== 'undefined' && window.ticketsManagerV2;
        const hasDenunciasManager = typeof window.denunciasManager !== 'undefined' && window.denunciasManager;
        
        if (!hasTicketsManager && !hasDenunciasManager) {
            return;
        }

        try {
            let hasNewMessages = false;
            const allMessageIds = new Set(this.lastCheckedMessages); // Preserva mensagens já vistas
            let newMessagesCount = 0;

            if (typeof window.ticketsManagerV2 !== 'undefined' && window.ticketsManagerV2) {
                
                if (typeof window.ticketsManagerV2.loadFromDatabase === 'function') {
                    await window.ticketsManagerV2.loadFromDatabase();
                }

                const tickets = await window.ticketsManagerV2.getTicketsByUserId(this.currentUser.id);

                for (const ticket of tickets) {
                    
                    const ticketStatus = ticket.status || '';
                    const isRespondido = ticketStatus === 'respondido' || ticketStatus === 'em_atendimento';
                    const ticketKey = `ticket_status_${ticket.id}`;

                    // Sempre adiciona o ticketKey, mesmo se já foi visto
                    if (isRespondido) {
                        allMessageIds.add(ticketKey);
                        if (!this.lastCheckedMessages.has(ticketKey)) {
                            hasNewMessages = true;
                            newMessagesCount++;
                        }
                    }
                    
                    const messages = await window.ticketsManagerV2.getTicketMessages(ticket.id);
                    
                    messages.forEach(msg => {
                        const messageId = `ticket_${ticket.id}_${msg.id}`;
                        // Sempre adiciona a mensagem, mesmo se já foi vista
                        allMessageIds.add(messageId);

                        const isAdminReply = msg.is_admin === 1 || 
                                           msg.is_admin === true || 
                                           msg.is_admin === '1' || 
                                           msg.is_admin === 'true' ||
                                           String(msg.is_admin).toLowerCase() === 'true';
                        const isNotViewed = !this.lastCheckedMessages.has(messageId);
                        
                        if (isAdminReply && isNotViewed) {
                            hasNewMessages = true;
                            newMessagesCount++;
                        }
                    });
                }
            }

            if (typeof window.denunciasManager !== 'undefined' && window.denunciasManager) {
                try {
                    
                    const denuncias = await window.denunciasManager.getDenunciasByUserId(this.currentUser.id);

                    for (const denuncia of denuncias) {
                        
                        const denunciaStatus = denuncia.status || '';
                        const isRespondida = denunciaStatus === 'em_analise' || denunciaStatus === 'encaminhada';
                        const denunciaKey = `denuncia_status_${denuncia.id}`;

                        // Sempre adiciona o denunciaKey, mesmo se já foi vista
                        if (isRespondida) {
                            allMessageIds.add(denunciaKey);
                            if (!this.lastCheckedMessages.has(denunciaKey)) {
                                hasNewMessages = true;
                                newMessagesCount++;
                            }
                        }
                        
                        const messages = await window.denunciasManager.getDenunciaMessages(denuncia.id);
                        
                        messages.forEach(msg => {
                            const messageId = `denuncia_${denuncia.id}_${msg.id}`;
                            // Sempre adiciona a mensagem, mesmo se já foi vista
                            allMessageIds.add(messageId);

                            const isAdminReply = msg.is_admin === 1 || 
                                               msg.is_admin === true || 
                                               msg.is_admin === '1' || 
                                               msg.is_admin === 'true' ||
                                               String(msg.is_admin).toLowerCase() === 'true';
                            const isNotViewed = !this.lastCheckedMessages.has(messageId);
                            
                            if (isAdminReply && isNotViewed) {
                                hasNewMessages = true;
                                newMessagesCount++;
                            }
                        });
                    }
                } catch (error) {
                    // Erro silenciado para produção
                }
            }

            // Atualiza o Set de mensagens vistas (já preserva mensagens antigas através do new Set(this.lastCheckedMessages))
            this.lastCheckedMessages = allMessageIds;
            this.saveViewedMessages();

            if (hasNewMessages) {
                if (!this.notificationShown) {
                    this.showNotification();
                }
            } else {
                // Se não há novas mensagens e o popup está visível, esconde ele
                if (this.notificationShown) {
                    this.hideNotification();
                }
            }

        } catch (error) {
        }
    }

    showNotification() {
        
        if (document.getElementById('ticket-notification-popup')) {
            return;
        }

        if (window.location.pathname.includes('meus-tickets.html') || window.location.pathname.includes('/meus-tickets')) {
            return;
        }

        this.playNotificationSound();

        const popup = document.createElement('div');
        popup.id = 'ticket-notification-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInLeft 0.3s ease-out;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        `;

        popup.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">
                    <i class="fas fa-bell" style="animation: pulse 2s infinite;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">
                        Nova Mensagem!
                    </div>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Você possui uma mensagem em seu ticket.
                    </div>
                </div>
                <button id="ticket-notification-close" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                    ×
                </button>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.1);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(popup);

        popup.addEventListener('click', async (e) => {
            
            if (e.target.id === 'ticket-notification-close' || e.target.closest('#ticket-notification-close')) {
                return;
            }
            // Marcar todas as mensagens como vistas antes de redirecionar
            await this.markAllAsViewed();
            window.location.href = '/meus-tickets';
        });

        const closeBtn = popup.querySelector('#ticket-notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                // Marcar todas as mensagens como vistas ao fechar a notificação
                await this.markAllAsViewed();
                this.hideNotification();
            });
        }

        this.notificationShown = true;
    }

    playNotificationSound() {
        try {
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; 
            oscillator.type = 'sine'; 

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            
            try {
                const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZUBAOTqPj8sFuJgUwgM/z2Yk3CB1ou+3nn00QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBACg==');
                beep.play().catch(() => {});
            } catch (e) {
                
            }
        }
    }

    hideNotification() {
        const popup = document.getElementById('ticket-notification-popup');
        if (popup) {
            popup.style.animation = 'slideInLeft 0.3s ease-out reverse';
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
            this.notificationShown = false;
        }
    }

    async markAllAsViewed() {
        if (!this.currentUser) {
            return;
        }

        try {
            if (typeof window.ticketsManagerV2 !== 'undefined' && window.ticketsManagerV2) {
                if (typeof window.ticketsManagerV2.loadFromDatabase === 'function') {
                    await window.ticketsManagerV2.loadFromDatabase();
                }

                const tickets = await window.ticketsManagerV2.getTicketsByUserId(this.currentUser.id);

                for (const ticket of tickets) {
                    const ticketStatus = ticket.status || '';
                    const isRespondido = ticketStatus === 'respondido' || ticketStatus === 'em_atendimento';
                    if (isRespondido) {
                        const ticketKey = `ticket_status_${ticket.id}`;
                        this.lastCheckedMessages.add(ticketKey);
                    }
                    
                    const messages = await window.ticketsManagerV2.getTicketMessages(ticket.id);
                    messages.forEach(msg => {
                        const messageId = `ticket_${ticket.id}_${msg.id}`;
                        this.lastCheckedMessages.add(messageId);
                    });
                }
            }

            if (typeof window.denunciasManager !== 'undefined' && window.denunciasManager) {
                try {
                    const denuncias = await window.denunciasManager.getDenunciasByUserId(this.currentUser.id);

                    for (const denuncia of denuncias) {
                        const denunciaStatus = denuncia.status || '';
                        const isRespondida = denunciaStatus === 'em_analise' || denunciaStatus === 'encaminhada';
                        if (isRespondida) {
                            const denunciaKey = `denuncia_status_${denuncia.id}`;
                            this.lastCheckedMessages.add(denunciaKey);
                        }
                        
                        const messages = await window.denunciasManager.getDenunciaMessages(denuncia.id);
                        messages.forEach(msg => {
                            const messageId = `denuncia_${denuncia.id}_${msg.id}`;
                            this.lastCheckedMessages.add(messageId);
                        });
                    }
                } catch (error) {
                }
            }

            this.saveViewedMessages();
        } catch (error) {
        }
    }

    async clearNotification() {
        this.hideNotification();
        await this.markAllAsViewed();
    }

    startPeriodicCheck() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            
            if (!window.location.pathname.includes('meus-tickets') && !window.location.pathname.includes('/meus-tickets')) {
                this.checkForNewMessages();
            }
        }, this.checkInterval);

    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.hideNotification();
    }
}

if (!window.ticketsNotification) {
    window.ticketsNotification = new TicketsNotification();
}
