-- Idempotent demo content batch 2 for freedomguards (resources, contracts,
-- awards+grants, alliances, lfg, tournaments, gallery).
\set t 'cmqb61ms30000mt2otaf5n0qb'
\set a 'cmqe4g8b30002l810dv6ll5xs'
\set m1 'cmqe4g8cw000zl810tt7kkmxt'
\set m2 'cmqe4g8c9000kl810srk5ue5c'

INSERT INTO resources (id, tenant_id, title, url, body, category, created_by_id, created_at) VALUES
 ('seed_res_roe', :'t', 'Rules of Engagement', null, 'Standard combat ROE for all Freedom Guard operations. Read before joining any op.', 'Doctrine', :'a', now()),
 ('seed_res_trade', :'t', 'Trade Route Cheat Sheet', 'https://uexcorp.space', 'Current best commodity loops, updated weekly from UEX.', 'Economy', :'a', now()),
 ('seed_res_newbie', :'t', 'New Member Onboarding', null, 'Everything a fresh recruit needs: comms setup, ranks, first op checklist.', 'Onboarding', :'a', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO contracts (id, tenant_id, title, description, reward, status, claimed_by_id, created_by_id, created_at, updated_at) VALUES
 ('seed_ct_escort', :'t', 'Escort: Aaron Belt mining convoy', 'Provide armed escort for the Sunday mining convoy. 2 fighters needed.', '50,000 aUEC', 'OPEN', null, :'a', now(), now()),
 ('seed_ct_salvage', :'t', 'Salvage run: derelict near Daymar', 'Recover components from the flagged derelict. Split 60/40.', '30,000 aUEC + components', 'CLAIMED', :'m1', :'a', now(), now()),
 ('seed_ct_recon', :'t', 'Recon: Pyro jump point activity', 'Scout and log hostile traffic through the Pyro gateway.', '20,000 aUEC', 'COMPLETED', :'m2', :'a', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO awards (id, tenant_id, name, description, created_by_id, created_at) VALUES
 ('seed_aw_valor', :'t', 'Medal of Valor', 'Awarded for exceptional bravery under fire.', :'a', now()),
 ('seed_aw_industry', :'t', 'Industrialist Star', 'For outstanding contribution to the org economy.', :'a', now()),
 ('seed_aw_vet', :'t', 'Veteran Service Ribbon', 'Six months of active, loyal service.', :'a', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO member_awards (id, tenant_id, award_id, membership_id, note, awarded_by_id, awarded_at) VALUES
 ('seed_ma_1', :'t', 'seed_aw_valor', :'m1', 'Held the line during the Iron Fortune raid.', :'a', now()),
 ('seed_ma_2', :'t', 'seed_aw_industry', :'m2', 'Top miner three months running.', :'a', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO alliances (id, tenant_id, name, description, link, created_by_id, created_at) VALUES
 ('seed_al_vanguard', :'t', 'Vanguard Coalition', 'Mutual-defense pact and shared trade intel.', null, :'a', now()),
 ('seed_al_drifters', :'t', 'Daymar Drifters', 'Non-aggression and joint mining ops.', null, :'a', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lfg_posts (id, tenant_id, title, body, status, author_id, created_at) VALUES
 ('seed_lfg_bounty', :'t', 'LF 2 for bounty hunting tonight', 'Running a bounty board grind, need a wingman and a medic. 8pm EST.', 'OPEN', :'m1', now()),
 ('seed_lfg_cargo', :'t', 'Cargo haul crew wanted', 'Big multi-SCU run, need haulers + escort. Profit split even.', 'OPEN', :'m2', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tournaments (id, tenant_id, name, description, format, status, starts_at, created_by_membership_id, created_at, updated_at) VALUES
 ('seed_tn_dogfight', :'t', 'Winter Dogfight Cup', 'Single-elim 1v1 light fighter bracket.', 'Single elimination', 'OPEN', now() + interval '6 days', :'a', now(), now()),
 ('seed_tn_race', :'t', 'Daymar Time Trial', 'Best lap on the Daymar rally circuit.', 'Time trial', 'DRAFT', now() + interval '12 days', :'a', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO gallery_items (id, tenant_id, title, image_url, caption, created_by_id, created_at) VALUES
 ('seed_gal_1', :'t', 'Fleet at sunset', 'https://picsum.photos/seed/fgfleet/900/506', 'The armada staged over microTech before the raid.', :'a', now()),
 ('seed_gal_2', :'t', 'Mining haul', 'https://picsum.photos/seed/fgmining/900/506', 'A full Prospector load of quantainium.', :'a', now()),
 ('seed_gal_3', :'t', 'Victory formation', 'https://picsum.photos/seed/fgvictory/900/506', 'Post-op flyby after Iron Fortune.', :'a', now())
ON CONFLICT (id) DO NOTHING;

SELECT
 (select count(*) from resources where tenant_id=:'t') resources,
 (select count(*) from contracts where tenant_id=:'t') contracts,
 (select count(*) from awards where tenant_id=:'t') awards,
 (select count(*) from member_awards where tenant_id=:'t') grants,
 (select count(*) from alliances where tenant_id=:'t') alliances,
 (select count(*) from lfg_posts where tenant_id=:'t') lfg,
 (select count(*) from tournaments where tenant_id=:'t') tournaments,
 (select count(*) from gallery_items where tenant_id=:'t') gallery;
