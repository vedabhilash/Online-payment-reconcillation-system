/**
 * Lightweight PDF text extractor — zero external dependencies.
 * Works with uncompressed PDFs (compress:false in PDFKit, our generated format).
 *
 * Each PDF table cell is a separate BT...ET block. This extractor:
 * 1. Collects all non-empty text from every BT block
 * 2. Groups consecutive blocks into transaction rows by detecting date patterns
 */
'use strict';

/** Decode PDF hex string */
function decodeHex(hex) {
    let out = '';
    for (let i = 0; i < hex.length; i += 2)
        out += String.fromCharCode(parseInt(hex.slice(i, i + 2) || '00', 16));
    return out;
}

/** Extract all text tokens from a single BT...ET block */
function extractBlockText(block) {
    let text = '';

    // Match literal strings: (text) Tj or (text) '
    const litRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|')/g;
    let m;
    while ((m = litRe.exec(block)) !== null) {
        text += m[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\(.)/g, '$1');
    }

    // Match hex strings: <hex> Tj
    const hexRe = /<([0-9a-fA-F]+)>\s*(?:\d+\s+)?Tj/g;
    while ((m = hexRe.exec(block)) !== null) {
        text += decodeHex(m[1]);
    }

    // Match TJ arrays: [(text) num (text) ...] TJ
    const arrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = arrRe.exec(block)) !== null) {
        const inner = m[1];
        const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F]+)>/g;
        let sm;
        while ((sm = strRe.exec(inner)) !== null) {
            if (sm[1] !== undefined)
                text += sm[1].replace(/\\(.)/g, '$1');
            else if (sm[2] !== undefined)
                text += decodeHex(sm[2]);
        }
    }

    return text.trim();
}

/**
 * Extract all BT block texts from the raw PDF binary string.
 * Returns an array of non-empty text strings, one per BT block.
 */
function collectBlocks(raw) {
    const blocks = [];
    let pos = 0;
    while (true) {
        const btIdx = raw.indexOf('BT', pos);
        if (btIdx < 0) break;
        const etIdx = raw.indexOf('ET', btIdx + 2);
        if (etIdx < 0) break;
        const block = raw.slice(btIdx + 2, etIdx);
        pos = etIdx + 2;
        const text = extractBlockText(block);
        if (text) blocks.push(text);
    }
    return blocks;
}

/**
 * Group raw text blocks into semantic lines.
 *
 * PDFKit writes each table cell as a separate BT block, so a row like:
 *   2026-02-01 | REF001 | Payment from ACME Corp | CREDIT | $1,500.00
 * produces 5 consecutive blocks.
 *
 * Strategy: when we see a YYYY-MM-DD date block followed by more blocks,
 * collect the next blocks until the next date (or a known footer) into one row.
 */
function groupIntoRows(blocks) {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const amountRe = /^\$[\d,]+\.\d{2}$/;
    const rows = [];
    let i = 0;

    while (i < blocks.length) {
        if (dateRe.test(blocks[i])) {
            // Collect blocks for this row until we hit the amount or another date
            const rowParts = [blocks[i]];
            i++;
            while (i < blocks.length && !dateRe.test(blocks[i])) {
                rowParts.push(blocks[i]);
                const isAmount = amountRe.test(blocks[i]);
                i++;
                if (isAmount) break; // amount is the last column
            }
            rows.push(rowParts.join('\t'));
        } else {
            // Non-date block (header, label, etc.) — emit as-is
            rows.push(blocks[i]);
            i++;
        }
    }
    return rows;
}

/**
 * Main export — async for API symmetry.
 * Returns { text: string } where each line is a tab-separated row
 * (for transaction rows) or raw text (for headers/labels).
 */
async function extractPDFText(buffer) {
    const raw = buffer.toString('binary');
    const blocks = collectBlocks(raw);
    const rows = groupIntoRows(blocks);
    return { text: rows.join('\n'), blocks };
}

module.exports = extractPDFText;
