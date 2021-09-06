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
    depth_level bigint,
    base_parent_id text,
    reactionfile text,
    filetype text
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
    videocount bigint DEFAULT 0
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
319d6fad-2946-405b-be30-1c1be4055e0b	https://duckduckgo.com	samsbusiness@gmail.com	cus_JyEOhkUMHbjVhL
\.


--
-- Data for Name: adverts; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.adverts (id, adlink, adfile, "position", businessid, subscriptionid, impressions) FROM stdin;
b73f7b6fd61bae1799e0f4cef571a012	/	/adverts/1628833118711-example_banner_mobile.jpeg	square	319d6fad-2946-405b-be30-1c1be4055e0b	sub_K1wy6AvamdiQeK	182
e37acc88dfead34efa50ad6c19bd714f	/	/adverts/1628913189660-example_banner_desktop.jpg	banner	319d6fad-2946-405b-be30-1c1be4055e0b	sub_K2IWu7KV13AchE	605
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.comments (user_id, comment, video_id, username, posttime, id, likes, dislikes, parent_id, depth_level, base_parent_id, reactionfile, filetype) FROM stdin;
319d6fad-2946-405b-be30-1c1be4055e0b	another test image comment	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2021-05-17T07:24:16.153Z	2yKTqCTg	0	0	\N	0	\N	/users/comments/1621236256197-worriedpepe.jpeg	img
319d6fad-2946-405b-be30-1c1be4055e0b	can I add a comment?	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2021-06-01T09:10:03.190Z	3QpwOhuY	0	0	\N	0	\N	\N	\N
319d6fad-2946-405b-be30-1c1be4055e0b	TEST FOR SCROLLING	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2021-05-30T03:01:19.241Z	x190Ptqi	0	0	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	1	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	second reply to the comment	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-09-01T08:29:15.066Z	ehA8pazt	0	0	4vspNGrz	2	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	third one for good measure	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-09-01T11:19:30.142Z	4kadKhTU	0	0	ehA8pazt	3	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	first reply to this video comment	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-09-01T08:16:53.270Z	4vspNGrz	0	0	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	1	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	fourth comment for testing shit	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-09-02T04:59:30.959Z	N0ihVbfD	0	0	4vspNGrz	2	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	This is a reply.	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-02-25T07:53:34.801Z	41d36f21-c097-4b95-b72e-459c1abe9f0c	0	0	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	1	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	This is a reply x2.	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-02-25T07:53:46.771Z	5bc8f455-9e4a-4825-8030-2e183d75280a	0	0	41d36f21-c097-4b95-b72e-459c1abe9f0c	2	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	\N	\N
319d6fad-2946-405b-be30-1c1be4055e0b	this is another reply x3	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2021-04-10T05:53:37.572Z	ebfe86fd-6d81-4080-b11c-662c354c883c	0	0	5bc8f455-9e4a-4825-8030-2e183d75280a	3	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	\N	\N
319d6fad-2946-405b-be30-1c1be4055e0b	Yay another one	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	example channel	2021-04-10T05:54:00.043Z	5520fd4f-d036-41fc-b77a-444b29affc21	0	0	41d36f21-c097-4b95-b72e-459c1abe9f0c	2	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	This is a video comment.	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-02-25T07:54:38.214Z	9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	0	0	\N	0	\N	/users/comments/1614239678215-nyan.mp4	video
60235bb8-41f0-42c9-8bd7-f12f645f10a3	This is a comment.	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-02-25T07:53:21.787Z	c1e9ab0e-93bf-4560-b0d5-3bf815790fdd	0	0	\N	0	\N	\N	\N
60235bb8-41f0-42c9-8bd7-f12f645f10a3	This is an image comment.	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	jane	2021-02-25T07:54:23.772Z	34f0ee46-ac3b-4c8a-a9a6-395b38b2157d	0	0	\N	0	\N	/users/comments/1614239663785-textreme.jpeg	img
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
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlists (user_id, name, id, videocount, candelete, private) FROM stdin;
319d6fad-2946-405b-be30-1c1be4055e0b	example playlist	d9d55174-1250-45ef-84d9-1426c478472b	3	t	f
60235bb8-41f0-42c9-8bd7-f12f645f10a3	janes playlist	YCMMMLlB	0	t	f
\.


--
-- Data for Name: playlistvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlistvideos (playlist_id, video_id, videoorder) FROM stdin;
edca22d2-1d51-4d99-aa5d-f99f28bd8b6b	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	1
d9d55174-1250-45ef-84d9-1426c478472b	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	1
d9d55174-1250-45ef-84d9-1426c478472b	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	2
d9d55174-1250-45ef-84d9-1426c478472b	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	3
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

COPY public.users (password, username, id, channelicon, channelbanner, subscribers, description, topics, streamkey, videocount) FROM stdin;
$2b$10$equ0TrTCwzA8TbqQXRPg1epYz5Xy4A0RPOid4sZOZvYhI4cFv7pZm	jane	60235bb8-41f0-42c9-8bd7-f12f645f10a3	/users/icons/1609522478769-space.png	/users/banners/1609522478769-skyscrapers.jpg	0	A second channel on the site	this is a second channel	wxOGBvOZ3DXnwJ8j7cMxFSXVbFSBysG2bPAP1VQRvo0=	1
$2b$10$wo4Hx.FPEvKydMybmPirYO1QSphfJk/Ermt4euUMVMQNP0QDrMke.	example channel	319d6fad-2946-405b-be30-1c1be4055e0b	/users/icons/1604712612118-bongoCat.png	/users/banners/1604712612118-bluecity.jpg	1	This is a test channel to test features on the site.	crumb webdev nodejs	XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=	2
\.


--
-- Data for Name: videofiles; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.videofiles (id, thumbnail, video, parentid, resolution) FROM stdin;
db5ee5c6-4dc5-4711-bd72-a166c5e47f25	/videos/thumbnails/1614151941099-bongoCat.png	/videos/files/1614151941099-nyan.mp4	\N	\N
bcec57c8-2eab-4acd-9f2e-24343d88c6fa	/videos/thumbnails/1614229350137-bluecity.jpg	/videos/files/1614229350415-Test WebSocket Stream.webm	\N	\N
81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	/videos/thumbnails/1614229816950-beautiful_landscapes_in_the_world-wallpaper-1920x1080.jpg	/videos/nmsMedia/live/XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=/2021-02-24-23-10-18.mp4	\N	\N
34f0ee46-ac3b-4c8a-a9a6-395b38b2157d	\N	/users/comments/1614239663785-textreme.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
9d12cc4d-2f19-46c9-9a3e-6a1d3ed42610	\N	/users/comments/1614239678215-nyan.mp4	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
061e8b98-c896-478f-8969-2d6bb69d61a5	/videos/thumbnails/1616467261063-antarctica.png	\N	\N	\N
cLtQABvZ	\N	/users/comments/1621236066275-worriedpepe.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
2yKTqCTg	\N	/users/comments/1621236256197-worriedpepe.jpeg	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	\N
73f606a5-69a4-4471-9d37-a4dc4eed488f	/videos/thumbnails/1614534795337-spiderverse.jpeg	/videos/files/1614534795337-nyan.mp4	\N	\N
d6101b91-12f8-4c44-8595-1df400634b64	/videos/thumbnails/1616459815640-antarctica.png	\N	\N	\N
a54cf7b7-a643-4475-86fd-cf62e9858140	/videos/thumbnails/1616048609795-city5.jpg	/videos/files/1616048609795-nyan.mp4	\N	\N
d1b4c755-b587-4c13-b45e-b43e3ac2ccdc	/videos/thumbnails/1616048661535-city5.jpg	/videos/files/1616048661535-nyan.mp4	\N	\N
1c0e5fa1-9c1f-48ad-9519-939d627493a6	/videos/thumbnails/1616048730363-city5.jpg	/videos/files/1616048730363-nyan.mp4	\N	\N
HmmwavpR	/videos/thumbnails/1623391587603-the_bean.jpeg	/videos/files/1623391587603-nyan.mp4	\N	[144,240,360]
T4Kmn4yy	/videos/thumbnails/1630038825773-electric_train_bright.jpeg	\N	\N	\N
A5WqEFt3	/videos/thumbnails/1630038976033-electric_train_bright.jpeg	\N	\N	\N
nDUVm2bu	/videos/thumbnails/1630039055353-electric_train_bright.jpeg	\N	\N	\N
4UA18p0C	/videos/thumbnails/1630039090387-electric_train_bright.jpeg	\N	\N	\N
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.videos (description, thumbnail, video, title, views, id, user_id, likes, dislikes, posttime, topics, username, channelicon, streaming, enablechat, streamtype, deleted, private, subtitles) FROM stdin;
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	/videos/thumbnails/1614229816950-beautiful_landscapes_in_the_world-wallpaper-1920x1080.jpg	/videos/nmsMedia/live/XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=/2021-02-24-23-10-18.mp4	Test OBS Stream	145	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-25T05:10:16.950Z	test obs stream	example channel	/users/icons/1604712612118-bongoCat.png	f	t	obs	f	f	\N
This is a test of the websocket live streaming capabilities of the site.	/videos/thumbnails/1614229350137-bluecity.jpg	/videos/files/1614229350415-Test WebSocket Stream.webm	Test WebSocket Stream	161	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	0	0	2021-02-25T05:02:30.137Z	web socket websocket stream test	jane	/users/icons/1609522478769-space.png	f	t	browser	f	f	\N
This is a test video to show the functionality of subtitles.	/videos/thumbnails/1623391587603-the_bean.jpeg	/videos/files/1623391587603-nyan.mp4	Subtitles Video Test	13	HmmwavpR	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-06-11T06:06:27.607Z	 subtitles 	example channel	/users/icons/1604712612118-bongoCat.png	f	\N	\N	f	f	/videos/subtitles1623391587603-example.srt
This is a test video upload for the site.	/videos/thumbnails/1614151941099-bongoCat.png	/videos/files/1614151941099-nyan.mp4	Test Video Upload	527	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-24T07:32:21.102Z	nyan cat video example upload test	example channel	/users/icons/1604712612118-bongoCat.png	f	\N	\N	f	f	\N
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

