exports.handler = async (event, context) => {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLYiGuuPMM_ZV2zLSLECHPx4UCuUB-67GhDG5Uumtz1qpWRP3J12HjycumHanZqcJLLWPbWkgR_RTW/pub?gid=2022258991&single=true&output=csv';
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    
    try {
        const response = await fetch(SHEET_URL, {
            headers: { 'Accept': 'text/csv' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const csvText = await response.text();
        
        if (!csvText || csvText.length < 100 || !csvText.includes('Saham')) {
            throw new Error('Invalid CSV data');
        }
        
        return {
            statusCode: 200,
            headers,
            body: csvText
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
