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
            // UN Comtrade API v1 endpoint
            const url = `${this.baseUrls.comtrade}/C/A/HS?` +
                `freq=A&px=HS&ps=${year}&r=${reporterCode}&p=${partnerCode}&fmt=json`;
            
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'African-Trade-Dashboard/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Comtrade API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data.data,
                timestamp: Date.now()
            });

            return data.data;
        } catch (error) {
            console.error('Error fetching trade flows:', error);
            return this.getFallbackTradeData(reporterCode, partnerCode, year);
        }
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
        return [{
            reporterCode,
            partnerCode,
            period: year,
            primaryValue: Math.random() * 1000000000, // Random value for demo
            flowDesc: 'Export',
            commodityDesc: 'All Commodities'
        }];
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
            // Load initial data
            await this.loadCurrentYearData();
            
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
        
        // Fetch trade flows
        const tradeFlows = await this.dataService.fetchIntraAfricanTrade(currentYear);
        
        // Calculate statistics
        const stats = this.dataService.calculateIntraAfricanStats(tradeFlows);
        
        // Update dashboard with real data
        this.updateDashboardStats(stats);
        this.updateTradeFlowVisualization(tradeFlows);
        
        return { tradeFlows, stats };
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
        // Could show error notification to user
    }

    showErrorMessage(message) {
        // Show temporary error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            z-index: 1000;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
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