

class ImageURLNormalizer {
    constructor() {
        this.baseUrl = this.getBaseUrl();
    }

    getBaseUrl() {
        
        return window.location.origin;
    }

    normalizeImageUrl(imageUrl) {
        if (!imageUrl || imageUrl.trim() === '') {
            return '';
        }

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            
            if (imageUrl.includes(this.baseUrl.replace('https://', '').replace('http://', ''))) {
                return imageUrl;
            }

            return imageUrl;
        }

        if (imageUrl.startsWith('/')) {
            return `${this.baseUrl}${imageUrl}`;
        }

        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            return `${this.baseUrl}/${imageUrl}`;
        }

        if (imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        return imageUrl;
    }

    normalizeObjectImages(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const normalized = { ...obj };

        const imageFields = ['image', 'bannerImage', 'banner_image', 'imageUrl', 'image_url', 'photo', 'photoUrl'];

        for (const field of imageFields) {
            if (normalized[field]) {
                normalized[field] = this.normalizeImageUrl(normalized[field]);
            }
        }

        if (Array.isArray(normalized)) {
            return normalized.map(item => this.normalizeObjectImages(item));
        }

        return normalized;
    }
}

const imageNormalizer = new ImageURLNormalizer();

window.normalizeImageUrl = function(url) {
    return imageNormalizer.normalizeImageUrl(url);
};
