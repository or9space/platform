-- Wave 2 demo content: notifications (for penguin) + comments.
\set t 'cmqb61ms30000mt2otaf5n0qb'
\set admin 'cmqe4g8b30002l810dv6ll5xs'
\set pg 'cmqe4g8bc0005l810pzkktt8x'

INSERT INTO notifications (id, tenant_id, membership_id, type, title, body, href, read_at, created_at) VALUES
 ('seed_nt_award', :'t', :'pg', 'AWARD', 'You received the Medal of Valor', 'Awarded for exceptional bravery under fire.', '/awards', null, now() - interval '2 hours'),
 ('seed_nt_event', :'t', :'pg', 'EVENT', 'Event soon: PvP Tournament', 'Starts in 3 days at Stanton - Yela.', '/events', null, now() - interval '5 hours'),
 ('seed_nt_forum', :'t', :'pg', 'FORUM_REPLY', 'New reply in Aaron belt mining position', 'VeganAmigo replied to a thread you follow.', '/forums', null, now() - interval '1 day'),
 ('seed_nt_news', :'t', :'pg', 'NEWS', 'New announcement: February Recruitment Drive', 'Recruitment is open — sponsor a recruit.', '/news', now() - interval '20 hours', now() - interval '1 day'),
 ('seed_nt_sys', :'t', :'pg', 'SYSTEM', 'Welcome to Freedom Guards HQ', 'Your account is set up. Explore the dashboard.', '/', now() - interval '3 days', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO comments (id, tenant_id, "entityType", entity_id, body, author_id, created_at) VALUES
 ('seed_cm_news1', :'t', 'NEWS', 'seed_news_welcome', 'Looking sharp. The new HQ is a huge upgrade — great work command.', :'pg', now() - interval '1 day'),
 ('seed_cm_news2', :'t', 'NEWS', 'seed_news_welcome', 'Bookmarking the forums link. See everyone Sunday.', :'admin', now() - interval '20 hours'),
 ('seed_cm_evt1', :'t', 'EVENT', 'seed_evt_pvp', 'I am in — flying a light fighter. Who else?', :'pg', now() - interval '6 hours'),
 ('seed_cm_gal1', :'t', 'GALLERY', 'seed_gal_1', 'That staging shot goes hard. Wallpaper material.', :'admin', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

SELECT (select count(*) from notifications where tenant_id=:'t') as notifs, (select count(*) from comments where tenant_id=:'t') as comments;
