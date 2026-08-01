

class ActivitiesManagerV2 {
    constructor() {
        this.cache = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
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
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            this.cache = [];
            return;
        }

        try {
            const activities = await dbAPI.getActivities();
            this.cache = activities || [];
            return this.cache;
        } catch (error) {
            this.cache = [];
            throw error;
        }
    }

    getAllActivities() {
        return this.cache || [];
    }

    getActivitiesByType(type) {
        const activities = this.getAllActivities();
        return activities
            .filter(a => a.type === type)
            .sort((a, b) => {
                const dateA = a.created_at || a.createdAt || 0;
                const dateB = b.created_at || b.createdAt || 0;
                return new Date(dateB) - new Date(dateA);
            });
    }

    getActivityById(id) {
        const activities = this.getAllActivities();
        return activities.find(a => a.id === parseInt(id)) || null;
    }

    async addActivity(activityData) {
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado.');
        }

        try {
            const cleanData = { ...activityData };
            delete cleanData.id;

            const result = await dbAPI.createActivity(cleanData);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                const newActivity = this.cache.find(a => 
                    a.title === activityData.title && 
                    a.type === activityData.type
                );
                return { 
                    success: true, 
                    activity: newActivity || (result.data && result.data[0]) || activityData 
                };
            } else {
                throw new Error(result?.error || 'Erro ao salvar atividade');
            }
        } catch (error) {
            throw error;
        }
    }

    async updateActivity(id, activityData) {
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado.');
        }

        try {
            
            const activityId = parseInt(id);
            if (isNaN(activityId)) {
                throw new Error('ID inválido para atualização');
            }

            const cleanData = { ...activityData };
            delete cleanData.id;

            const result = await dbAPI.updateActivity(activityId, cleanData);
            
            if (result && result.success) {
                await this.loadFromDatabase();
                const updatedActivity = this.getActivityById(activityId);
                return { 
                    success: true, 
                    activity: updatedActivity || (result.data && result.data[0]) 
                };
            } else {
                throw new Error(result?.error || 'Erro ao atualizar atividade');
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteActivity(id) {
        if (typeof dbAPI === 'undefined' || dbAPI.useLocalStorage) {
            throw new Error('MySQL não configurado.');
        }

        try {
            
            const activityId = parseInt(id);
            if (isNaN(activityId)) {
                throw new Error('ID inválido para exclusão');
            }

            const result = await dbAPI.deleteActivity(activityId);
            
            if (result && result.success) {
                this.cache = this.cache.filter(a => a.id !== activityId);
                return { success: true };
            } else {
                throw new Error(result?.error || 'Erro ao deletar atividade');
            }
        } catch (error) {
            throw error;
        }
    }
}

window.activitiesManagerV2 = new ActivitiesManagerV2();

(function initActivitiesManagerV2() {
    if (typeof dbAPI !== 'undefined' && !dbAPI.useLocalStorage) {
        window.activitiesManagerV2.init();
    } else {
        setTimeout(initActivitiesManagerV2, 100);
    }
})();
