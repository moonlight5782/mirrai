UPDATE `generation_jobs`
SET `status`='queued',
    `attempt`=1,
    `external_job_id`=NULL,
    `error_code`='texture_fallback',
    `error_message`='Повторяем геометрию с поддержкой Gradio file proxy',
    `completed_at`=NULL,
    `updated_at`=CURRENT_TIMESTAMP
WHERE `id`='hugge-alba-89990' AND `result_glb_url` IS NULL;
