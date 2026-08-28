UPDATE `generation_jobs`
SET `status`='queued',
    `external_job_id`=NULL,
    `error_code`='texture_fallback',
    `error_message`='Повторяем генерацию геометрии с исправленным разбором GLB',
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990' AND `result_glb_url` IS NULL;
