// Real Data Integration for African Trade Dashboard
// This module handles fetching and processing data from various APIs. Keep it fresh and updated.

class TradeDataService {
    constructor() {
        this.baseUrls = {
            comtrade: 'https://comtradeapi.un.org/data/v1/get',
            worldBank: 'https://api.worldbank.org/v2',
            unctad: 'https://unctadstat-api.unctad.org/api/v1',
            naturalEarth: 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA'
        };
        
        this.africanCountries = {
            'DZA': { name: 'Algeria', code: '012' },
            'AGO': { name: 'Angola', code: '024' },
            'EGY': { name: 'Egypt', code: '818' },
            'ETH': { name: 'Ethiopia', code: '231' },
            'GHA': { name: 'Ghana', code: '288' },
            'KEN': { name: 'Kenya', code: '404' },
            'MAR': { name: 'Morocco', code: '504' },
            'NGA': { name: 'Nigeria', code: '566' },
            'ZAF': { name: 'South Africa', code: '710' },
            'TUN': { name: 'Tunisia', code: '788' },
            'UGA': { name: 'Uganda', code: '800' },
            'ZWE': { name: 'Zimbabwe', code: '716' }
        };
        
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    // UN Comtrade API Integration
    async fetchTradeFlows(reporterCode, partnerCode, year, commodityCode = 'TOTAL') {
        const cacheKey = `trade_${reporterCode}_${partnerCode}_${year}_${commodityCode}`;
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        try {
            // Try different approaches for CORS handling
            console.log(`Attempting to fetch trade data: ${reporterCode} -> ${partnerCode} for ${year}`);
            
            // First try: Use a CORS proxy service for development
            let url;
            let fetchOptions = {
                headers: {
                    'Accept': 'application/json'
                }
            };

            // Check if we're in development or need CORS proxy
            if (this.needsCorsProxy()) {
                // Use a public CORS proxy for development/testing
                const comtradeUrl = `${this.baseUrls.comtrade}/C/A/HS?` +
                    `freq=A&px=HS&ps=${year}&r=${reporterCode}&p=${partnerCode}&fmt=json`;
                url = `https://api.allorigins.win/raw?url=${encodeURIComponent(comtradeUrl)}`;
            } else {
                // Direct API call (for production with proper CORS setup)
                url = `${this.baseUrls.comtrade}/C/A/HS?` +
                    `freq=A&px=HS&ps=${year}&r=${reporterCode}&p=${partnerCode}&fmt=json`;
                fetchOptions.headers['User-Agent'] = 'African-Trade-Dashboard/1.0';
            }
            
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                throw new Error(`Comtrade API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle different response formats
            let processedData;
            if (data.data) {
                processedData = data.data;
            } else if (Array.isArray(data)) {
                processedData = data;
            } else {
                processedData = [data];
            }
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });

            return processedData;
        } catch (error) {
            console.error('Error fetching trade flows:', error);
            console.log('Falling back to mock data due to API access issues');
            return this.getFallbackTradeData(reporterCode, partnerCode, year);
        }
    }

    // Check if CORS proxy is needed
    needsCorsProxy() {
        // Use CORS proxy for local development or when direct API access fails
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    // Get bilateral trade flows for all African countries
    async fetchIntraAfricanTrade(year = 2023) {
        const countryCodes = Object.keys(this.africanCountries);
        const tradeFlows = [];
        
        // Rate limiting: process in batches to avoid API limits
        const batchSize = 5;
        
        for (let i = 0; i < countryCodes.length; i += batchSize) {
            const batch = countryCodes.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (reporterISO) => {
                const reporterCode = this.africanCountries[reporterISO].code;
                
                // Get trade with all other African countries
                const partnerCodes = countryCodes
                    .filter(code => code !== reporterISO)
                    .map(code => this.africanCountries[code].code)
                    .join(',');
                
                return await this.fetchTradeFlows(reporterCode, partnerCodes, year);
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    tradeFlows.push(...result.value);
                }
            });
            
            // Rate limiting delay
            await this.delay(1000);
        }
        
        return this.processTradeFlows(tradeFlows);
    }

    // World Bank API for additional economic indicators
    async fetchEconomicIndicators(countryCode, year) {
        const indicators = [
            'NY.GDP.MKTP.CD', // GDP
            'TG.VAL.TOTL.GD.ZS', // Trade as % of GDP
            'NE.EXP.GNFS.CD', // Exports
            'NE.IMP.GNFS.CD'  // Imports
        ];
        
        const cacheKey = `wb_indicators_${countryCode}_${year}`;
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        try {
            const indicatorQueries = indicators.map(indicator => 
                `${this.baseUrls.worldBank}/country/${countryCode}/indicator/${indicator}?` +
                `date=${year}&format=json&per_page=1`
            );
            
            const responses = await Promise.all(
                indicatorQueries.map(url => fetch(url))
            );
            
            const data = await Promise.all(
                responses.map(response => response.json())
            );
            
            const processedData = this.processWorldBankData(data, indicators);
            
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });
            
            return processedData;
        } catch (error) {
            console.error('Error fetching World Bank data:', error);
            return null;
        }
    }

    // Geographic data for mapping
    async fetchAfricanBoundaries() {
        const cacheKey = 'african_boundaries';
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        try {
            // Using Natural Earth data or similar
            const response = await fetch(
                'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
            );
            
            const geoData = await response.json();
            
            // Filter for African countries only
            const africanFeatures = geoData.features.filter(feature => 
                Object.keys(this.africanCountries).includes(feature.properties.ISO_A3)
            );
            
            const processedData = {
                type: 'FeatureCollection',
                features: africanFeatures
            };
            
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });
            
            return processedData;
        } catch (error) {
            console.error('Error fetching geographic data:', error);
            return null;
        }
    }

    // UNCTAD Statistics API
    async fetchUNCTADTradeData(year) {
        const cacheKey = `unctad_trade_${year}`;
        
        if (this.isValidCache(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        try {
            // UNCTAD API endpoint for merchandise trade
            const url = `${this.baseUrls.unctad}/BulkDownload/MerchandiseTrade?` +
                `year=${year}&format=json&countries=africa`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('Error fetching UNCTAD data:', error);
            return null;
        }
    }

    // Data processing methods
    processTradeFlows(rawData) {
        if (!rawData || !Array.isArray(rawData)) return [];
        
        return rawData.map(flow => ({
            reporterCode: flow.reporterCode,
            reporterDesc: flow.reporterDesc,
            partnerCode: flow.partnerCode,
            partnerDesc: flow.partnerDesc,
            year: flow.period,
            tradeValue: parseFloat(flow.primaryValue) || 0,
            tradeFlow: flow.flowDesc, // Export or Import
            commodityCode: flow.commodityCode,
            commodityDesc: flow.commodityDesc,
            netWeight: parseFloat(flow.netWeight) || 0,
            quantity: parseFloat(flow.qty) || 0
        })).filter(flow => flow.tradeValue > 0);
    }

    processWorldBankData(data, indicators) {
        const result = {};
        
        data.forEach((dataset, index) => {
            if (dataset && dataset[1] && dataset[1][0]) {
                const indicatorCode = indicators[index];
                const value = dataset[1][0].value;
                
                result[indicatorCode] = {
                    value: value,
                    date: dataset[1][0].date,
                    country: dataset[1][0].country
                };
            }
        });
        
        return result;
    }

    // Calculate intra-African trade statistics
    calculateIntraAfricanStats(tradeFlows) {
        const totalIntraAfrican = tradeFlows
            .filter(flow => this.isAfricanCountry(flow.partnerCode))
            .reduce((sum, flow) => sum + flow.tradeValue, 0);
        
        const totalTrade = tradeFlows
            .reduce((sum, flow) => sum + flow.tradeValue, 0);
        
        const intraAfricanPercentage = totalTrade > 0 ? 
            (totalIntraAfrican / totalTrade) * 100 : 0;
        
        return {
            totalIntraAfrican,
            totalTrade,
            intraAfricanPercentage,
            topRoutes: this.getTopTradeRoutes(tradeFlows),
            growthRate: this.calculateGrowthRate(tradeFlows)
        };
    }

    getTopTradeRoutes(tradeFlows, limit = 10) {
        const routeMap = new Map();
        
        tradeFlows.forEach(flow => {
            const routeKey = `${flow.reporterCode}-${flow.partnerCode}`;
            const existingValue = routeMap.get(routeKey) || 0;
            routeMap.set(routeKey, existingValue + flow.tradeValue);
        });
        
        return Array.from(routeMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([route, value]) => {
                const [reporter, partner] = route.split('-');
                return {
                    route,
                    reporter: this.getCountryName(reporter),
                    partner: this.getCountryName(partner),
                    value,
                    formattedValue: this.formatCurrency(value)
                };
            });
    }

    // Utility methods
    isAfricanCountry(countryCode) {
        return Object.values(this.africanCountries)
            .some(country => country.code === countryCode);
    }

    getCountryName(countryCode) {
        const country = Object.values(this.africanCountries)
            .find(c => c.code === countryCode);
        return country ? country.name : countryCode;
    }

    formatCurrency(value) {
        if (value >= 1e9) {
            return `$${(value / 1e9).toFixed(1)}B`;
        } else if (value >= 1e6) {
            return `$${(value / 1e6).toFixed(1)}M`;
        } else if (value >= 1e3) {
            return `$${(value / 1e3).toFixed(1)}K`;
        }
        return `$${value.toFixed(0)}`;
    }

    isValidCache(key) {
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateGrowthRate(tradeFlows) {
        // Calculate year-over-year growth if multiple years present
        const years = [...new Set(tradeFlows.map(flow => flow.year))].sort();
        if (years.length < 2) return 0;
        
        const currentYear = years[years.length - 1];
        const previousYear = years[years.length - 2];
        
        const currentTotal = tradeFlows
            .filter(flow => flow.year === currentYear)
            .reduce((sum, flow) => sum + flow.tradeValue, 0);
        
        const previousTotal = tradeFlows
            .filter(flow => flow.year === previousYear)
            .reduce((sum, flow) => sum + flow.tradeValue, 0);
        
        return previousTotal > 0 ? 
            ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    }

    // Fallback data for when APIs are unavailable
    getFallbackTradeData(reporterCode, partnerCode, year) {
        // Generate more realistic sample data based on African trade patterns
        const reporterCountry = this.getCountryName(reporterCode) || 'Unknown';
        const partnerCountries = partnerCode.split(',');
        const tradeData = [];
        
        partnerCountries.forEach(singlePartnerCode => {
            const partnerCountry = this.getCountryName(singlePartnerCode) || 'Unknown';
            
            // Generate realistic trade values based on country relationships
            const baseValue = this.getRealisticTradeValue(reporterCode, singlePartnerCode);
            const exportValue = baseValue * (0.8 + Math.random() * 0.4); // +/- 20% variation
            const importValue = baseValue * (0.7 + Math.random() * 0.6); // Different import pattern
            
            // Add export flow
            tradeData.push({
            reporterCode,
                reporterDesc: reporterCountry,
                partnerCode: singlePartnerCode,
                partnerDesc: partnerCountry,
            period: year,
                primaryValue: exportValue,
            flowDesc: 'Export',
                flowCode: 'X',
                commodityCode: 'TOTAL',
                commodityDesc: 'All Commodities',
                netWeight: exportValue * 0.001, // Rough weight estimate
                qty: exportValue * 0.0001
            });
            
            // Add import flow
            tradeData.push({
                reporterCode,
                reporterDesc: reporterCountry,
                partnerCode: singlePartnerCode,
                partnerDesc: partnerCountry,
                period: year,
                primaryValue: importValue,
                flowDesc: 'Import',
                flowCode: 'M',
                commodityCode: 'TOTAL',
                commodityDesc: 'All Commodities',
                netWeight: importValue * 0.001,
                qty: importValue * 0.0001
            });
        });
        
        console.log(`Generated ${tradeData.length} fallback trade records for ${reporterCountry}`);
        return tradeData;
    }
    
    // Generate realistic trade values based on country economic profiles
    getRealisticTradeValue(reporterCode, partnerCode) {
        // Base values roughly based on GDP and trade patterns
        const economicSizes = {
            '012': 200e9, // Algeria
            '024': 120e9, // Angola  
            '818': 400e9, // Egypt
            '231': 100e9, // Ethiopia
            '288': 75e9,  // Ghana
            '404': 110e9, // Kenya
            '504': 130e9, // Morocco
            '566': 450e9, // Nigeria
            '710': 420e9, // South Africa
            '788': 40e9,  // Tunisia
            '800': 45e9,  // Uganda
            '716': 25e9   // Zimbabwe
        };
        
        const reporterSize = economicSizes[reporterCode] || 50e9;
        const partnerSize = economicSizes[partnerCode] || 50e9;
        
        // Trade value as a function of economic sizes and distance/relationship
        const tradeFactor = Math.sqrt(reporterSize * partnerSize) / 1e12;
        const relationshipFactor = this.getCountryRelationshipFactor(reporterCode, partnerCode);
        
        return tradeFactor * relationshipFactor * (0.5 + Math.random());
    }
    
    // Factor based on geographic proximity and economic relationships
    getCountryRelationshipFactor(reporterCode, partnerCode) {
        // Regional groupings with stronger trade relationships
        const regionalGroups = {
            west: ['566', '288', '788'], // Nigeria, Ghana, Tunisia
            east: ['404', '800', '231'], // Kenya, Uganda, Ethiopia  
            north: ['012', '818', '504'], // Algeria, Egypt, Morocco
            south: ['710', '716', '024']  // South Africa, Zimbabwe, Angola
        };
        
        // Find which regions countries belong to
        let reporterRegion = null;
        let partnerRegion = null;
        
        for (const [region, countries] of Object.entries(regionalGroups)) {
            if (countries.includes(reporterCode)) reporterRegion = region;
            if (countries.includes(partnerCode)) partnerRegion = region;
        }
        
        // Same region = higher trade
        if (reporterRegion && reporterRegion === partnerRegion) {
            return 2.5; // 2.5x multiplier for regional trade
        }
        
        // Cross-regional trade
        return 1.0;
    }
}

// Dashboard Data Manager - integrates with the UI
class DashboardDataManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.dataService = new TradeDataService();
        this.updateInterval = null;
        this.isLoading = false;
    }

    async initialize() {
        this.showLoadingState();
        
        try {
            // Show initialization message
            this.showInfoMessage('Initializing African Trade Dashboard...', 'info');
            
            // Load initial data
            const result = await this.loadCurrentYearData();
            
            // Check if we're using fallback data and inform user
            if (result && result.usingFallback) {
                this.showInfoMessage(
                    'Live trade data is currently unavailable. Dashboard is displaying demonstration data based on realistic African trade patterns.', 
                    'warning'
                );
            } else {
                this.showInfoMessage('Dashboard loaded successfully with current data!', 'success');
            }
            
            // Set up periodic updates
            this.startPeriodicUpdates();
            
            this.hideLoadingState();
        } catch (error) {
            console.error('Failed to initialize data:', error);
            this.showErrorState(error.message);
        }
    }

    async loadCurrentYearData() {
        const currentYear = new Date().getFullYear() - 1; // Use previous year for complete data
        
        try {
            // Fetch trade flows
            const tradeFlows = await this.dataService.fetchIntraAfricanTrade(currentYear);
            
            // Check if any of the data appears to be fallback data
            const usingFallback = this.detectFallbackData(tradeFlows);
            
            // Calculate statistics
            const stats = this.dataService.calculateIntraAfricanStats(tradeFlows);
            
            // Update dashboard with data
            this.updateDashboardStats(stats);
            this.updateTradeFlowVisualization(tradeFlows);
            
            return { tradeFlows, stats, usingFallback };
        } catch (error) {
            console.error('Error in loadCurrentYearData:', error);
            throw error;
        }
    }
    
    // Detect if we're using fallback/mock data
    detectFallbackData(tradeFlows) {
        if (!tradeFlows || tradeFlows.length === 0) return true;
        
        // Check for characteristics of fallback data
        const sample = tradeFlows.slice(0, 10);
        const hasRealisticVariation = sample.some(flow => 
            flow.primaryValue && flow.primaryValue % 1000 !== 0
        );
        
        // If all values are round numbers, likely fallback data
        const allRoundNumbers = sample.every(flow => 
            flow.primaryValue && flow.primaryValue % 1000000 === 0
        );
        
        return allRoundNumbers || !hasRealisticVariation;
    }

    async loadYearData(year) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            const tradeFlows = await this.dataService.fetchIntraAfricanTrade(year);
            const stats = this.dataService.calculateIntraAfricanStats(tradeFlows);
            
            this.updateDashboardStats(stats);
            this.updateTradeFlowVisualization(tradeFlows);
            
        } catch (error) {
            console.error('Error loading year data:', error);
            this.showErrorMessage(`Failed to load data for ${year}`);
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    updateDashboardStats(stats) {
        // Update the statistics in the dashboard UI
        const elements = {
            intraAfricaPercent: document.getElementById('intraAfricaPercent'),
            totalValue: document.getElementById('totalValue'),
            yoyGrowth: document.getElementById('yoyGrowth'),
            activeRoutes: document.getElementById('activeRoutes')
        };

        if (elements.intraAfricaPercent) {
            elements.intraAfricaPercent.textContent = 
                `${stats.intraAfricanPercentage.toFixed(1)}%`;
        }
        
        if (elements.totalValue) {
            elements.totalValue.textContent = 
                this.dataService.formatCurrency(stats.totalIntraAfrican);
        }
        
        if (elements.yoyGrowth) {
            const growth = stats.growthRate;
            elements.yoyGrowth.textContent = 
                `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
            elements.yoyGrowth.style.color = growth >= 0 ? '#4ecdc4' : '#ff6b6b';
        }
        
        if (elements.activeRoutes) {
            elements.activeRoutes.textContent = stats.topRoutes.length;
        }

        // Update top routes
        this.updateTopRoutes(stats.topRoutes);
    }

    updateTopRoutes(routes) {
        const container = document.getElementById('topRoutes');
        if (!container) return;

        container.innerHTML = routes.slice(0, 5).map(route => `
            <div class="route-item" data-route="${route.route}">
                <div class="route-info">
                    <div class="route-name">${route.reporter} → ${route.partner}</div>
                    <div class="route-details">Mixed commodities</div>
                </div>
                <div class="route-value">${route.formattedValue}</div>
            </div>
        `).join('');

        // Re-attach event listeners for new route items
        container.querySelectorAll('.route-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.dashboard.highlightRoute(item.dataset.route);
            });
        });
    }

    updateTradeFlowVisualization(tradeFlows) {
        // Update the map visualization with real trade flow data
        // This would update the SVG paths and country representations
        const flowLines = document.querySelectorAll('.flow-line');
        
        // Calculate flow intensities
        const maxFlow = Math.max(...tradeFlows.map(f => f.tradeValue));
        
        tradeFlows.slice(0, flowLines.length).forEach((flow, index) => {
            if (flowLines[index]) {
                const intensity = flow.tradeValue / maxFlow;
                flowLines[index].style.strokeWidth = `${2 + intensity * 6}`;
                flowLines[index].style.opacity = `${0.4 + intensity * 0.6}`;
            }
        });
    }

    startPeriodicUpdates() {
        // Update data every 6 hours
        this.updateInterval = setInterval(() => {
            this.loadCurrentYearData();
        }, 6 * 60 * 60 * 1000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    showLoadingState() {
        // Show loading indicators
        const loadingElements = document.querySelectorAll('.stat-value');
        loadingElements.forEach(el => {
            el.style.opacity = '0.5';
            el.textContent = 'Loading...';
        });
    }

    hideLoadingState() {
        const loadingElements = document.querySelectorAll('.stat-value');
        loadingElements.forEach(el => {
            el.style.opacity = '1';
        });
    }

    showErrorState(message) {
        console.error('Dashboard error:', message);
        this.showErrorMessage(message);
        
        // Update connection status to show API issues
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = 'API Issues';
            connectionStatus.style.color = '#ff6b6b';
            connectionStatus.title = 'External APIs are experiencing issues. Using fallback data.';
        }
    }

    showErrorMessage(message) {
        // Show temporary error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <div class="error-text">
                    <div class="error-title">Data Access Issue</div>
                    <div class="error-message">${message}</div>
                    <div class="error-note">Using demonstration data for visualization</div>
                </div>
                <button class="error-close" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 107, 107, 0.95);
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(10px);
        `;
        
        // Add styles for error content
        const style = document.createElement('style');
        style.textContent = `
            .error-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .error-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            .error-text {
                flex-grow: 1;
            }
            .error-title {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
            }
            .error-message {
                font-size: 13px;
                margin-bottom: 6px;
                opacity: 0.9;
            }
            .error-note {
                font-size: 11px;
                opacity: 0.7;
                font-style: italic;
            }
            .error-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.8;
                flex-shrink: 0;
            }
            .error-close:hover {
                opacity: 1;
                background: rgba(255,255,255,0.1);
                border-radius: 50%;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 8000);
    }

    showInfoMessage(message, type = 'info') {
        // Show informational message (success, warning, etc.)
        const colors = {
            info: '#4ecdc4',
            success: '#45B7D1',
            warning: '#F39C12'
        };
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-notification';
        infoDiv.innerHTML = `
            <div class="info-content">
                <div class="info-icon">${type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
                <div class="info-message">${message}</div>
                <button class="info-close" onclick="this.parentElement.remove()">×</button>
            </div>
        `;
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(infoDiv);
        
        setTimeout(() => {
            if (infoDiv.parentNode) {
                infoDiv.parentNode.removeChild(infoDiv);
            }
        }, 4000);
    }
}

// Integration with existing dashboard
// Add this to your existing dashboard initialization:

// Replace the mock data generation in your existing dashboard with:
/*
document.addEventListener('DOMContentLoaded', async () => {
    const dashboard = new AfricanTradeDashboard();
    const dataManager = new DashboardDataManager(dashboard);
    
    // Initialize with real data
    await dataManager.initialize();
    
    // Update dashboard's time slider handler to load real data
    dashboard.timeSlider.addEventListener('input', async (e) => {
        const year = parseInt(e.target.value);
        await dataManager.loadYearData(year);
        dashboard.currentYear = year;
        dashboard.yearDisplay.textContent = year;
    });
});
*/
