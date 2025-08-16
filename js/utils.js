// Utility functions for the African Trade Dashboard

/**
 * Format numbers for display
 */
class NumberFormatter {
    static formatCurrency(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '--';
        
        const absValue = Math.abs(value);
        let formatted;
        
        if (absValue >= 1e12) {
            formatted = (value / 1e12).toFixed(decimals) + 'T';
        } else if (absValue >= 1e9) {
            formatted = (value / 1e9).toFixed(decimals) + 'B';
        } else if (absValue >= 1e6) {
            formatted = (value / 1e6).toFixed(decimals) + 'M';
        } else if (absValue >= 1e3) {
            formatted = (value / 1e3).toFixed(decimals) + 'K';
        } else {
            formatted = value.toFixed(decimals);
        }
        
        return '$' + formatted;
    }
    
    static formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) return '--';
        return value.toFixed(decimals) + '%';
    }
    
    static formatNumber(value, decimals = 0) {
        if (value === null || value === undefined || isNaN(value)) return '--';
        return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
    }
}

/**
 * Date and time utilities
 */
class DateUtils {
    static getCurrentTimestamp() {
        return new Date().toISOString();
    }
    
    static formatLastUpdate(timestamp) {
        if (!timestamp) return '--';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
    
    static isValidYear(year) {
        const currentYear = new Date().getFullYear();
        return year >= 2010 && year <= currentYear;
    }
}

/**
 * DOM manipulation utilities
 */
class DOMUtils {
    static getElementById(id) {
        return document.getElementById(id);
    }
    
    static querySelector(selector) {
        return document.querySelector(selector);
    }
    
    static querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }
    
    static createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }
    
    static setAttributes(element, attributes) {
        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });
    }
    
    static toggleClass(element, className, force = null) {
        if (force !== null) {
            element.classList.toggle(className, force);
        } else {
            element.classList.toggle(className);
        }
    }
    
    static showElement(element, display = 'block') {
        element.style.display = display;
    }
    
    static hideElement(element) {
        element.style.display = 'none';
    }
    
    static animateElement(element, animationClass, duration = 500) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }
}

/**
 * Event handling utilities
 */
class EventUtils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static addEventListeners(element, events, handler) {
        events.split(' ').forEach(event => {
            element.addEventListener(event, handler);
        });
    }
}

/**
 * Data validation utilities
 */
class ValidationUtils {
    static isValidTradeData(data) {
        return data && 
               typeof data.reporter === 'string' && 
               typeof data.partner === 'string' && 
               typeof data.trade_value === 'number' && 
               data.trade_value > 0;
    }
    
    static isValidCountryData(data) {
        return data && 
               typeof data.country_code === 'string' && 
               typeof data.country_name === 'string' &&
               data.geometry;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>"']/g, '');
    }
    
    static isValidApiResponse(response) {
        return response && 
               response.status === 200 && 
               response.data;
    }
}

/**
 * Geographic utilities
 */
class GeoUtils {
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.degToRad(lat2 - lat1);
        const dLon = this.degToRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    static degToRad(deg) {
        return deg * (Math.PI/180);
    }
    
    static getCentroid(coordinates) {
        if (!coordinates || !coordinates.length) return null;
        
        let x = 0, y = 0;
        for (const coord of coordinates) {
            x += coord[0];
            y += coord[1];
        }
        return [x / coordinates.length, y / coordinates.length];
    }
    
    static isPointInPolygon(point, polygon) {
        const x = point[0], y = point[1];
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
}

/**
 * Color utilities for data visualization
 */
class ColorUtils {
    static getTradeFlowColor(volume, maxVolume) {
        const intensity = Math.min(volume / maxVolume, 1);
        
        if (intensity > 0.7) return '#00ffff'; // High volume - cyan
        if (intensity > 0.4) return '#0099cc'; // Medium volume - blue
        return '#006699'; // Low volume - dark blue
    }
    
    static getTrendColor(value) {
        if (value > 0) return '#00ff00'; // Positive - green
        if (value < 0) return '#ff4444'; // Negative - red
        return '#cccccc'; // Neutral - gray
    }
    
    static hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    static interpolateColor(color1, color2, factor) {
        if (factor <= 0) return color1;
        if (factor >= 1) return color2;
        
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return color1;
        
        const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
        const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
        const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

/**
 * Storage utilities for caching
 */
class StorageUtils {
    static setItem(key, value, expirationHours = 24) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + (expirationHours * 60 * 60 * 1000)
        };
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }
    
    static getItem(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return null;
        }
    }
    
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    }
    
    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
    
    static getStorageSize() {
        let total = 0;
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
        } catch (error) {
            console.warn('Failed to calculate storage size:', error);
        }
        return total;
    }
}

/**
 * Animation utilities
 */
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = 0;
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(element.style.opacity) || 1;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    static slideIn(element, direction = 'left', duration = 300) {
        const directions = {
            left: 'translateX(-100%)',
            right: 'translateX(100%)',
            up: 'translateY(-100%)',
            down: 'translateY(100%)'
        };
        
        element.style.transform = directions[direction];
        element.style.opacity = 0;
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = this.easeOutCubic(progress);
            element.style.transform = `${directions[direction].replace('100%', (100 * (1 - easedProgress)) + '%')}`;
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.transform = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}

// Make utilities globally available
window.Utils = {
    NumberFormatter,
    DateUtils,
    DOMUtils,
    EventUtils,
    ValidationUtils,
    GeoUtils,
    ColorUtils,
    StorageUtils,
    AnimationUtils
};
