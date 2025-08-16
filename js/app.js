// Main application controller for the African Trade Dashboard

class AfricanTradeDashboard {
    constructor() {
        this.dataManager = null;
        this.mapRenderer = null;
        this.chartRenderer = null;
        this.currentYear = 2023;
        this.isLoading = false;
        this.initialized = false;
        
        // UI elements
        this.yearSlider = null;
        this.currentYearDisplay = null;
        this.loadingOverlay = null;
        this.errorModal = null;
        this.timeSlider = null; // For compatibility with data manager integration
        this.yearDisplay = null; // For compatibility with data manager integration
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('Initializing African Trade Dashboard...');
            
            // Initialize UI elements
            this.initializeUIElements();
            
            // Initialize core components
            this.dataManager = new TradeDataService();
            this.mapRenderer = this.createMapRenderer();
            this.chartRenderer = this.createChartRenderer();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize with default year
            await this.loadData(this.currentYear);
            
            this.initialized = true;
            console.log('Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard. Please refresh the page.', error);
        }
    }
    
    initializeUIElements() {
        // Year controls
        this.yearSlider = Utils.DOMUtils.getElementById('year-slider');
        this.timeSlider = this.yearSlider; // Alias for data manager compatibility
        this.currentYearDisplay = Utils.DOMUtils.getElementById('current-year');
        this.yearDisplay = this.currentYearDisplay; // Alias for data manager compatibility
        
        // Loading and error elements
        this.loadingOverlay = Utils.DOMUtils.getElementById('loading-overlay');
        this.errorModal = Utils.DOMUtils.getElementById('error-modal');
        
        // Set initial year
        if (this.yearSlider) {
            this.yearSlider.value = this.currentYear;
        }
        if (this.currentYearDisplay) {
            this.currentYearDisplay.textContent = this.currentYear;
        }
        
        // Status elements
        this.lastUpdateElement = Utils.DOMUtils.getElementById('last-update');
        this.cacheStatusElement = Utils.DOMUtils.getElementById('cache-status');
        this.connectionStatusElement = Utils.DOMUtils.getElementById('connection-status');
        
        // Update status on load
        this.updateStatus();
    }
    
    setupEventListeners() {
        // Year slider
        if (this.yearSlider) {
            this.yearSlider.addEventListener('input', Utils.EventUtils.debounce((event) => {
                this.handleYearChange(parseInt(event.target.value));
            }, 300));
        }
        
        // Control buttons
        this.setupControlButtons();
        
        // Global event listeners
        this.setupGlobalEventListeners();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.year) {
                this.loadData(event.state.year, false);
            }
        });
    }
    
    setupControlButtons() {
        // Refresh data button
        const refreshBtn = Utils.DOMUtils.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // Clear cache button
        const clearCacheBtn = Utils.DOMUtils.getElementById('clear-cache');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }
        
        // Map control buttons
        const resetMapBtn = Utils.DOMUtils.getElementById('reset-map');
        if (resetMapBtn) {
            resetMapBtn.addEventListener('click', () => {
                this.resetMapView();
            });
        }
        
        const toggleFlowsBtn = Utils.DOMUtils.getElementById('toggle-flows');
        if (toggleFlowsBtn) {
            toggleFlowsBtn.addEventListener('click', () => {
                this.toggleTradeFlows();
            });
        }
        
        // Error modal buttons
        const closeErrorBtn = Utils.DOMUtils.getElementById('close-error');
        const dismissErrorBtn = Utils.DOMUtils.getElementById('dismiss-error');
        const retryActionBtn = Utils.DOMUtils.getElementById('retry-action');
        
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', () => {
                this.hideError();
            });
        }
        
        if (dismissErrorBtn) {
            dismissErrorBtn.addEventListener('click', () => {
                this.hideError();
            });
        }
        
        if (retryActionBtn) {
            retryActionBtn.addEventListener('click', () => {
                this.hideError();
                this.refreshData();
            });
        }
    }
    
    setupGlobalEventListeners() {
        // Data manager events
        document.addEventListener('progressUpdate', (event) => {
            this.updateProgress(event.detail.message, event.detail.percentage);
        });
        
        document.addEventListener('showLoading', () => {
            this.showLoading();
        });
        
        document.addEventListener('hideLoading', () => {
            this.hideLoading();
        });
        
        document.addEventListener('showError', (event) => {
            this.showError(event.detail.message, event.detail.error);
        });
        
        document.addEventListener('cacheCleared', () => {
            this.updateStatus();
        });
        
        // Map and chart interaction events
        document.addEventListener('countrySelected', (event) => {
            this.handleCountrySelection(event.detail);
        });
        
        document.addEventListener('routeSelected', (event) => {
            this.handleRouteSelection(event.detail);
        });
        
        document.addEventListener('flowSelected', (event) => {
            this.handleFlowSelection(event.detail);
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key) {
                case 'r':
                case 'R':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this.refreshData();
                    }
                    break;
                    
                case 'Escape':
                    this.hideError();
                    break;
                    
                case 'ArrowLeft':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.changeYear(-1);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.changeYear(1);
                    }
                    break;
            }
        });
    }
    
    async loadData(year, addToHistory = true) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentYear = year;
            
            // Update URL if needed
            if (addToHistory) {
                const url = new URL(window.location);
                url.searchParams.set('year', year);
                history.pushState({ year }, '', url);
            }
            
            // Update UI
            this.updateYearControls(year);
            
            // Show loading state
            this.showLoading();
            
            // Fetch trade data
            this.updateProgress('Fetching trade data...', 20);
            const tradeFlows = await this.dataManager.fetchIntraAfricanTrade(year);
            
            // Calculate statistics
            this.updateProgress('Processing statistics...', 60);
            const stats = this.dataManager.calculateIntraAfricanStats(tradeFlows);
            
            // Update dashboard
            this.updateProgress('Updating dashboard...', 80);
            this.updateDashboardStats(stats);
            this.updateTradeFlowVisualization(tradeFlows);
            
            // Update status
            this.updateProgress('Complete!', 100);
            this.updateStatus();
            
            console.log(`Data loaded for year ${year}`);
            
        } catch (error) {
            console.error(`Failed to load data for year ${year}:`, error);
            this.showError(`Failed to load data for ${year}. Please try again.`, error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    async refreshData() {
        await this.loadData(this.currentYear, false);
    }
    
    clearCache() {
        try {
            this.dataManager.cache.clear();
            localStorage.clear();
            this.showSuccessMessage('Cache cleared successfully');
            this.updateStatus();
        } catch (error) {
            console.error('Failed to clear cache:', error);
            this.showError('Failed to clear cache', error);
        }
    }
    
    handleYearChange(year) {
        if (Utils.DateUtils.isValidYear(year) && year !== this.currentYear) {
            this.loadData(year);
        }
    }
    
    changeYear(delta) {
        const newYear = this.currentYear + delta;
        if (Utils.DateUtils.isValidYear(newYear)) {
            this.loadData(newYear);
        }
    }
    
    updateYearControls(year) {
        if (this.yearSlider) {
            this.yearSlider.value = year;
        }
        if (this.currentYearDisplay) {
            this.currentYearDisplay.textContent = year;
        }
    }
    
    handleCountrySelection(detail) {
        console.log('Country selected:', detail.countryName);
        this.announceToScreenReader(`Selected country: ${detail.countryName}`);
    }
    
    handleRouteSelection(detail) {
        console.log('Route selected:', detail.route);
        if (detail.route && detail.route.reporter && detail.route.partner) {
            this.announceToScreenReader(`Selected trade route: ${detail.route.reporter} to ${detail.route.partner}`);
        }
    }
    
    handleFlowSelection(detail) {
        console.log('Trade flow selected:', detail.flow);
    }
    
    highlightRoute(routeKey) {
        // Method for highlighting routes on the map
        console.log('Highlighting route:', routeKey);
        document.dispatchEvent(new CustomEvent('routeHighlight', {
            detail: { routeKey }
        }));
    }
    
    resetMapView() {
        // Reset map zoom and position
        document.dispatchEvent(new CustomEvent('resetMapView'));
        this.announceToScreenReader('Map view reset to default position');
    }
    
    toggleTradeFlows() {
        const toggleBtn = Utils.DOMUtils.getElementById('toggle-flows');
        if (toggleBtn) {
            const isActive = toggleBtn.classList.contains('active');
            toggleBtn.classList.toggle('active', !isActive);
            toggleBtn.setAttribute('aria-pressed', !isActive);
            toggleBtn.textContent = isActive ? 'Show Flows' : 'Hide Flows';
            
            document.dispatchEvent(new CustomEvent('toggleTradeFlows', {
                detail: { visible: !isActive }
            }));
            
            this.announceToScreenReader(isActive ? 'Trade flows hidden' : 'Trade flows shown');
        }
    }
    
    // UI feedback methods
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('active');
            this.loadingOverlay.setAttribute('aria-hidden', 'false');
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('active');
            this.loadingOverlay.setAttribute('aria-hidden', 'true');
        }
    }
    
    updateProgress(message, percentage) {
        const progressText = Utils.DOMUtils.getElementById('progress-text');
        const progressFill = Utils.DOMUtils.getElementById('progress-fill');
        const loadingText = Utils.DOMUtils.querySelector('.loading-text');
        const progressBar = Utils.DOMUtils.querySelector('.loading-progress');
        
        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}%`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', percentage);
        }
    }
    
    showError(message, error = null) {
        const errorMessage = Utils.DOMUtils.getElementById('error-message');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (this.errorModal) {
            this.errorModal.classList.add('active');
            this.errorModal.setAttribute('aria-hidden', 'false');
            
            // Focus the modal for accessibility
            const closeButton = this.errorModal.querySelector('#close-error');
            if (closeButton) {
                closeButton.focus();
            }
        }
        
        this.announceToScreenReader(`Error: ${message}`);
        console.error('Dashboard error:', message, error);
    }
    
    hideError() {
        if (this.errorModal) {
            this.errorModal.classList.remove('active');
            this.errorModal.setAttribute('aria-hidden', 'true');
        }
    }
    
    showSuccessMessage(message, duration = 3000) {
        // Create temporary success notification
        const template = Utils.DOMUtils.getElementById('success-notification-template');
        if (template) {
            const notification = template.cloneNode(true);
            notification.id = `success-${Date.now()}`;
            notification.style.display = 'block';
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.zIndex = '10002';
            
            const messageElement = notification.querySelector('.notification-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            const closeButton = notification.querySelector('.notification-close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                });
            }
            
            document.body.appendChild(notification);
            
            // Auto-remove after duration
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        }
        
        this.announceToScreenReader(message);
    }
    
    updateStatus() {
        // Update last update time
        if (this.lastUpdateElement) {
            const lastUpdate = new Date().toISOString();
            this.lastUpdateElement.textContent = Utils.DateUtils.formatLastUpdate(lastUpdate);
        }
        
        // Update cache status
        if (this.cacheStatusElement) {
            const cacheCount = this.dataManager?.cache?.size || 0;
            this.cacheStatusElement.textContent = `${cacheCount} items cached`;
        }
        
        // Update connection status
        if (this.connectionStatusElement) {
            this.connectionStatusElement.textContent = navigator.onLine ? 'Online' : 'Offline';
            this.connectionStatusElement.style.color = navigator.onLine ? '#4ecdc4' : '#ff6b6b';
        }
    }
    
    updateDashboardStats(stats) {
        // Update KPI values
        this.updateKPI('intra-trade-percentage', stats.intraAfricanPercentage, '%');
        this.updateKPI('total-trade-value', stats.totalIntraAfrican, 'currency');
        this.updateKPI('yoy-growth', stats.growthRate, '%');
        this.updateKPI('active-routes', stats.topRoutes.length, 'number');
        
        // Update top routes
        this.updateTopRoutes(stats.topRoutes);
    }
    
    updateKPI(elementId, value, type) {
        const element = Utils.DOMUtils.getElementById(elementId);
        if (!element) return;
        
        const valueElement = element.querySelector('.kpi-value');
        const trendElement = element.querySelector('.kpi-trend');
        
        if (valueElement) {
            let formattedValue;
            switch (type) {
                case 'currency':
                    formattedValue = this.dataManager.formatCurrency(value);
                    break;
                case '%':
                    formattedValue = `${value.toFixed(1)}%`;
                    break;
                case 'number':
                    formattedValue = value.toString();
                    break;
                default:
                    formattedValue = value.toString();
            }
            valueElement.textContent = formattedValue;
        }
        
        if (trendElement && type === '%') {
            const isPositive = value >= 0;
            trendElement.textContent = isPositive ? '↗ Positive' : '↘ Negative';
            trendElement.style.color = isPositive ? '#4ecdc4' : '#ff6b6b';
        }
    }
    
    updateTopRoutes(routes) {
        const container = Utils.DOMUtils.getElementById('top-routes-list');
        if (!container) return;
        
        container.innerHTML = routes.slice(0, 5).map((route, index) => `
            <div class="route-item" role="listitem" tabindex="0" data-route="${route.route}" 
                 aria-label="Trade route ${index + 1}: ${route.reporter} to ${route.partner}, value ${route.formattedValue}">
                <div class="route-info">
                    <div class="route-name">${route.reporter} → ${route.partner}</div>
                    <div class="route-details">Mixed commodities</div>
                </div>
                <div class="route-value">${route.formattedValue}</div>
            </div>
        `).join('');
        
        // Add event listeners for route selection
        container.querySelectorAll('.route-item').forEach(item => {
            item.addEventListener('click', () => {
                this.highlightRoute(item.dataset.route);
            });
            
            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.highlightRoute(item.dataset.route);
                }
            });
        });
    }
    
    updateTradeFlowVisualization(tradeFlows) {
        // Placeholder for map visualization updates
        console.log('Updating trade flow visualization with', tradeFlows.length, 'flows');
        
        // Dispatch event for map renderer
        document.dispatchEvent(new CustomEvent('updateTradeFlows', {
            detail: { tradeFlows }
        }));
    }
    
    announceToScreenReader(message) {
        const liveRegion = Utils.DOMUtils.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
    
    // Create placeholder renderers (to be replaced with actual implementations)
    createMapRenderer() {
        return {
            initialize: () => console.log('Map renderer initialized'),
            updateData: (data) => console.log('Map data updated', data)
        };
    }
    
    createChartRenderer() {
        return {
            initialize: () => console.log('Chart renderer initialized'),
            updateData: (data) => console.log('Chart data updated', data)
        };
    }
    
    // Cleanup
    cleanup() {
        console.log('Cleaning up dashboard resources...');
        if (this.dataManager && this.dataManager.stopPeriodicUpdates) {
            this.dataManager.stopPeriodicUpdates();
        }
    }
    
    // Public API
    getCurrentYear() {
        return this.currentYear;
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    getDataManager() {
        return this.dataManager;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're in the right page
    if (Utils.DOMUtils.getElementById('trade-map')) {
        window.dashboard = new AfricanTradeDashboard();
        const dataManager = new DashboardDataManager(window.dashboard);
        
        // Initialize with real data
        await dataManager.initialize();
        
        // Update dashboard's time slider handler to load real data
        window.dashboard.timeSlider.addEventListener('input', async (e) => {
            const year = parseInt(e.target.value);
            await dataManager.loadYearData(year);
            window.dashboard.currentYear = year;
            window.dashboard.yearDisplay.textContent = year;
        });
    }
});

// Make dashboard available globally for debugging
window.AfricanTradeDashboard = AfricanTradeDashboard;
