--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

INSERT INTO drizzle.__drizzle_migrations VALUES (1, 'c8e099434dcbb5a18abd3681a51e0294ab82756cf4d8be779261063106d0f20e', 1754837375170);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (1, 'Administrador', 'admin@maniabrasil.com', '11999999999', '$2b$10$x62Kbq55EaQW2.cuejQtFOPf4kJPF7jrviAAFMtMltQDUQ2QKq1ce', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, false, '2025-09-03 00:36:19.904156', '2025-09-03 00:36:19.904156');


--
-- Data for Name: active_game_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: affiliates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: affiliate_clicks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: affiliate_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: affiliate_payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: deposits; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupon_uses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: daily_spins; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_premios; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: game_probabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: level_rewards_claimed; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: prize_probabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.prize_probabilities VALUES (38, 'premio_pix_conta', '0.5', NULL, 0.350000, 0, '2025-09-03 00:37:27.516732', 'admin');
INSERT INTO public.prize_probabilities VALUES (39, 'premio_pix_conta', '1', NULL, 0.250000, 0, '2025-09-03 00:37:27.519824', 'admin');
INSERT INTO public.prize_probabilities VALUES (40, 'premio_pix_conta', '2', NULL, 0.150000, 0, '2025-09-03 00:37:27.528202', 'admin');
INSERT INTO public.prize_probabilities VALUES (41, 'premio_pix_conta', '3', NULL, 0.100000, 0, '2025-09-03 00:37:27.531549', 'admin');
INSERT INTO public.prize_probabilities VALUES (42, 'premio_pix_conta', '4', NULL, 0.075000, 0, '2025-09-03 00:37:27.535546', 'admin');
INSERT INTO public.prize_probabilities VALUES (43, 'premio_pix_conta', '5', NULL, 0.050000, 0, '2025-09-03 00:37:27.538518', 'admin');
INSERT INTO public.prize_probabilities VALUES (44, 'premio_pix_conta', '10', NULL, 0.020000, 0, '2025-09-03 00:37:27.542903', 'admin');
INSERT INTO public.prize_probabilities VALUES (45, 'premio_pix_conta', '15', NULL, 0.004000, 0, '2025-09-03 00:37:27.546139', 'admin');
INSERT INTO public.prize_probabilities VALUES (46, 'premio_pix_conta', '20', NULL, 0.001000, 0, '2025-09-03 00:37:27.554891', 'admin');
INSERT INTO public.prize_probabilities VALUES (47, 'premio_eletronicos', '0.5', NULL, 0.350000, 0, '2025-09-03 00:37:27.558754', 'admin');
INSERT INTO public.prize_probabilities VALUES (48, 'premio_eletronicos', '1', NULL, 0.250000, 0, '2025-09-03 00:37:27.562956', 'admin');
INSERT INTO public.prize_probabilities VALUES (49, 'premio_eletronicos', '2', NULL, 0.150000, 0, '2025-09-03 00:37:27.5658', 'admin');
INSERT INTO public.prize_probabilities VALUES (50, 'premio_eletronicos', '3', NULL, 0.100000, 0, '2025-09-03 00:37:27.570456', 'admin');
INSERT INTO public.prize_probabilities VALUES (51, 'premio_eletronicos', '4', NULL, 0.075000, 0, '2025-09-03 00:37:27.573762', 'admin');
INSERT INTO public.prize_probabilities VALUES (52, 'premio_eletronicos', '5', NULL, 0.050000, 0, '2025-09-03 00:37:27.57906', 'admin');
INSERT INTO public.prize_probabilities VALUES (53, 'premio_eletronicos', '10', NULL, 0.020000, 0, '2025-09-03 00:37:27.582272', 'admin');
INSERT INTO public.prize_probabilities VALUES (54, 'premio_eletronicos', '15', NULL, 0.004000, 0, '2025-09-03 00:37:27.584952', 'admin');
INSERT INTO public.prize_probabilities VALUES (55, 'premio_eletronicos', '20', NULL, 0.001000, 0, '2025-09-03 00:37:27.588141', 'admin');
INSERT INTO public.prize_probabilities VALUES (56, 'premio_me_mimei', '0.5', NULL, 0.350000, 0, '2025-09-03 00:37:27.594177', 'admin');
INSERT INTO public.prize_probabilities VALUES (57, 'premio_me_mimei', '1', NULL, 0.250000, 0, '2025-09-03 00:37:27.596703', 'admin');
INSERT INTO public.prize_probabilities VALUES (58, 'premio_me_mimei', '2', NULL, 0.150000, 0, '2025-09-03 00:37:27.599519', 'admin');
INSERT INTO public.prize_probabilities VALUES (59, 'premio_me_mimei', '3', NULL, 0.100000, 0, '2025-09-03 00:37:27.601656', 'admin');
INSERT INTO public.prize_probabilities VALUES (60, 'premio_me_mimei', '4', NULL, 0.075000, 0, '2025-09-03 00:37:27.606031', 'admin');
INSERT INTO public.prize_probabilities VALUES (61, 'premio_me_mimei', '5', NULL, 0.050000, 0, '2025-09-03 00:37:27.608436', 'admin');
INSERT INTO public.prize_probabilities VALUES (62, 'premio_me_mimei', '10', NULL, 0.020000, 0, '2025-09-03 00:37:27.610917', 'admin');
INSERT INTO public.prize_probabilities VALUES (63, 'premio_me_mimei', '15', NULL, 0.004000, 0, '2025-09-03 00:37:27.613558', 'admin');
INSERT INTO public.prize_probabilities VALUES (64, 'premio_me_mimei', '20', NULL, 0.001000, 0, '2025-09-03 00:37:27.617514', 'admin');
INSERT INTO public.prize_probabilities VALUES (65, 'premio_super_premios', '10', NULL, 0.300000, 0, '2025-09-03 00:37:27.619991', 'admin');
INSERT INTO public.prize_probabilities VALUES (66, 'premio_super_premios', '20', NULL, 0.250000, 0, '2025-09-03 00:37:27.622558', 'admin');
INSERT INTO public.prize_probabilities VALUES (67, 'premio_super_premios', '40', NULL, 0.150000, 0, '2025-09-03 00:37:27.625011', 'admin');
INSERT INTO public.prize_probabilities VALUES (68, 'premio_super_premios', '60', NULL, 0.100000, 0, '2025-09-03 00:37:27.630313', 'admin');
INSERT INTO public.prize_probabilities VALUES (69, 'premio_super_premios', '80', NULL, 0.075000, 0, '2025-09-03 00:37:27.63301', 'admin');
INSERT INTO public.prize_probabilities VALUES (70, 'premio_super_premios', '100', NULL, 0.050000, 0, '2025-09-03 00:37:27.635455', 'admin');
INSERT INTO public.prize_probabilities VALUES (71, 'premio_super_premios', '200', NULL, 0.030000, 0, '2025-09-03 00:37:27.64014', 'admin');
INSERT INTO public.prize_probabilities VALUES (72, 'premio_super_premios', '300', NULL, 0.020000, 0, '2025-09-03 00:37:27.646813', 'admin');
INSERT INTO public.prize_probabilities VALUES (73, 'premio_super_premios', '400', NULL, 0.015000, 0, '2025-09-03 00:37:27.651577', 'admin');
INSERT INTO public.prize_probabilities VALUES (74, 'premio_super_premios', '500', NULL, 0.010000, 0, '2025-09-03 00:37:27.656939', 'admin');


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: referral_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: site_accesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.site_accesses VALUES (1, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=%3Ar4c%3A', false, '2025-09-03 00:37:44.605939');
INSERT INTO public.site_accesses VALUES (2, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/@vite/client', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/', false, '2025-09-03 00:37:45.551944');
INSERT INTO public.site_accesses VALUES (3, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/@react-refresh', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/', false, '2025-09-03 00:37:48.744285');
INSERT INTO public.site_accesses VALUES (4, NULL, '127.0.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/118.0.5993.88 Safari/537.36', 'desktop', 'Linux', 'Chrome Headless', 'Brasil', 'Unknown', 'Unknown', '/', NULL, false, '2025-09-03 00:38:00.089095');
INSERT INTO public.site_accesses VALUES (5, NULL, '127.0.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/118.0.5993.88 Safari/537.36', 'desktop', 'Linux', 'Chrome Headless', 'Brasil', 'Unknown', 'Unknown', '/@vite/client', 'http://127.0.0.1:5000/', false, '2025-09-03 00:38:00.16388');
INSERT INTO public.site_accesses VALUES (6, NULL, '127.0.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/118.0.5993.88 Safari/537.36', 'desktop', 'Linux', 'Chrome Headless', 'Brasil', 'Unknown', 'Unknown', '/@react-refresh', 'http://127.0.0.1:5000/', false, '2025-09-03 00:38:00.212533');
INSERT INTO public.site_accesses VALUES (7, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/__replco/workspace_iframe.html?initialPath=%2F&id=%3Ar4c%3A', false, '2025-09-03 01:24:40.934746');
INSERT INTO public.site_accesses VALUES (8, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/@vite/client', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/', false, '2025-09-03 01:24:42.47239');
INSERT INTO public.site_accesses VALUES (9, NULL, '179.225.168.163', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'desktop', 'Windows', 'Chrome', 'Brasil', 'Unknown', 'Unknown', '/@react-refresh', 'https://ab823999-80ca-41bd-a50c-c21a212116c7-00-3u2z7lmusbelp.picard.replit.dev/', false, '2025-09-03 01:24:46.280604');


--
-- Data for Name: support_chats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: support_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tier_rewards_claimed; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: withdrawals; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, true);


--
-- Name: active_game_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.active_game_sessions_id_seq', 1, false);


--
-- Name: admin_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_sessions_id_seq', 1, false);


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affiliate_clicks_id_seq', 1, false);


--
-- Name: affiliate_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affiliate_conversions_id_seq', 1, false);


--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affiliate_payouts_id_seq', 1, false);


--
-- Name: affiliates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.affiliates_id_seq', 1, false);


--
-- Name: coupon_uses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coupon_uses_id_seq', 1, false);


--
-- Name: coupons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coupons_id_seq', 1, false);


--
-- Name: daily_spins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_spins_id_seq', 1, false);


--
-- Name: deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deposits_id_seq', 1, false);


--
-- Name: game_premios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.game_premios_id_seq', 1, false);


--
-- Name: game_probabilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.game_probabilities_id_seq', 1, false);


--
-- Name: games_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.games_id_seq', 1, false);


--
-- Name: level_rewards_claimed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.level_rewards_claimed_id_seq', 1, false);


--
-- Name: prize_probabilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prize_probabilities_id_seq', 74, true);


--
-- Name: referral_earnings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referral_earnings_id_seq', 1, false);


--
-- Name: referrals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referrals_id_seq', 1, false);


--
-- Name: site_accesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.site_accesses_id_seq', 9, true);


--
-- Name: support_chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_chats_id_seq', 1, false);


--
-- Name: support_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_messages_id_seq', 1, false);


--
-- Name: tier_rewards_claimed_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tier_rewards_claimed_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wallets_id_seq', 1, false);


--
-- Name: withdrawals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.withdrawals_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

