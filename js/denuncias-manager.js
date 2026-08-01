

class DenunciasManager {
    constructor() {
        this.cache = { denuncias: [], messages: [] };
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
            this.cache = { denuncias: [], messages: [] };
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
            this.cache = { denuncias: [], messages: [] };
            this.initialized = true;
            return;
        }

        try {
            await this.loadFromDatabase();
            this.initialized = true;
        } catch (error) {
            this.cache = { denuncias: [], messages: [] };
            this.initialized = true;
        }
    }

    async loadFromDatabase() {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            this.cache = { denuncias: [], messages: [] };
            return;
        }

        try {
            const denuncias = await window.dbAPI.getDenuncias();
            this.cache = { denuncias: denuncias || [], messages: this.cache?.messages || [] };
            return this.cache.denuncias;
        } catch (error) {
            this.cache = { denuncias: [], messages: [] };
            throw error;
        }
    }

    getAllDenuncias() {
        if (!this.cache) {
            this.cache = { denuncias: [], messages: [] };
        }
        return this.cache.denuncias || [];
    }

    getDenunciaById(id) {
        const denuncias = this.getAllDenuncias();
        return denuncias.find(d => d.id === parseInt(id)) || null;
    }

    async getDenunciasByUserId(userId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        
        if (!userId) {
            return [];
        }
        
        try {
            
            const createdDenuncias = await window.dbAPI.getDenunciasByUserId(userId) || [];

            let addedDenuncias = [];
            try {
                
                const denunciaUsersResult = await window.dbAPI.getDenunciasByAddedUserId(userId);

                let denunciaUsers = [];
                if (denunciaUsersResult && typeof denunciaUsersResult === 'object') {
                    if (Array.isArray(denunciaUsersResult)) {
                        denunciaUsers = denunciaUsersResult;
                    } else if (denunciaUsersResult.data && Array.isArray(denunciaUsersResult.data)) {
                        denunciaUsers = denunciaUsersResult.data;
                    } else if (denunciaUsersResult.success && Array.isArray(denunciaUsersResult.data)) {
                        denunciaUsers = denunciaUsersResult.data;
                    }
                }
                
                    if (denunciaUsers && denunciaUsers.length > 0) {
                    
                    const denunciaIds = denunciaUsers.map(du => {
                        
                        const id = du.denuncia_id || du.id;
                        return parseInt(id);
                    }).filter(id => !isNaN(id) && id > 0);
                    
                    if (denunciaIds.length > 0) {

                        const allDenunciasFromDB = await window.dbAPI.getDenuncias();
                        
                        if (allDenunciasFromDB && Array.isArray(allDenunciasFromDB)) {
                            addedDenuncias = allDenunciasFromDB.filter(d => {
                                if (!d || !d.id) return false;
                                const denunciaId = parseInt(d.id);
                                return !isNaN(denunciaId) && denunciaIds.includes(denunciaId);
                            });
                        }

                        if (addedDenuncias.length === 0) {
                            await this.loadFromDatabase();
                            const allDenuncias = this.getAllDenuncias();
                            
                            addedDenuncias = allDenuncias.filter(d => {
                                if (!d || !d.id) return false;
                                const denunciaId = parseInt(d.id);
                                return !isNaN(denunciaId) && denunciaIds.includes(denunciaId);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar denúncias adicionadas:', error);
            }

            const allDenuncias = [...createdDenuncias, ...addedDenuncias];
            const uniqueDenuncias = [];
            const seenIds = new Set();
            
            for (const denuncia of allDenuncias) {
                if (!denuncia || !denuncia.id) continue;
                const denunciaId = parseInt(denuncia.id);
                if (!isNaN(denunciaId) && !seenIds.has(denunciaId)) {
                    seenIds.add(denunciaId);
                    uniqueDenuncias.push(denuncia);
                }
            }
            
            return uniqueDenuncias;
        } catch (error) {
            return [];
        }
    }

    async addDenuncia(denunciaData) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI) {
            
            return await this.createDenunciaDirect(denunciaData);
        }
        
        if (window.dbAPI.checkConfiguration && typeof window.dbAPI.checkConfiguration === 'function') {
            await window.dbAPI.checkConfiguration();
        }
        
        if (window.dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado. Configure o banco de dados primeiro.');
        }

        try {
            const cleanData = { ...denunciaData };
            delete cleanData.id;

            const result = await window.dbAPI.createDenuncia(cleanData);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                const newDenuncia = (this.cache.denuncias || []).find(d => 
                    d.user_id === denunciaData.user_id && 
                    Math.abs(new Date(d.created_at).getTime() - new Date().getTime()) < 5000
                ) || (result.data && result.data[0]) || denunciaData;
                
                return { 
                    success: true, 
                    denuncia: newDenuncia
                };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao criar denúncia');
            }
        } catch (error) {
            
            return await this.createDenunciaDirect(denunciaData);
        }
    }

    async createDenunciaDirect(denunciaData) {
        try {
            const response = await fetch('/api/php/create-denuncia.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(denunciaData)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            throw new Error('Erro ao comunicar com o servidor: ' + error.message);
        }
    }

    async updateDenuncia(id, denunciaData) {
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
            const denunciaId = parseInt(id);
            if (isNaN(denunciaId)) {
                throw new Error('ID inválido para atualização');
            }

            const cleanData = { ...denunciaData };
            delete cleanData.id;

            const result = await window.dbAPI.updateDenuncia(denunciaId, cleanData);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                const updatedDenuncia = this.getDenunciaById(denunciaId) || (result.data && result.data[0]);
                
                return { 
                    success: true, 
                    denuncia: updatedDenuncia 
                };
            } else {
                throw new Error(result?.error || 'Erro ao atualizar denúncia');
            }
        } catch (error) {
            throw error;
        }
    }

    async getDenunciaMessages(denunciaId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        try {
            const messages = await window.dbAPI.getDenunciaMessages(denunciaId);
            return messages || [];
        } catch (error) {
            return [];
        }
    }

    async addUserToDenuncia(denunciaId, userId, addedBy = null) {
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
            const result = await window.dbAPI.addUserToDenuncia(denunciaId, userId, addedBy);
            
            if (result && result.success) {
                return { success: true, data: result.data };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao adicionar usuário à denúncia');
            }
        } catch (error) {
            throw error;
        }
    }

    async removeUserFromDenuncia(denunciaId, userId) {
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
            const result = await window.dbAPI.removeUserFromDenuncia(denunciaId, userId);
            
            if (result && result.success) {
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao remover usuário da denúncia');
            }
        } catch (error) {
            throw error;
        }
    }

    async getDenunciaUsers(denunciaId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        
        try {
            const result = await window.dbAPI.getDenunciaUsers(denunciaId);
            return result?.data || [];
        } catch (error) {
            return [];
        }
    }

    async getDenunciasByAddedUserId(userId) {
        if (typeof window.dbAPI === 'undefined' || !window.dbAPI || window.dbAPI.useLocalStorage) {
            return [];
        }
        
        try {
            const result = await window.dbAPI.getDenunciasByAddedUserId(userId);
            return result?.data || [];
        } catch (error) {
            return [];
        }
    }

    async addDenunciaMessage(denunciaId, messageData) {
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
            const cleanData = { ...messageData, denuncia_id: parseInt(denunciaId) };
            delete cleanData.id;

            const result = await window.dbAPI.createDenunciaMessage(cleanData);
            
            if (result && result.success) {
                return { 
                    success: true, 
                    message: result.data && result.data[0] || messageData 
                };
            } else {
                throw new Error(result?.error || 'Erro ao adicionar mensagem');
            }
        } catch (error) {
            throw error;
        }
    }
}

window.denunciasManager = new DenunciasManager();

(function initDenunciasManager() {
    if (typeof window.dbAPI !== 'undefined' && window.dbAPI && !window.dbAPI.useLocalStorage) {
        window.denunciasManager.init();
    } else {
        setTimeout(initDenunciasManager, 100);
    }
})();

