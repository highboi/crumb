--
-- PostgreSQL database dump
--

-- Dumped from database version 12.3 (Debian 12.3-1+b1)
-- Dumped by pg_dump version 12.3 (Debian 12.3-1+b1)

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
-- Name: comments; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.comments (
    user_id text,
    comment character varying(1000),
    video_id text,
    username text,
    posttime text,
    id text,
    likes text,
    dislikes text,
    parent_id text,
    depth_level bigint,
    base_parent_id text,
    reactionfile text
);


ALTER TABLE public.comments OWNER TO merlin;

--
-- Name: commonwords; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.commonwords (
    word text,
    score bigint
);


ALTER TABLE public.commonwords OWNER TO merlin;

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
    message character varying(200),
    stream_id text,
    user_id text,
    "time" integer
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
    candelete boolean
);


ALTER TABLE public.playlists OWNER TO merlin;

--
-- Name: playlistvideos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.playlistvideos (
    playlist_id text,
    video_id text
);


ALTER TABLE public.playlistvideos OWNER TO merlin;

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
    password text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    id text DEFAULT 0 NOT NULL,
    channelicon text,
    channelbanner text,
    subscribers bigint DEFAULT 0,
    description character varying(1000),
    topics text,
    streamkey text,
    videos bigint DEFAULT 0
);


ALTER TABLE public.users OWNER TO merlin;

--
-- Name: videos; Type: TABLE; Schema: public; Owner: merlin
--

CREATE TABLE public.videos (
    description character varying(5000) NOT NULL,
    thumbnail text NOT NULL,
    video text,
    title character varying(300) NOT NULL,
    views bigint NOT NULL,
    id text NOT NULL,
    user_id text,
    likes bigint DEFAULT 0 NOT NULL,
    dislikes bigint DEFAULT 0 NOT NULL,
    posttime text,
    topics text,
    username text,
    channelicon text,
    streaming boolean,
    enablechat boolean,
    magnetlink text
);


ALTER TABLE public.videos OWNER TO merlin;

--
-- Name: videos_views_seq; Type: SEQUENCE; Schema: public; Owner: merlin
--

CREATE SEQUENCE public.videos_views_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.videos_views_seq OWNER TO merlin;

--
-- Name: videos_views_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: merlin
--

ALTER SEQUENCE public.videos_views_seq OWNED BY public.videos.views;


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.comments (user_id, comment, video_id, username, posttime, id, likes, dislikes, parent_id, depth_level, base_parent_id, reactionfile) FROM stdin;
\.


--
-- Data for Name: commonwords; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.commonwords (word, score) FROM stdin;
Wordscore	0
OBS	0
topics	0
topic	1
list	1
crumb	0
webdev	0
nodejs	0
jane	0
this	11
is	11
a	11
second	0
channel	0
torrent	0
video	0
nyan	1
cat	1
webtorrent	111111
test	11111111
sam	11111111
\.


--
-- Data for Name: dislikedcomments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.dislikedcomments (user_id, comment_id) FROM stdin;
7d9b8296-9252-4651-b5d0-ea2d48ad2c22	70cfa20f-049a-4df2-90fe-4d31232b79eb
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
7d9b8296-9252-4651-b5d0-ea2d48ad2c22	80e1a3e6-bdde-45e9-ba83-3c56bc781c13
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
hello there	b81ffe5b-3b1f-4c1a-94d8-56e5730c0ec8	6f1496fb4b3b289b333f0f	7
hello there	e5c1bc14-6784-4979-95f4-04b6146e92f2	6f1496fb4b3b289b333f0f	14
this is a cool live chat	2707432b-90f6-42ca-8bd8-97bf9096f832	6f1496fb4b3b289b333f0f	52
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlists (user_id, name, id, videocount, candelete) FROM stdin;
8e9dacef-06b8-488a-94ea-2adf4bcc1a1d	Watch Later	1316a5b7-e2bc-4ddb-aeae-9c82b41a951e	0	f
60235bb8-41f0-42c9-8bd7-f12f645f10a3	Watch Later	2b8245db-dd2f-4e82-82af-7ab1c838b4cd	0	f
\.


--
-- Data for Name: playlistvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.playlistvideos (playlist_id, video_id) FROM stdin;
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

COPY public.users (password, email, username, id, channelicon, channelbanner, subscribers, description, topics, streamkey, videos) FROM stdin;
$2b$10$equ0TrTCwzA8TbqQXRPg1epYz5Xy4A0RPOid4sZOZvYhI4cFv7pZm	jane@gmail.com	jane	60235bb8-41f0-42c9-8bd7-f12f645f10a3	/users/icons/1609522478769-space.png	/users/banners/1609522478769-skyscrapers.jpg	0	A second channel on the site	this is a second channel	wxOGBvOZ3DXnwJ8j7cMxFSXVbFSBysG2bPAP1VQRvo0=	0
$2b$10$wo4Hx.FPEvKydMybmPirYO1QSphfJk/Ermt4euUMVMQNP0QDrMke.	sam@gmail.com	sam	319d6fad-2946-405b-be30-1c1be4055e0b	/users/icons/1604712612118-bongoCat.png	/users/banners/1604712612118-bluecity.jpg	1	This is a test channel to test features on the site.	crumb webdev nodejs	XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=	11
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY public.videos (description, thumbnail, video, title, views, id, user_id, likes, dislikes, posttime, topics, username, channelicon, streaming, enablechat, magnetlink) FROM stdin;
This is a stream from obs to test the insertion of wordscores.	/videos/thumbnails/1606883502921-cosmos.jpg	/videos/nmsMedia/live/XpKfuO+ZsJIQ71MSfWvCcgPRksb0n2hWXe3hGahhUWU=/2020-12-01-22-32-02.mp4	OBS topics test	126	23f8ea1f-a61a-4a96-bc38-9c3a01d89d50	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2020-12-01-22-31-42	this is a topic list	sam	/users/icons/1604712612118-bongoCat.png	t	t	magnet:?xt=urn:btih:105c7ff4f6ab3ece5e62ba9f7344c3e57d107ca1&dn=name&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com
This is a video to test the wordscore system on the video details.	/videos/thumbnails/1606883371249-skyscrapers.jpg	/videos/files/1606883371249-nyan.mp4	Wordscore test	206	19674674-63ea-47af-8e75-ace6893c9162	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2020-12-01-22-29-31	this is a topic list	sam	/users/icons/1604712612118-bongoCat.png	t	\N	magnet:?xt=urn:btih:b4cd04f71282005db76691dcdd6473be0f9739df&dn=name&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com
asdf	/videos/thumbnails/1604714996257-atlantis.jpg	/videos/files/1604714996459-undefined.webm	test web stream	20	72557625-4d5c-44f1-af01-4139b156e842	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2020-11-06-20-09-56	asdf	sam	/users/icons/1604712612118-bongoCat.png	f	\N	magnet:?xt=urn:btih:9e5b30fa8640e5e98a842f923f762bafc449c271&dn=name&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com
\.


--
-- Name: videos_views_seq; Type: SEQUENCE SET; Schema: public; Owner: merlin
--

SELECT pg_catalog.setval('public.videos_views_seq', 5, true);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: merlin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: merlin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: videos videos_thumbnail_key; Type: CONSTRAINT; Schema: public; Owner: merlin
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_thumbnail_key UNIQUE (thumbnail);


--
-- Name: videos videos_video_key; Type: CONSTRAINT; Schema: public; Owner: merlin
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_video_key UNIQUE (video);


--
-- PostgreSQL database dump complete
--

