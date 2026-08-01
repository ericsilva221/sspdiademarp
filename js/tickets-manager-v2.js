

class TicketsManagerV2 {
    constructor() {
        this.cache = { tickets: [], messages: [] };
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        let attempts = 0;
        while ((typeof window.dbAPI === 'undefined' || !window.dbAPI) && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }

        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            this.cache = [];
            this.initialized = true;
            return;
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.checkingConfig) {
            while (window.dbAPI.checkingConfig) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (window.dbAPI.useLocalStorage) {
            this.cache = [];
            this.initialized = true;
            return;
        }

        try {
            await this.loadFromDatabase();
            this.initialized = true;
        } catch (error) {
            this.cache = [];
            this.initialized = true;
        }
    }

    async loadFromDatabase() {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            this.cache = { tickets: [], messages: [] };
            return;
        }

        try {
            const tickets = await window.dbAPI.getTickets();
            this.cache = { tickets: tickets || [], messages: this.cache?.messages || [] };
            return this.cache.tickets;
        } catch (error) {
            this.cache = { tickets: [], messages: [] };
            throw error;
        }
    }

    getAllTickets() {
        if (!this.cache) {
            this.cache = { tickets: [], messages: [] };
        }
        return this.cache.tickets || [];
    }

    getTicketById(id) {
        const tickets = this.getAllTickets();
        return tickets.find(t => t.id === parseInt(id)) || null;
    }

    async getTicketsByUserId(userId) {
        if (!userId) {
            console.warn('getTicketsByUserId: userId não fornecido');
            return [];
        }

        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }

        try {
            const createdTickets = await window.dbAPI.getTicketsByUserId(userId) || [];

            let addedTickets = [];
            try {
                if (typeof window.dbAPI.getTicketsByAddedUserId === 'function') {
                    const ticketUsers = await window.dbAPI.getTicketsByAddedUserId(userId);

                    if (ticketUsers && ticketUsers.length > 0) {
                        const ticketIds = ticketUsers.map(tu => parseInt(tu.ticket_id)).filter(id => !isNaN(id));

                        if (ticketIds.length > 0) {
                            const allTicketsFromDB = await window.dbAPI.getTickets();

                            if (allTicketsFromDB && Array.isArray(allTicketsFromDB)) {
                                addedTickets = allTicketsFromDB.filter(t => {
                                    const ticketId = parseInt(t.id);
                                    return !isNaN(ticketId) && ticketIds.includes(ticketId);
                                });
                            } else {
                                const allTickets = this.getAllTickets();
                                addedTickets = allTickets.filter(t => {
                                    const ticketId = parseInt(t.id);
                                    return !isNaN(ticketId) && ticketIds.includes(ticketId);
                                });
                            }
                        }
                    }
                } else {
                    console.warn('getTicketsByAddedUserId não está disponível na API');
                }
            } catch (error) {
                console.error('Erro ao buscar tickets onde o usuário foi adicionado:', error);
            }

            const allTickets = [...(createdTickets || []), ...addedTickets];
            const uniqueTickets = [];
            const seenIds = new Set();

            for (const ticket of allTickets) {
                if (!ticket || !ticket.id) continue;
                const ticketId = parseInt(ticket.id);
                if (!isNaN(ticketId) && !seenIds.has(ticketId)) {
                    seenIds.add(ticketId);
                    uniqueTickets.push(ticket);
                }
            }

            return uniqueTickets;
        } catch (error) {
            console.error('Erro em getTicketsByUserId:', error);
            return [];
        }
    }

    async getTicketsByUnidade(unidade) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        try {
            return await window.dbAPI.getTicketsByUnidade(unidade);
        } catch (error) {
            return [];
        }
    }

    async addUserToTicket(ticketId, userId, addedBy = null) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const result = await window.dbAPI.addUserToTicket(ticketId, userId, addedBy);

            if (result && result.success) {
                return { success: true, data: result.data };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao adicionar usuário ao ticket');
            }
        } catch (error) {
            throw error;
        }
    }

    async removeUserFromTicket(ticketId, userId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const result = await window.dbAPI.removeUserFromTicket(ticketId, userId);

            if (result && result.success) {
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao remover usuário do ticket');
            }
        } catch (error) {
            throw error;
        }
    }

    async getTicketUsers(ticketId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }

        try {
            const result = await window.dbAPI.getTicketUsers(ticketId);
            return result?.data || [];
        } catch (error) {
            return [];
        }
    }

    async userHasAccessToTicket(ticketId, userId) {
        const ticket = this.getTicketById(ticketId);
        if (!ticket) {
            return false;
        }

        if (ticket.user_id === userId) {
            return true;
        }

        const ticketUsers = await this.getTicketUsers(ticketId);
        return ticketUsers.some(tu => tu.user_id === userId);
    }

    async addTicket(ticketData) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();

            let attempts = 0;
            while (window.dbAPI.checkingConfig && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        if (typeof window.dbAPI.createTicket !== 'function') {
            throw new Error('Método createTicket não está disponível no dbAPI. O banco de dados pode não estar configurado corretamente.');
        }

        try {
            const cleanData = { ...ticketData };
            delete cleanData.id;

            const result = await window.dbAPI.createTicket(cleanData);

            if (result && result.success) {
                await this.loadFromDatabase();
                const newTicket = (this.cache.tickets || []).find(t =>
                    t.user_id === ticketData.user_id &&
                    t.unidade === ticketData.unidade &&
                    Math.abs(new Date(t.created_at).getTime() - new Date().getTime()) < 5000
                ) || (result.data && result.data[0]) || ticketData;

                this.sendDiscordWebhook(newTicket, 'opened').catch(err => {
                });

                return {
                    success: true,
                    ticket: newTicket
                };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao criar ticket');
            }
        } catch (error) {
            throw error;
        }
    }

    async updateTicket(id, ticketData) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const ticketId = parseInt(id);
            if (isNaN(ticketId)) {
                throw new Error('ID inválido para atualização');
            }

            const isFinalizing = ticketData.status === 'finalizado';
            const oldTicket = this.getTicketById(ticketId);

            const cleanData = { ...ticketData };
            delete cleanData.id;

            const result = await window.dbAPI.updateTicket(ticketId, cleanData);

            if (result && result.success) {
                await this.loadFromDatabase();
                const updatedTicket = this.getTicketById(ticketId) || (result.data && result.data[0]);

                if (isFinalizing && oldTicket && oldTicket.status !== 'finalizado') {
                    this.sendDiscordWebhook(updatedTicket || oldTicket, 'finalized').catch(err => {
                    });
                }

                return {
                    success: true,
                    ticket: updatedTicket
                };
            } else {
                throw new Error(result?.error || 'Erro ao atualizar ticket');
            }
        } catch (error) {
            throw error;
        }
    }

    async getTicketMessages(ticketId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        try {
            const messages = await window.dbAPI.getTicketMessages(ticketId);
            return messages || [];
        } catch (error) {
            return [];
        }
    }

    async sendDiscordWebhook(ticketData, eventType = 'opened') {
        const webhookUrl = 'https://discord.com/api/webhooks/1466616888774885681/2lUwZ4B8QXMUtojAI7t-FANDUFyx5oUpDthupKPVYMl7T8PGj4IOZzmD-ScwuG1asaTN';

        try {
            let embed = {
                color: eventType === 'finalized' ? 0x00FF00 : 0xFF0000,
                timestamp: new Date().toISOString()
            };

            if (eventType === 'opened') {
                embed.title = '🎫 Novo Ticket Criado';
                embed.description = `**Ticket #${ticketData.id} - ${ticketData.unidade}**`;
                embed.fields = [
                    { name: '👤 Usuário', value: `${ticketData.nome} ${ticketData.sobrenome}`, inline: true },
                    { name: '🆔 Discord ID', value: ticketData.discord_id || 'N/A', inline: true },
                    { name: '📋 Status', value: 'Aberto', inline: true },
                    { name: '🏛️ Unidade', value: ticketData.unidade || 'N/A', inline: false }
                ];
                if (ticketData.patente) {
                    embed.fields.push({ name: '⭐ Patente', value: ticketData.patente, inline: true });
                }
                if (ticketData.batalhao) {
                    embed.fields.push({ name: '🏢 Batalhão', value: ticketData.batalhao, inline: true });
                }
            } else if (eventType === 'finalized') {
                embed.title = '✅ Ticket Finalizado';
                embed.description = `**Ticket #${ticketData.id} - ${ticketData.unidade}**`;
                embed.fields = [
                    { name: '👤 Usuário', value: `${ticketData.nome} ${ticketData.sobrenome}`, inline: true },
                    { name: '🆔 Discord ID', value: ticketData.discord_id || 'N/A', inline: true },
                    { name: '📋 Status', value: 'Finalizado', inline: true },
                    { name: '🏛️ Unidade', value: ticketData.unidade || 'N/A', inline: false }
                ];

                try {
                    const messages = await this.getTicketMessages(ticketData.id);
                    if (messages && messages.length > 0) {
                        let messagesText = '';
                        messages.slice(0, 10).forEach((msg, idx) => {
                            const author = msg.is_admin ? '👮 Admin' : '👤 Usuário';
                            const preview = msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message;
                            messagesText += `${author}: ${preview}\n`;
                        });
                        if (messages.length > 10) {
                            messagesText += `\n*... e mais ${messages.length - 10} mensagens*`;
                        }
                        embed.fields.push({ name: '💬 Mensagens', value: messagesText || 'Nenhuma mensagem', inline: false });
                    }
                } catch (err) {
                }
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    embeds: [embed]
                })
            });

            if (!response.ok) {
                throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
            }

        } catch (error) {

        }
    }

    async addTicketMessage(ticketId, messageData) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            throw new Error('MySQL não configurado. dbAPI não está disponível.');
        }

        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }

        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const cleanData = { ...messageData, ticket_id: parseInt(ticketId) };
            delete cleanData.id;

            const result = await window.dbAPI.createTicketMessage(cleanData);

            if (result && result.success) {
                const newMessage = result.data && result.data[0] || messageData;

                if (cleanData.is_admin === true && newMessage.id) {
                    this.notifyTicketReply(ticketId, newMessage.id, cleanData.is_admin).catch(err => {
                        console.warn('Erro ao notificar resposta do ticket:', err);

                    });
                }

                return {
                    success: true,
                    message: newMessage
                };
            } else {
                throw new Error(result?.error || 'Erro ao adicionar mensagem');
            }
        } catch (error) {
            throw error;
        }
    }

    async notifyTicketReply(ticketId, messageId, isAdmin) {
        try {
            const baseUrl = window.location.origin;
            const notifyUrl = baseUrl + '/api/php/notify-ticket-reply.php';

            const response = await fetch(notifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    message_id: messageId,
                    is_admin: isAdmin
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ao notificar: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                console.log('✅ Notificação de resposta do ticket enviada ao bot');
            } else {
                console.warn('⚠️ Notificação não enviada:', result.message);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao notificar resposta do ticket:', error);

        }
    }
}

window.ticketsManagerV2 = new TicketsManagerV2();

(function initTicketsManagerV2() {
    if (typeof window.dbAPI !== 'undefined' && window.dbAPI && !window.dbAPI.useLocalStorage) {
        window.ticketsManagerV2.init();
    } else {
        setTimeout(initTicketsManagerV2, 100);
    }
})();
