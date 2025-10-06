-- Check current structure of AwardRankingScoring table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'AwardRankingScoring' 
ORDER BY ordinal_position;

-- Check if the new columns already exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'AwardRankingScoring' 
            AND column_name = 'socialEnvironmentEngagement'
        ) THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as socialEnvironmentEngagement_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'AwardRankingScoring' 
            AND column_name = 'biokulturalEngagement'
        ) THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as biokulturalEngagement_status;
