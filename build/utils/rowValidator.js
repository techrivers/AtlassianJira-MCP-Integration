"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserStoryRows = validateUserStoryRows;
function validateUserStoryRows(rows) {
    const validRows = [];
    const errors = [];
    rows.forEach((row, idx) => {
        const rowNum = idx + 2; // +2: 1 for header, 1 for 1-based index
        if (!row.title || row.title.trim() === '') {
            errors.push({ row: rowNum, reason: JSON.stringify('Missing Title') });
            return;
        }
        if (!row.description || row.description.trim() === '') {
            errors.push({ row: rowNum, reason: JSON.stringify('Missing Description') });
            return;
        }
        if (row.storyPoints === undefined || row.storyPoints === null || isNaN(row.storyPoints)) {
            errors.push({ row: rowNum, reason: JSON.stringify('Missing Story Points') });
            return;
        }
        if (typeof row.storyPoints !== 'number' || row.storyPoints <= 0) {
            errors.push({ row: rowNum, reason: JSON.stringify('Invalid Story Points') });
            return;
        }
        validRows.push({ row, originalIndex: rowNum });
    });
    return { validRows, errors };
}
