export interface UserStoryRow {
    title: string;
    description: string;
    acceptanceCriteria?: string;
    storyPoints: number;
    [key: string]: any; // for extra columns
}

export interface RowError {
    row: number;
    reason: string;
}

export interface SheetToJiraSummary {
    created: number;
    failed: number;
    errors: RowError[];
} 