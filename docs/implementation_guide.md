# Real Data Integration Implementation Guide

## 1. API Setup and Authentication

### UN Comtrade API
```javascript
// Free tier: 100 requests/hour per IP
// Registration: https://comtradeapi.un.org/
const COMTRADE_CONFIG = {
    baseUrl: 'https://comtradeapi.un.org/data/v1/get',
    subscription: 'premium', // 'free' or 'premium'
    apiKey: 'your-api-key-here', // Optional for free tier
    rateLimit: 100 // requests per hour
};

// Example authenticated request
async function fetchComtradeData(params) {
    const url = new URL(COMTRADE_CONFIG.baseUrl + '/C/A/HS');
    url.search = new URLSearchParams({
        ...params,
        fmt: 'json',
        ...(COMTRADE_CONFIG.apiKey && { 'subscription-key': COMTRADE_CONFIG.apiKey })
    });
    
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'AfricanTradeDashboard/1.0'
        }
    });
    
    return response.json();
}
```

### World Bank API
```javascript
// No authentication required for most data
// Documentation: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
const WORLD_BANK_CONFIG = {
    baseUrl: 'https://api.worldbank.org/v2',
    format: 'json',
    perPage: 1000
};

async function fetchWorldBankIndicator(countryCode, indicator, year) {
    const url = `${WORLD_BANK_CONFIG.baseUrl}/country/${countryCode}/indicator/${indicator}` +
               `?date=${year}&format=${WORLD_BANK_CONFIG.format}&per_page=${WORLD_BANK_CONFIG.perPage}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data[1]; // Data is in second array element
}
```

### UNCTAD Statistics API
```javascript
// Registration required: https://unctadstat.unctad.org/
const UNCTAD_CONFIG = {
    baseUrl: 'https://unctadstat-api.unctad.org/api/v1',
    apiKey: 'your-unctad-api-key'
};

async function fetchUNCTADData(endpoint, params) {
    const url = `${UNCTAD_CONFIG.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${UNCTAD_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.json();
}
```

## 2. Rate Limiting and Caching Strategy

### Implementing Rate Limiting
```javascript
class RateLimiter {
    constructor(requestsPerHour = 100) {
        this.requestsPerHour = requestsPerHour;
        this.requests = [];
    }
    
    async throttle() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        // Remove old requests
        this.requests = this.requests.filter(time => time > oneHourAgo);
        
        if (this.requests.length >= this.requestsPerHour) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = oldestRequest + (60 * 60 * 1000) - now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
    }
}

// Usage in data service
const rateLimiter = new RateLimiter(100); // 100 requests per hour

async function makeAPIRequest(url) {
    await rateLimiter.throttle();
    return fetch(url);
}
```

### Advanced Caching with IndexedDB
```javascript
class IndexedDBCache {
    constructor(dbName = 'TradeDataCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('tradeData')) {
                    const store = db.createObjectStore('tradeData', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('year', 'year');
                }
            };
        });
    }
    
    async set(key, data, expiryHours = 24) {
        const transaction = this.db.transaction(['tradeData'], 'readwrite');
        const store = transaction.objectStore('tradeData');
        
        const record = {
            id: key,
            data: data,
            timestamp: Date.now(),
            expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
        };
        
        return store.put(record);
    }
    
    async get(key) {
        const transaction = this.db.transaction(['tradeData'], 'readonly');
        const store = transaction.objectStore('tradeData');
        const request = store.get(key);
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                const record = request.result;
                if (record && record.expiry > Date.now()) {
                    resolve(record.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }
}
```

## 3. Data Processing Pipeline

### Real-time Data Processing
```javascript
class DataProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
    }
    
    async processTradeData(rawData) {
        // Clean and validate data
        const cleanedData = this.cleanTradeData(rawData);
        
        // Aggregate by time periods
        const aggregatedData = this.aggregateByPeriod(cleanedData);
        
        // Calculate derived metrics
        const enrichedData = this.calculateMetrics(aggregatedData);
        
        // Generate geographic mappings
        const geoMappedData = await this.addGeographicData(enrichedData);
        
        return geoMappedData;
    }
    
    cleanTradeData(data) {
        return data.filter(record => {
            // Remove invalid records
            return record.tradeValue > 0 && 
                   record.reporterCode && 
                   record.partnerCode &&
                   record.reporterCode !== record.partnerCode;
        }).map(record => ({
            ...record,
            tradeValue: parseFloat(record.tradeValue) || 0,
            year: parseInt(record.period) || new Date().getFullYear(),
            reporterISO: this.convertToISO3(record.reporterCode),
            partnerISO: this.convertToISO3(record.partnerCode)
        }));
    }
    
    aggregateByPeriod(data) {
        const grouped = data.reduce((acc, record) => {
            const key = `${record.year}_${record.reporterISO}_${record.partnerISO}`;
            if (!acc[key]) {
                acc[key] = {
                    year: record.year,
                    reporter: record.reporterISO,
                    partner: record.partnerISO,
                    totalValue: 0,
                    exports: 0,
                    imports: 0,
                    recordCount: 0
                };
            }
            
            acc[key].totalValue += record.tradeValue;
            acc[key].recordCount += 1;
            
            if (record.flowDesc === 'Export') {
                acc[key].exports += record.tradeValue;
            } else if (record.flowDesc === 'Import') {
                acc[key].imports += record.tradeValue;
            }
            
            return acc;
        }, {});
        
        return Object.values(grouped);
    }
    
    calculateMetrics(data) {
        return data.map(record => ({
            ...record,
            tradeBalance: record.exports - record.imports,
            tradeIntensity: record.totalValue / (record.exports + record.imports || 1),
            growthRate: this.calculateGrowthRate(record),
            // Add more calculated metrics
        }));
    }
}
```

## 4. Environment Configuration

### Environment Variables Setup
```javascript
// config.js
const CONFIG = {
    development: {
        COMTRADE_API_KEY: process.env.COMTRADE_API_KEY || '',
        WORLD_BANK_API_KEY: process.env.WORLD_BANK_API_KEY || '',
        UNCTAD_API_KEY: process.env.UNCTAD_API_KEY || '',
        CACHE_DURATION: 1000 * 60 * 60, // 1 hour in development
        API_BASE_URL: 'http://localhost:3000/api'
    },
    production: {
        COMTRADE_API_KEY: process.env.COMTRADE_API_KEY,
        WORLD_BANK_API_KEY: process.env.WORLD_BANK_API_KEY,
        UNCTAD_API_KEY: process.env.UNCTAD_API_KEY,
        CACHE_DURATION: 1000 * 60 * 60 * 24, // 24 hours in production
        API_BASE_URL: 'https://your-domain.com/api'
    }
};

export default CONFIG[process.env.NODE_ENV || 'development'];
```

### CORS and Proxy Setup
```javascript
// For client-side requests, you may need a proxy server
// proxy-server.js (Node.js/Express)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Proxy for UN Comtrade
app.get('/api/comtrade/*', async (req, res) => {
    try {
        const comtradeUrl = 'https://comtradeapi.un.org' + req.path.replace('/api/comtrade', '');
        const response = await fetch(comtradeUrl + '?' + req.query);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy for World Bank
app.get('/api/worldbank/*', async (req, res) => {
    try {
        const wbUrl = 'https://api.worldbank.org/v2' + req.path.replace('/api/worldbank', '');
        const response = await fetch(wbUrl + '?' + req.query);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Proxy server running on port 3001');
});
```

## 5. Deployment Options

### Static Site with Serverless Functions (Netlify)
```javascript
// netlify/functions/trade-data.js
exports.handler = async (event, context) => {
    const { year, reporter, partner } = event.queryStringParameters;
    
    try {
        const tradeData = await fetchTradeData(year, reporter, partner);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tradeData),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
```

### Vercel Edge Functions
```javascript
// api/trade-flows.js
export default async function handler(req, res) {
    const { year, countries } = req.query;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
        const data = await fetchIntraAfricanTrade(year, countries.split(','));
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
```

## 6. Error Handling and Fallbacks

### Robust Error Handling
```javascript
class DataFetcher {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }
    
    async fetchWithRetry(url, options = {}) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    timeout: 30000 // 30 second timeout
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                console.warn(`Attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    // Try fallback data source
                    return await this.tryFallbackSource(url);
                }
                
                // Wait before retry
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * attempt)
                );
            }
        }
    }
    
    async tryFallbackSource(originalUrl) {
        // Try alternative data sources
        const fallbackSources = [
            'https://backup-api.example.com',
            'https://cached-data.example.com'
        ];
        
        for (const source of fallbackSources) {
            try {
                const response = await fetch(source);
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn('Fallback source failed:', error.message);
            }
        }
        
        // Return cached data or mock data as last resort
        return this.getEmergencyFallbackData();
    }
    
    getEmergencyFallbackData() {
        return {
            data: [],
            message: 'Using cached data due to API unavailability',
            timestamp: new Date().toISOString()
        };
    }
}
```

## 7. Performance Optimization

### Data Compression and Chunking
```javascript
// Compress large datasets
function compressData(data) {
    return JSON.stringify(data);
    // For production, consider using libraries like pako for gzip compression
}

// Load data in chunks for better performance
async function loadDataInChunks(countries, year, chunkSize = 5) {
    const chunks = [];
    for (let i = 0; i < countries.length; i += chunkSize) {
        chunks.push(countries.slice(i, i + chunkSize));
    }
    
    const results = [];
    for (const chunk of chunks) {
        const chunkData = await Promise.all(
            chunk.map(country => fetchCountryData(country, year))
        );
        results.push(...chunkData);
        
        // Small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}
```

## 8. Integration Steps

1. **Set up API credentials** for each data source
2. **Implement the TradeDataService** class in your project
3. **Replace mock data generation** with real API calls
4. **Add error handling and fallbacks** for production resilience
5. **Set up caching strategy** (localStorage for simple, IndexedDB for complex)
6. **Configure CORS proxy** if needed for client-side requests
7. **Deploy with serverless functions** for scalable API handling
8. **Monitor API usage** and implement rate limiting
9. **Add data validation** and quality checks
10. **Set up automated data refresh** schedules

This approach gives you a production-ready integration with real African trade data while maintaining the interactive dashboard experience.