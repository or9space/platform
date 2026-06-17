-- Idempotent demo content for the freedomguards tenant (dashboard/news/events/ops panels).
\set t 'cmqb61ms30000mt2otaf5n0qb'
\set a 'cmqe4g8b30002l810dv6ll5xs'

INSERT INTO news_posts (id, tenant_id, title, body, category, is_pinned, author_id, created_at, updated_at) VALUES
 ('seed_news_welcome', :'t', 'Welcome to the New Freedom Guards HQ', 'Freedom Guard members: our new Freedom Guards HQ is officially online. This is your one-stop hub for everything guild-related. Check the Roster to see all active members and their ranks, hit the Calendar for upcoming events, and jump into the Forums to coordinate. Welcome aboard.', 'ANNOUNCEMENT', true, :'a', now() - interval '2 days', now()),
 ('seed_news_recruit', :'t', 'February Recruitment Drive', 'Recruitment is open. We are launching our February recruitment drive: every active member can sponsor a recruit. Good attitude and willingness to learn matter more than hours. Reach out to leadership to get an applicant queued.', 'ANNOUNCEMENT', true, :'a', now() - interval '4 days', now()),
 ('seed_news_patch', :'t', 'Patch 4.2 - Impact on Our Strategy', 'The latest patch dropped and there are significant changes. Trade routes shifted, mining yields are up, and combat balance moved. Officers are reviewing the impact on Sunday ops and the loot pile. Expect updated doctrine in the Handbook this week.', 'PATCH_NOTES', false, :'a', now() - interval '1 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, tenant_id, title, description, type, starts_at, ends_at, location, created_by_id, created_at) VALUES
 ('seed_evt_pvp', :'t', 'PvP Tournament', 'Squadron bracket dogfight tournament. Prizes from the loot pool.', 'TOURNAMENT', now() + interval '3 days', now() + interval '3 days 3 hours', 'Stanton - Yela', :'a', now()),
 ('seed_evt_workshop', :'t', 'Strategy Workshop', 'Fleet composition and trade-route planning session.', 'TRAINING', now() + interval '5 days', null, 'Discord - Ops', :'a', now()),
 ('seed_evt_raid', :'t', 'Raid: Iron Fortune', 'Coordinated cargo raid on the Iron Fortune convoy lane.', 'OP', now() + interval '2 days', now() + interval '2 days 2 hours', 'Pyro - Ruin', :'a', now()),
 ('seed_evt_meeting', :'t', 'Monthly Guild Meeting', 'State of the guild, treasury report, and Q&A.', 'MEETING', now() + interval '7 days', null, 'Discord - Main Hall', :'a', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO operations (id, tenant_id, title, description, status, scheduled_at, location, created_by_id, created_at, updated_at) VALUES
 ('seed_op_phantom', :'t', 'Operation Phantom Strike', 'Night strike on hostile mining claims. Stealth approach, fast extract.', 'ACTIVE', now() + interval '1 days', 'Stanton - microTech', :'a', now(), now()),
 ('seed_op_mining', :'t', 'Aaron Belt Mining Run', 'Group mining op in the Aaron Belt, escort provided.', 'PLANNING', now() + interval '4 days', 'Aaron Halo', :'a', now(), now()),
 ('seed_op_patrol', :'t', 'Border Patrol Sweep', 'Routine patrol of contested jump points.', 'BRIEFING', now() + interval '2 days', 'Pyro Gateway', :'a', now(), now())
ON CONFLICT (id) DO NOTHING;

SELECT
 (select count(*) from news_posts where tenant_id=:'t') as news,
 (select count(*) from events where tenant_id=:'t') as events,
 (select count(*) from operations where tenant_id=:'t') as ops;
