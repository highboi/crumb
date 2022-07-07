--
-- PostgreSQL database dump
--

-- Dumped from database version 12.5 (Ubuntu 12.5-0ubuntu0.20.04.1)
-- Dumped by pg_dump version 12.5 (Ubuntu 12.5-0ubuntu0.20.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: advertisers; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.advertisers (
    id text,
    businessdomain text,
    businessemail text,
    customerid text
);


ALTER TABLE public.advertisers OWNER TO merlin;

--
-- Name: adverts; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.adverts (
    id text,
    adlink text,
    adfile text,
    "position" text,
    businessid text,
    subscriptionid text,
    impressions bigint DEFAULT 0
);


ALTER TABLE public.adverts OWNER TO merlin;

--
-- Name: bugs; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.bugs (
    description text,
    url text,
    userid text DEFAULT 'anonymous'::text
);


ALTER TABLE public.bugs OWNER TO merlin;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.comments (
    user_id text,
    comment character varying(1000),
    video_id text,
    username text,
    posttime text,
    id text,
    likes bigint,
    dislikes bigint,
    parent_id text,
    reactionfile text,
    filetype text,
    replies text,
    deleted boolean
);


ALTER TABLE public.comments OWNER TO merlin;

--
-- Name: dislikedcomments; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.dislikedcomments (
    user_id text,
    comment_id text
);


ALTER TABLE public.dislikedcomments OWNER TO merlin;

--
-- Name: dislikedvideos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.dislikedvideos (
    user_id text,
    video_id text
);


ALTER TABLE public.dislikedvideos OWNER TO merlin;

--
-- Name: likedcomments; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.likedcomments (
    user_id text,
    comment_id text
);


ALTER TABLE public.likedcomments OWNER TO merlin;

--
-- Name: likedvideos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.likedvideos (
    user_id text,
    video_id text
);


ALTER TABLE public.likedvideos OWNER TO merlin;

--
-- Name: livechat; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.livechat (
    message text,
    stream_id text,
    user_id text,
    "time" bigint
);


ALTER TABLE public.livechat OWNER TO merlin;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.playlists (
    user_id text,
    name character varying(500),
    id text,
    videocount bigint DEFAULT 0,
    candelete boolean DEFAULT true,
    private boolean DEFAULT false
);


ALTER TABLE public.playlists OWNER TO merlin;

--
-- Name: playlistvideos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.playlistvideos (
    playlist_id text,
    video_id text,
    videoorder bigint
);


ALTER TABLE public.playlistvideos OWNER TO merlin;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.reports (
    content_id text,
    content_type text,
    reason text,
    reporter_id text,
    "timestamp" bigint
);


ALTER TABLE public.reports OWNER TO merlin;

--
-- Name: shoutouts; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.shoutouts (
    user_id text,
    shoutout_id text
);


ALTER TABLE public.shoutouts OWNER TO merlin;

--
-- Name: subscribed; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.subscribed (
    channel_id text,
    user_id text
);


ALTER TABLE public.subscribed OWNER TO merlin;

--
-- Name: subscribedtopics; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.subscribedtopics (
    topicname text,
    user_id text
);


ALTER TABLE public.subscribedtopics OWNER TO merlin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.users (
    password text,
    username text,
    id text,
    channelicon text,
    channelbanner text,
    subscribers bigint DEFAULT 0,
    description character varying(1000),
    topics text,
    streamkey text,
    videocount bigint DEFAULT 0,
    customerid text,
    accountid text
);


ALTER TABLE public.users OWNER TO merlin;

--
-- Name: videofiles; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.videofiles (
    id text,
    thumbnail text,
    video text,
    parentid text,
    resolution text
);


ALTER TABLE public.videofiles OWNER TO merlin;

--
-- Name: videos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.videos (
    description character varying(5000),
    thumbnail text,
    video text,
    title character varying(300),
    views bigint DEFAULT 0,
    id text,
    user_id text,
    likes bigint DEFAULT 0,
    dislikes bigint DEFAULT 0,
    posttime text,
    topics text,
    username text,
    channelicon text,
    streaming boolean DEFAULT false,
    enablechat boolean,
    streamtype text,
    deleted boolean DEFAULT false,
    private boolean DEFAULT false,
    subtitles text
);


ALTER TABLE public.videos OWNER TO merlin;

--
-- Data for Name: advertisers; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.advertisers (id, businessdomain, businessemail, customerid) FROM stdin;
\.


--
-- Data for Name: adverts; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.adverts (id, adlink, adfile, "position", businessid, subscriptionid, impressions) FROM stdin;
\.


--
-- Data for Name: bugs; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.bugs (description, url, userid) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.comments (user_id, comment, video_id, username, posttime, id, likes, dislikes, parent_id, reactionfile, filetype, replies, deleted) FROM stdin;
319d6fad-2946-405b-be30-1c1be4055e0b	another reply	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2022-07-01T03:02:04.964Z	pbxW32HB	0	0	blsxxT9a	\N	\N	\N	\N
319d6fad-2946-405b-be30-1c1be4055e0b	this is a comment	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2022-07-01T03:01:45.641Z	blsxxT9a	0	0	\N	\N	\N	Qu0r1V3M,pbxW32HB,	\N
319d6fad-2946-405b-be30-1c1be4055e0b	[DELETED]	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2022-07-01T03:01:52.744Z	Qu0r1V3M	0	0	blsxxT9a	\N	\N	\N	\N
\.


--
-- Data for Name: dislikedcomments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.dislikedcomments (user_id, comment_id) FROM stdin;
\.


--
-- Data for Name: dislikedvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.dislikedvideos (user_id, video_id) FROM stdin;
\.


--
-- Data for Name: likedcomments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.likedcomments (user_id, comment_id) FROM stdin;
\.


--
-- Data for Name: likedvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.likedvideos (user_id, video_id) FROM stdin;
\.


--
-- Data for Name: livechat; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.livechat (message, stream_id, user_id, "time") FROM stdin;
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	7
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	8
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	9
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	9
hello	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	9
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
hello there	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	16
this is a live chat message	5DdR5QcN	ve9BNlwW	18
this is another live chat message	5DdR5QcN	ve9BNlwW	24
this is another live chat message	5DdR5QcN	ve9BNlwW	25
this is another live chat message	5DdR5QcN	ve9BNlwW	25
this is another live chat message	5DdR5QcN	ve9BNlwW	25
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlists (user_id, name, id, videocount, candelete, private) FROM stdin;
60235bb8-41f0-42c9-8bd7-f12f645f10a3	janes playlist	YCMMMLlB	0	t	f
319d6fad-2946-405b-be30-1c1be4055e0b	example playlist	d9d55174-1250-45ef-84d9-1426c478472b	4	t	f
319d6fad-2946-405b-be30-1c1be4055e0b	another one	ZuUptkwg	1	t	f
\.


--
-- Data for Name: playlistvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlistvideos (playlist_id, video_id, videoorder) FROM stdin;
edca22d2-1d51-4d99-aa5d-f99f28bd8b6b	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	1
d9d55174-1250-45ef-84d9-1426c478472b	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	1
d9d55174-1250-45ef-84d9-1426c478472b	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	2
d9d55174-1250-45ef-84d9-1426c478472b	HmmwavpR	3
d9d55174-1250-45ef-84d9-1426c478472b	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	4
ZuUptkwg	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	1
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.reports (content_id, content_type, reason, reporter_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: shoutouts; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.shoutouts (user_id, shoutout_id) FROM stdin;
60235bb8-41f0-42c9-8bd7-f12f645f10a3	319d6fad-2946-405b-be30-1c1be4055e0b
\.


--
-- Data for Name: subscribed; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.subscribed (channel_id, user_id) FROM stdin;
06cb58d8a56e84c3ea970a	6f1496fb4b3b289b333f0f
319d6fad-2946-405b-be30-1c1be4055e0b	60235bb8-41f0-42c9-8bd7-f12f645f10a3
\.


--
-- Data for Name: subscribedtopics; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.subscribedtopics (topicname, user_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.users (password, username, id, channelicon, channelbanner, subscribers, description, topics, streamkey, videocount, customerid, accountid) FROM stdin;
$2b$10$equ0TrTCwzA8TbqQXRPg1epYz5Xy4A0RPOid4sZOZvYhI4cFv7pZm	jane	60235bb8-41f0-42c9-8bd7-f12f645f10a3	/users/icons/1609522478769-space.png	/users/banners/1609522478769-skyscrapers.jpg	0	A second channel on the site	this is a second channel	wxOGBvOZ3DXnwJ8j7cMxFSXVbFSBysG2bPAP1VQRvo0=	1	\N	\N
$2b$10$wo4Hx.FPEvKydMybmPirYO1QSphfJk/Ermt4euUMVMQNP0QDrMke.	example channel	319d6fad-2946-405b-be30-1c1be4055e0b	/users/icons/1604712612118-bongoCat.png	/users/banners/1604712612118-bluecity.jpg	1	This is a test channel to test features on the site.	crumb webdev nodejs	XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=	2	\N	\N
\.


--
-- Data for Name: videofiles; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.videofiles (id, thumbnail, video, parentid, resolution) FROM stdin;
db5ee5c6-4dc5-4711-bd72-a166c5e47f25	/videos/thumbnails/1614151941099-bongoCat.png	/videos/files/1614151941099-nyan.mp4	\N	\N
bcec57c8-2eab-4acd-9f2e-24343d88c6fa	/videos/thumbnails/1614229350137-bluecity.jpg	/videos/files/1614229350415-Test WebSocket Stream.webm	\N	\N
0DNgyEcz	\N	/users/comments/1640853554720-mages.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
pYfyziW9	\N	/users/comments/1640854124661-nyan.mp4	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	/videos/thumbnails/1614229816950-beautiful_landscapes_in_the_world-wallpaper-1920x1080.jpg	/videos/nmsMedia/live/XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=/2021-02-24-23-10-18.mp4	\N	\N
34f0ee46-ac3b-4c8a-a9a6-395b38b2157d	\N	/users/comments/1614239663785-textreme.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	/users/comments/1614239678215-nyan.mp4	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
UaMGXDFc	\N	/users/comments/1638423805860-mini_cooper.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
ONVAsZQw	/videos/thumbnails/1638765250355-flying_blue.jpeg	/videos/files/1638765250355-nyan.mp4	\N	[144,240,360]
fNZIcr9g	\N	/users/comments/1638765290673-magic_library.jpeg	ONVAsZQw	\N
5DdR5QcN	/videos/thumbnails/1638765401579-floating_castle.jpeg	/videos/files/1638765401760-zach webcam stream.webm	\N	\N
061e8b98-c896-478f-8969-2d6bb69d61a5	/videos/thumbnails/1616467261063-antarctica.png	\N	\N	\N
a4bhGre0	\N	/users/comments/1640857644386-kraken_ship.png	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
kghCJjbf	/videos/thumbnails/1640497458971-castle_in_the_distance.jpeg	/videos/files/1640497458971-nyan.mp4	\N	[144,240,360]
rCh4I6JU	/videos/thumbnails/1632033327110-dune_worm.jpeg	/videos/files/1632033327358-asdf.webm	\N	\N
cLtQABvZ	\N	/users/comments/1621236066275-worriedpepe.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
cw7FZvKb	\N	/users/comments/1640497514175-flying_blue.jpeg	kghCJjbf	\N
2yKTqCTg	\N	/users/comments/1621236256197-worriedpepe.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
73f606a5-69a4-4471-9d37-a4dc4eed488f	/videos/thumbnails/1614534795337-spiderverse.jpeg	/videos/files/1614534795337-nyan.mp4	\N	\N
Rk7v36HK	/videos/thumbnails/1640497632050-electric_train_bright.jpeg	/videos/files/1640497632285-example webcam stream.webm	\N	\N
d6101b91-12f8-4c44-8595-1df400634b64	/videos/thumbnails/1616459815640-antarctica.png	\N	\N	\N
a54cf7b7-a643-4475-86fd-cf62e9858140	/videos/thumbnails/1616048609795-city5.jpg	/videos/files/1616048609795-nyan.mp4	\N	\N
d1b4c755-b587-4c13-b45e-b43e3ac2ccdc	/videos/thumbnails/1616048661535-city5.jpg	/videos/files/1616048661535-nyan.mp4	\N	\N
1c0e5fa1-9c1f-48ad-9519-939d627493a6	/videos/thumbnails/1616048730363-city5.jpg	/videos/files/1616048730363-nyan.mp4	\N	\N
HmmwavpR	/videos/thumbnails/1623391587603-the_bean.jpeg	/videos/files/1623391587603-nyan.mp4	\N	[144,240,360]
T4Kmn4yy	/videos/thumbnails/1630038825773-electric_train_bright.jpeg	\N	\N	\N
A5WqEFt3	/videos/thumbnails/1630038976033-electric_train_bright.jpeg	\N	\N	\N
nDUVm2bu	/videos/thumbnails/1630039055353-electric_train_bright.jpeg	\N	\N	\N
4UA18p0C	/videos/thumbnails/1630039090387-electric_train_bright.jpeg	\N	\N	\N
fOujGlqb	\N	/users/comments/1642715133635-nyan.mp4	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.videos (description, thumbnail, video, title, views, id, user_id, likes, dislikes, posttime, topics, username, channelicon, streaming, enablechat, streamtype, deleted, private, subtitles) FROM stdin;
This is jeffs first webcam stream	/server/deleteicon.png			0	XUq4QMsH	XVSfYy4m	0	0	2022-01-27T04:08:10.136Z			/server/deletechannelicon.png	f	t	browser	t	f	\N
I'm buying OBS next.	/server/deleteicon.png			0	29pTOsVG	XVSfYy4m	0	0	2022-01-27T04:09:34.207Z	obs		/server/deletechannelicon.png	f	t	obs	t	f	\N
this is jeffs first video	/server/deleteicon.png			0	ZlaRKZev	XVSfYy4m	0	0	2022-01-27T04:05:42.163Z	 parler aws 		/server/deletechannelicon.png	f	\N	\N	t	f	
This is a test of the websocket live streaming capabilities of the site.	/videos/thumbnails/1614229350137-bluecity.jpg	/videos/files/1614229350415-Test WebSocket Stream.webm	Test WebSocket Stream	204	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	0	0	2021-02-25T05:02:30.137Z	web socket websocket stream test	jane	/users/icons/1609522478769-space.png	f	t	browser	f	f	\N
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	/videos/thumbnails/1614229816950-beautiful_landscapes_in_the_world-wallpaper-1920x1080.jpg	/videos/nmsMedia/live/XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=/2021-02-24-23-10-18.mp4	Test OBS Stream	156	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-25T05:10:16.950Z	test obs stream	example channel	/users/icons/1604712612118-bongoCat.png	f	t	obs	f	f	\N
This is a test video to show the functionality of subtitles.	/videos/thumbnails/1623391587603-the_bean.jpeg	/videos/files/1623391587603-nyan.mp4	Subtitles Video Test	59	HmmwavpR	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-06-11T06:06:27.607Z	 subtitles 	example channel	/users/icons/1604712612118-bongoCat.png	f	\N	\N	f	f	/videos/subtitles1623391587603-example.srt
asdf	/server/deleteicon.png			0	wymdU1et	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-01-27T04:17:50.008Z	nyan		/server/deletechannelicon.png	f	t	obs	t	f	\N
This is a test video upload for the site.	/videos/thumbnails/1614151941099-bongoCat.png	/videos/files/1614151941099-nyan.mp4	Test Video Upload	1032	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-24T07:32:21.102Z	nyan cat video example upload test	example channel	/users/icons/1604712612118-bongoCat.png	f	\N	\N	f	f	\N
This is an example video that is set to private in order to keep it hidden from other users.	/videos/thumbnails/1614534795337-spiderverse.jpeg	/videos/files/1614534795337-nyan.mp4	Example Private Video	2	73f606a5-69a4-4471-9d37-a4dc4eed488f	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-28T17:53:15.344Z	private video	example channel	/users/icons/1604712612118-bongoCat.png	f	\N	\N	f	t	\N
\.


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: merlin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- PostgreSQL database dump complete
--

