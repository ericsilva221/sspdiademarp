

class NewsManagerV2 {
    constructor() {
        this.cache = null;
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
            this.cache = [];
            return;
        }

        try {
            const news = await window.dbAPI.getNews();
            this.cache = news || [];
            return this.cache;
        } catch (error) {
            this.cache = [];
            throw error;
        }
    }

    getAllNews() {
        return this.cache || [];
    }

    getNewsById(id) {
        const news = this.getAllNews();
        return news.find(n => n.id === parseInt(id)) || null;
    }

    async addNews(newsData) {
        
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
            
            const cleanData = { ...newsData };
            delete cleanData.id;

            const result = await window.dbAPI.createNews(cleanData);
            
            if (result && result.success) {
                
                await this.loadFromDatabase();
                const newNews = this.cache.find(n => 
                    n.title === newsData.title && 
                    n.description === newsData.description
                );
                return { 
                    success: true, 
                    news: newNews || (result.data && result.data[0]) || newsData 
                };
            } else {
                throw new Error(result?.error || 'Erro desconhecido ao salvar notícia');
            }
        } catch (error) {
            throw error;
        }
    }

    async updateNews(id, newsData) {
        
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
            
            const newsId = parseInt(id);
            if (isNaN(newsId)) {
                throw new Error('ID inválido para atualização');
            }

            const cleanData = { ...newsData };
            delete cleanData.id;

            const result = await window.dbAPI.updateNews(newsId, cleanData);
            
            if (result && result.success) {
                
                await this.loadFromDatabase();
                const updatedNews = this.getNewsById(newsId);
                return { 
                    success: true, 
                    news: updatedNews || (result.data && result.data[0]) 
                };
            } else {
                throw new Error(result?.error || 'Erro ao atualizar notícia');
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteNews(id) {
        
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
            
            const newsId = parseInt(id);
            if (isNaN(newsId)) {
                throw new Error('ID inválido para exclusão');
            }

            const result = await window.dbAPI.deleteNews(newsId);
            
            if (result && result.success) {
                
                this.cache = this.cache.filter(n => n.id !== newsId);
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro ao deletar notícia');
            }
        } catch (error) {
            throw error;
        }
    }
}

window.newsManagerV2 = new NewsManagerV2();

(function initNewsManagerV2() {
    if (typeof window.dbAPI !== 'undefined' && window.dbAPI && !window.dbAPI.useLocalStorage) {
        window.newsManagerV2.init();
    } else {
        setTimeout(initNewsManagerV2, 100);
    }
})();
