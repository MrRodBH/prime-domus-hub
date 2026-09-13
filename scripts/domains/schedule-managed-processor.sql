-- PREPARED ONLY. Apply only in the canonical managed project's SQL editor after
-- the complete DOMAIN_AUTOMATION_ROLLOUT.md acceptance/configuration checklist.
-- No secrets in this file. Other cron jobs are not modified.
begin;
do $$
declare endpoint text; secret_count integer;
begin
  if current_setting('rmprime.domain_rollout_approved', true) is distinct from 'yes' then
    raise exception 'domain_rollout_not_approved';
  end if;
  select count(*) into secret_count from vault.secrets where name = 'domain_processor_secret';
  if secret_count <> 1 then raise exception 'domain_processor_secret_not_unique'; end if;
  select count(*) into secret_count from vault.secrets where name = 'domain_processor_url';
  if secret_count <> 1 then raise exception 'domain_processor_url_not_unique'; end if;
  select decrypted_secret into endpoint from vault.decrypted_secrets where name = 'domain_processor_url';
  if endpoint is distinct from 'https://stmcnvzuzlyqammyycxj.supabase.co/functions/v1/domain-processor' then
    raise exception 'wrong_managed_backend';
  end if;
  perform cron.schedule('rmprime-domain-processor', '* * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'domain_processor_url'),
      headers := jsonb_build_object('Content-Type','application/json',
        'x-domain-processor-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'domain_processor_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 85000
    );
  $job$);
end $$;
commit;
