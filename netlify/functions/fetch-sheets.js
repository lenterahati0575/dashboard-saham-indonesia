exports.handler = async (event, context) => {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLYiGuuPMM_ZV2zLSLECHPx4UCuUB-67GhDG5Uumtz1qpWRP3J12HjycumHanZqcJLLWPbWkgR_RTW/pub?gid=2022258991&single=true&output=csv';
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
    };
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    try {
        // Google Sheets sometimes blocks requests without a proper User-Agent
        const response = await fetch(SHEET_URL, {
            headers: { 
                'Accept': 'text/csv, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow'
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        let csvText = await response.text();

        // --- HARDENING: bersihkan BOM & normalisasi line ending ---
        // 1. Buang UTF-8 BOM di awal response (Google sering menyisipkannya),
        //    supaya header kolom pertama ('Saham') tidak jadi '\uFEFFSaham'.
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.slice(1);
        }
        // 2. Normalisasi CRLF/CR -> LF supaya kolom terakhir tiap baris
        //    tidak kebawa karakter '\r' yang bisa merusak pencocokan string.
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // ------------------------------------------------------------

        // Validate: Google sometimes returns HTML error page instead of CSV
        if (!csvText || csvText.length < 100) {
            throw new Error('Empty or too short response');
        }
        if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
            throw new Error('Google returned HTML instead of CSV - sheet may be restricted');
        }
        if (!csvText.includes('Saham')) {
            throw new Error('Response does not contain expected data (Saham column missing)');
        }
        return {
            statusCode: 200,
            headers,
            body: csvText
        };
    } catch (error) {
        console.error('Fetch error:', error.message);
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: error.message,
                timestamp: new Date().toISOString(),
                tip: 'Pastikan Google Sheet di-set ke "Anyone with the link can view" dan publish to web sudah aktif'
            })
        };
    }
};
