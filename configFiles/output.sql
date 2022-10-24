--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: advertisers; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE advertisers (
    id text,
    businessdomain text,
    businessemail text,
    customerid text
);


ALTER TABLE public.advertisers OWNER TO merlin;

--
-- Name: adverts; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE adverts (
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
-- Name: bugs; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE bugs (
    description text,
    url text,
    userid text DEFAULT 'anonymous'::text
);


ALTER TABLE public.bugs OWNER TO merlin;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE comments (
    user_id text,
    comment character varying(1000),
    content_id text,
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
-- Name: dislikedcomments; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE dislikedcomments (
    user_id text,
    comment_id text
);


ALTER TABLE public.dislikedcomments OWNER TO merlin;

--
-- Name: dislikedvideos; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE dislikedvideos (
    user_id text,
    video_id text
);


ALTER TABLE public.dislikedvideos OWNER TO merlin;

--
-- Name: images; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE images (
    id text,
    title text,
    image text,
    topics text,
    posttime text,
    user_id text,
    username text,
    channelicon text,
    private boolean,
    deleted boolean,
    type text DEFAULT 'image'::text
);


ALTER TABLE public.images OWNER TO merlin;

--
-- Name: likedcomments; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE likedcomments (
    user_id text,
    comment_id text
);


ALTER TABLE public.likedcomments OWNER TO merlin;

--
-- Name: likedvideos; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE likedvideos (
    user_id text,
    video_id text
);


ALTER TABLE public.likedvideos OWNER TO merlin;

--
-- Name: livechat; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE livechat (
    message text,
    stream_id text,
    user_id text,
    "time" bigint
);


ALTER TABLE public.livechat OWNER TO merlin;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE playlists (
    user_id text,
    name character varying(500),
    id text,
    videocount bigint DEFAULT 0,
    candelete boolean DEFAULT true,
    private boolean DEFAULT false
);


ALTER TABLE public.playlists OWNER TO merlin;

--
-- Name: playlistvideos; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE playlistvideos (
    playlist_id text,
    video_id text,
    videoorder bigint
);


ALTER TABLE public.playlistvideos OWNER TO merlin;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE reports (
    content_id text,
    content_type text,
    reason text,
    reporter_id text,
    "timestamp" bigint
);


ALTER TABLE public.reports OWNER TO merlin;

--
-- Name: shoutouts; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE shoutouts (
    user_id text,
    shoutout_id text
);


ALTER TABLE public.shoutouts OWNER TO merlin;

--
-- Name: subscribed; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE subscribed (
    channel_id text,
    user_id text
);


ALTER TABLE public.subscribed OWNER TO merlin;

--
-- Name: subscribedtopics; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE subscribedtopics (
    topicname text,
    user_id text
);


ALTER TABLE public.subscribedtopics OWNER TO merlin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE users (
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
    accountid text,
    email text
);


ALTER TABLE public.users OWNER TO merlin;

--
-- Name: videofiles; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE videofiles (
    id text,
    thumbnail text,
    video text,
    parentid text,
    resolution text
);


ALTER TABLE public.videofiles OWNER TO merlin;

--
-- Name: videos; Type: TABLE; Schema: public; Owner: merlin; Tablespace: 
--

CREATE TABLE videos (
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
    subtitles text,
    type text DEFAULT 'video'::text
);


ALTER TABLE public.videos OWNER TO merlin;

--
-- Data for Name: advertisers; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY advertisers (id, businessdomain, businessemail, customerid) FROM stdin;
319d6fad-2946-405b-be30-1c1be4055e0b	https://duckduckgo.com	examplebusiness@gmail.com	cus_M0wRKReO9YEoYl
\.


--
-- Data for Name: adverts; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY adverts (id, adlink, adfile, "position", businessid, subscriptionid, impressions) FROM stdin;
\.


--
-- Data for Name: bugs; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY bugs (description, url, userid) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY comments (user_id, comment, content_id, username, posttime, id, likes, dislikes, parent_id, reactionfile, filetype, replies, deleted) FROM stdin;
TT0glB7y	This is a test comment from a mobile device.	zeMWWB8T	astro	2022-09-16T23:04:17.459Z	6LPqWASK	0	0	\N	\N	\N	\N	\N
TT0glB7y	Whatsapp Car!!!	zeMWWB8T	astro	2022-09-24T19:08:30.291Z	81ZBNk79	0	0	\N	/users/comments/1664046510300-whatsapp_car.jpeg	img	\N	\N
TT0glB7y	Nyan Cat Video	zeMWWB8T	astro	2022-09-24T19:09:28.876Z	sNlVr7x8	0	0	\N	/users/comments/1664046568877-nyan.mp4	video	\N	\N
TT0glB7y	DINO COMMENT	NvlFg8o8	astro-official	2022-10-23T17:51:50.329Z	V4kG3vev	0	0	\N	\N	\N	\N	\N
\.


--
-- Data for Name: dislikedcomments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY dislikedcomments (user_id, comment_id) FROM stdin;
\.


--
-- Data for Name: dislikedvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY dislikedvideos (user_id, video_id) FROM stdin;
\.


--
-- Data for Name: images; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY images (id, title, image, topics, posttime, user_id, username, channelicon, private, deleted, type) FROM stdin;
bWwwy4Px	[DELETED BY USER]	/server/deleteicon.png	  goofy ahh crablet  	2022-10-21T03:24:47.846Z	TT0glB7y		/server/deletechannelicon.png	f	t	image
NvlFg8o8	SIGMAcephalosaurus	/images/1666452194893-dino_sigma.gif	 dino dinosaur sigma male 	2022-10-22T15:23:14.901Z	TT0glB7y	astro-official	/users/icons/1659796544555-astro_logo.png	f	f	image
YVrbrqGA	Goofy Ahh Crab	/images/1666548338738-amelia_crab.jpeg	 goofy ahh crablet 	2022-10-23T18:05:38.744Z	TT0glB7y	astro-official	/users/icons/1659796544555-astro_logo.png	f	f	image
WRipeNPF	Cat Prank	/images/1666562456586-cat_bottle.gif	 goofy ahh cat prank bottle 	2022-10-23T22:00:56.590Z	TT0glB7y	astro-official	/users/icons/1659796544555-astro_logo.png	f	f	image
viZySWmn	SPIDER BALL	/images/1666562526399-spider_ball.jpg	 spider ball goofy ahh quandale 	2022-10-23T22:02:06.402Z	TT0glB7y	astro-official	/users/icons/1659796544555-astro_logo.png	f	f	image
B2xNYP7y	SIGMA STARK	/images/1666563103507-sigma_tony.jpeg	 tony stark iron man sigma male 	2022-10-23T22:11:43.512Z	TT0glB7y	astro-official	/users/icons/1659796544555-astro_logo.png	f	f	image
\.


--
-- Data for Name: likedcomments; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY likedcomments (user_id, comment_id) FROM stdin;
\.


--
-- Data for Name: likedvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY likedvideos (user_id, video_id) FROM stdin;
z5MgiIls	oWBj9Ijt
\.


--
-- Data for Name: livechat; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY livechat (message, stream_id, user_id, "time") FROM stdin;
this is a live chat message	5DdR5QcN	ve9BNlwW	18
this is another live chat message	5DdR5QcN	ve9BNlwW	24
this is another live chat message	5DdR5QcN	ve9BNlwW	25
this is another live chat message	5DdR5QcN	ve9BNlwW	25
this is another live chat message	5DdR5QcN	ve9BNlwW	25
this is a chat test	EeORxOZi	TT0glB7y	14
another one	EeORxOZi	TT0glB7y	19
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY playlists (user_id, name, id, videocount, candelete, private) FROM stdin;
TT0glB7y	Projects	Q6t8DwNU	2	t	f
exTi1ego	test	6lt9GMqj	1	t	f
\.


--
-- Data for Name: playlistvideos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY playlistvideos (playlist_id, video_id, videoorder) FROM stdin;
edca22d2-1d51-4d99-aa5d-f99f28bd8b6b	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	1
Q6t8DwNU	y22a0bVA	1
Q6t8DwNU	zeMWWB8T	2
6lt9GMqj	oWBj9Ijt	1
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY reports (content_id, content_type, reason, reporter_id, "timestamp") FROM stdin;
\.


--
-- Data for Name: shoutouts; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY shoutouts (user_id, shoutout_id) FROM stdin;
60235bb8-41f0-42c9-8bd7-f12f645f10a3	319d6fad-2946-405b-be30-1c1be4055e0b
\.


--
-- Data for Name: subscribed; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY subscribed (channel_id, user_id) FROM stdin;
06cb58d8a56e84c3ea970a	6f1496fb4b3b289b333f0f
exTi1ego	z5MgiIls
\.


--
-- Data for Name: subscribedtopics; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY subscribedtopics (topicname, user_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY users (password, username, id, channelicon, channelbanner, subscribers, description, topics, streamkey, videocount, customerid, accountid, email) FROM stdin;
$2b$10$XbDReKfNEJJmd7kk3gMCxOy2QbBYLjS/I8vXpgxYCDGqe9ocVxx2q	EliszabethVan	z5MgiIls	/content/icons/astro_logo.png	/content/icons/astro_flat.png	0	Test	  	qopdS0Dt7iW2lNvUTHRmD5x8ZGIcBJMRAebT+Pvl1TE=	0	\N	\N	\N
$2b$10$035ZM4ID7l1CtI9DPaGH/.Ck9KbYl8.AAkFB4zZLfewMN0AVDpx5W	kathellmann	exTi1ego	/content/icons/astro_logo.png	/content/icons/astro_flat.png	1	Test	 test 	EeP4l8RA6yIl7+H7qdIrYxQWwz7PQcTBevMYp3WmXe4=	1	\N	\N	\N
$2b$10$6ZD7gOSIZMetl5wHKLYYmu55Pe8H60s2FTQt7PuDKSBX0kl7kBgUe	hacker	KmavL8wA	/content/icons/astro_logo.png	/content/icons/astro_flat.png	0	I am a nerd	 nerd shit 	eDlk+QxiW3l39k3NdPCu54cofbHB371u2gkfEZzLybQ=	0	\N	\N	hm1234g77@gmail.com
$2b$10$f6ulSA3ln1HRZXT4Xxv35eMTzxG2RTWBtCr32UrOYya1I9T6fuKX2	 astro	i197Gc7N	/content/icons/astro_logo.png	/content/icons/astro_flat.png	0		  	1FSTelIDNjkW3+TdAu1i+5cU96xcFjvDTdQ3bSbTgt4=	0	\N	\N	hm1234g77@gmail.com
$2b$10$UsD.OLVBO9uqyeSj6EIrFOmGuWCqhXwza0rs7QBDtSrwxKEqf4icS	hi	YVay4PfC	/content/icons/astro_logo.png	/content/icons/astro_flat.png	0	a	 a 	DL90BZE5W6xbrncYS6jtxrXE3BzohkMTz9Nt50Lhks=	0	\N	\N	thisjoke77@gmail.com
$2b$10$3TbJIHIdcriFcDLu9AvP6eOj3PKSQX7idMEWM20UclO7Q0Jt0IheG	astro-official	TT0glB7y	/users/icons/1659796544555-astro_logo.png	/users/banners/1659796544555-astro_flat.png	0	This is the official account/channel for Astro.	 astro tv official 	bgf33kHZDluQPkyky4fACBrpqC8YiHiSZKCjqIab8=	4	\N	\N	samugrah@ttu.edu
$2b$10$Rv/1MwLgKu0mXXg3YwqlpegwFC7yxJsbZkQ65hlT6lX1Vrbv/.Cmi	Затруднительно знакомиться с девушками? Забудь об этом! Подберем тебе подходящую https://apple.com	yQqvGtef	/content/icons/astro_logo.png	/content/icons/astro_flat.png	0		  	T5aMdtrUToc1goZR6e9FRcAV7LTuXY93bLt0Thywc=	0	\N	\N	\N
\.


--
-- Data for Name: videofiles; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY videofiles (id, thumbnail, video, parentid, resolution) FROM stdin;
ONVAsZQw	/videos/thumbnails/1638765250355-flying_blue.jpeg	/videos/files/1638765250355-nyan.mp4	\N	[144,240,360]
fNZIcr9g	\N	/users/comments/1638765290673-magic_library.jpeg	ONVAsZQw	\N
5DdR5QcN	/videos/thumbnails/1638765401579-floating_castle.jpeg	/videos/files/1638765401760-zach webcam stream.webm	\N	\N
061e8b98-c896-478f-8969-2d6bb69d61a5	/videos/thumbnails/1616467261063-antarctica.png	\N	\N	\N
kghCJjbf	/videos/thumbnails/1640497458971-castle_in_the_distance.jpeg	/videos/files/1640497458971-nyan.mp4	\N	[144,240,360]
rCh4I6JU	/videos/thumbnails/1632033327110-dune_worm.jpeg	/videos/files/1632033327358-asdf.webm	\N	\N
cw7FZvKb	\N	/users/comments/1640497514175-flying_blue.jpeg	kghCJjbf	\N
Rk7v36HK	/videos/thumbnails/1640497632050-electric_train_bright.jpeg	/videos/files/1640497632285-example webcam stream.webm	\N	\N
d6101b91-12f8-4c44-8595-1df400634b64	/videos/thumbnails/1616459815640-antarctica.png	\N	\N	\N
a54cf7b7-a643-4475-86fd-cf62e9858140	/videos/thumbnails/1616048609795-city5.jpg	/videos/files/1616048609795-nyan.mp4	\N	\N
d1b4c755-b587-4c13-b45e-b43e3ac2ccdc	/videos/thumbnails/1616048661535-city5.jpg	/videos/files/1616048661535-nyan.mp4	\N	\N
1c0e5fa1-9c1f-48ad-9519-939d627493a6	/videos/thumbnails/1616048730363-city5.jpg	/videos/files/1616048730363-nyan.mp4	\N	\N
T4Kmn4yy	/videos/thumbnails/1630038825773-electric_train_bright.jpeg	\N	\N	\N
A5WqEFt3	/videos/thumbnails/1630038976033-electric_train_bright.jpeg	\N	\N	\N
nDUVm2bu	/videos/thumbnails/1630039055353-electric_train_bright.jpeg	\N	\N	\N
4UA18p0C	/videos/thumbnails/1630039090387-electric_train_bright.jpeg	\N	\N	\N
oWBj9Ijt	/videos/thumbnails/1663299492130-RATS Logo With Words PNG.png	/videos/files/1663299492129-RATS Safety Training.mp4	\N	[]
81ZBNk79	\N	/users/comments/1664046510300-whatsapp_car.jpeg	zeMWWB8T	\N
sNlVr7x8	\N	/users/comments/1664046568877-nyan.mp4	zeMWWB8T	\N
zeMWWB8T	/videos/thumbnails/1659796767911-turbojet_image.png	/videos/files/1659796767910-jet_startup_thrust.mp4	\N	[144,240,360,480,720,1080]
y22a0bVA	/videos/thumbnails/1659985611806-taser_picture.png	/videos/files/1659985611805-taser.mp4	\N	[]
EeORxOZi	/videos/thumbnails/1664047531311-astro_ad.png	/videos/files/1664047532211-Test Stream.webm	\N	\N
F6XlMDqm	/videos/thumbnails/1666562377736-egg.png	/videos/files/1666562377735-egg.mp4	\N	[144,240,360]
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: merlin
--

COPY videos (description, thumbnail, video, title, views, id, user_id, likes, dislikes, posttime, topics, username, channelicon, streaming, enablechat, streamtype, deleted, private, subtitles, type) FROM stdin;
This is jeffs first webcam stream	/server/deleteicon.png			0	XUq4QMsH	XVSfYy4m	0	0	2022-01-27T04:08:10.136Z			/server/deletechannelicon.png	f	t	browser	t	f	\N	video
I'm buying OBS next.	/server/deleteicon.png			0	29pTOsVG	XVSfYy4m	0	0	2022-01-27T04:09:34.207Z	obs		/server/deletechannelicon.png	f	t	obs	t	f	\N	video
this is jeffs first video	/server/deleteicon.png			0	ZlaRKZev	XVSfYy4m	0	0	2022-01-27T04:05:42.163Z	 parler aws 		/server/deletechannelicon.png	f	\N	\N	t	f		video
this is a test of webcam streams on the domain name	/server/deleteicon.png			0	qgBOIVwj	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-07-11T21:53:04.401Z	domain name test		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	/server/deleteicon.png			0	81ae5b9c-628c-48cf-a9f6-5aee7e7b64d0	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-25T05:10:16.950Z	test obs stream		/server/deletechannelicon.png	f	t	obs	t	f	\N	video
domain name test	/server/deleteicon.png			0	zjZLs5e9	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-07-11T22:57:12.771Z	domain name test		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
This is a youtube clone that I have been working on for the past two years. I am a freshman here at Tech trying to test the site and it's capabilities.	/server/deleteicon.png			0	xQD30W41	TT0glB7y	0	0	2022-09-14T21:35:42.103Z	 astro video site 		/server/deletechannelicon.png	f	\N	\N	t	f		video
asdf	/server/deleteicon.png			0	wymdU1et	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-01-27T04:17:50.008Z	nyan		/server/deletechannelicon.png	f	t	obs	t	f	\N	video
This is my video sharing website I have been developing since the summer of 2020 at 16 years old.	/server/deleteicon.png			0	H0AChj3c	TT0glB7y	0	0	2022-08-08T19:09:51.783Z	astro video site		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
this is a test stream on the domain name with https	/server/deleteicon.png			0	80pGPXmC	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-07-11T22:33:34.830Z	domain name test		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
This is a test video upload for the site.	/server/deleteicon.png			0	db5ee5c6-4dc5-4711-bd72-a166c5e47f25	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-24T07:32:21.102Z	nyan cat video example upload test		/server/deletechannelicon.png	f	\N	\N	t	f	\N	video
This is a test of my homemade jet engine built from a turbocharger and a fire extinguisher for the combustion chamber.	/server/deleteicon.png			0	NzB8zJDu	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2022-08-05T16:42:06.465Z	 jet engine astro 		/server/deletechannelicon.png	f	\N	\N	t	f		video
This is an example video that is set to private in order to keep it hidden from other users.	/server/deleteicon.png			0	73f606a5-69a4-4471-9d37-a4dc4eed488f	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-02-28T17:53:15.344Z	private video		/server/deletechannelicon.png	f	\N	\N	t	t	\N	video
This is a test video to show the functionality of subtitles.	/server/deleteicon.png			0	HmmwavpR	319d6fad-2946-405b-be30-1c1be4055e0b	0	0	2021-06-11T06:06:27.607Z	 subtitles 		/server/deletechannelicon.png	f	\N	\N	t	f	/videos/subtitles1623391587603-example.srt	video
This is a test of the websocket live streaming capabilities of the site.	/server/deleteicon.png			0	bcec57c8-2eab-4acd-9f2e-24343d88c6fa	60235bb8-41f0-42c9-8bd7-f12f645f10a3	0	0	2021-02-25T05:02:30.137Z	web socket websocket stream test		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
I made this website to combat the censorship of YouTube.	/server/deleteicon.png			0	tNtt1Rum	TT0glB7y	0	0	2022-09-02T13:34:31.886Z	youtube censorship		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
This is an explanation of why I am leaving the Astro project.	/server/deleteicon.png			0	UvbsIiuk	TT0glB7y	0	0	2022-09-09T00:23:01.885Z	astro horus data		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
this is a mic test	/server/deleteicon.png			0	9LficYMe	TT0glB7y	0	0	2022-09-14T01:14:25.009Z	astro microphone mic		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
usb mic	/server/deleteicon.png			0	D1dQrWbP	TT0glB7y	0	0	2022-09-14T01:22:27.195Z	usb mic		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
Just describing an idea I have for a specific kind of fund that lobbies for the future instead of for profit.	/server/deleteicon.png			0	spMpZBMa	TT0glB7y	0	0	2022-10-07T21:59:45.219Z	 futurist fund investing 		/server/deletechannelicon.png	f	\N	\N	t	f		video
This is a test webcam stream for demonstration purposes. This is an editing test!!!	/videos/thumbnails/1665620001993-astro_glow_text.png	/videos/files/1664047532211-Test Stream.webm	Test Stream	49	EeORxOZi	TT0glB7y	0	0	2022-09-24T19:25:31.311Z	  webcam stream  	astro-official	/users/icons/1659796544555-astro_logo.png	f	t	browser	f	f	\N	video
Just practicing with the camera and some thoughts on college.	/server/deleteicon.png			0	WkIokdd6	TT0glB7y	0	0	2022-10-07T00:44:18.944Z	 college system 		/server/deletechannelicon.png	f	\N	\N	t	f		video
RATS Safety Training!	/videos/thumbnails/1663299492130-RATS Logo With Words PNG.png	/videos/files/1663299492129-RATS Safety Training.mp4	RATS Safety Training	73	oWBj9Ijt	exTi1ego	1	0	2022-09-16T03:38:12.144Z	  	kathellmann	/content/icons/astro_logo.png	f	\N	\N	f	f		video
This is another test to make sure features didn't break randomly.	/server/deleteicon.png			0	MmMAqWpC	TT0glB7y	0	0	2022-10-04T02:28:50.107Z	astro webcam test		/server/deletechannelicon.png	f	t	browser	t	f	\N	video
I have an idea for an internet protocol called tsunami. This would allow for the decentralization of all data on the web using preexisting technologies.	/server/deleteicon.png			0	Bk4h9lb5	TT0glB7y	0	0	2022-10-10T23:18:56.838Z	 tsunami web3 protocol torrent 		/server/deletechannelicon.png	f	\N	\N	t	f		video
EGG	/videos/thumbnails/1666562377736-egg.png	/videos/files/1666562377735-egg.mp4	EGG	9	F6XlMDqm	TT0glB7y	0	0	2022-10-23T21:59:37.739Z	 egg fnaf jumpscare 	astro-official	/users/icons/1659796544555-astro_logo.png	f	\N	\N	f	f		video
I made a taser when I was 13 years old. I made it out of a high voltage transformer, 9 volt battery, and various wires. The casing is a hot-glued cardboard box with duck tape around it. There is a big red button in the center.	/videos/thumbnails/1659985611806-taser_picture.png	/videos/files/1659985611805-taser.mp4	Taser at 13 years old	106	y22a0bVA	TT0glB7y	0	0	2022-08-08T19:06:51.828Z	 taser project 	astro-official	/users/icons/1659796544555-astro_logo.png	f	\N	\N	f	f		video
This is a test of my homemade turbocharger jet engine. I made the combustion chamber out of a fire extinguisher with a 3 inch exhaust pipe (holes drilled) inside the chamber to disperse the air when mixing with the propane fuel. The scraping noise at the end is the turbine expanding due to heat into it's own housing. I taught myself how to stick weld and use various tools such as an angle grinder to make this final semi-working product.	/videos/thumbnails/1659796767911-turbojet_image.png	/videos/files/1659796767910-jet_startup_thrust.mp4	Jet Engine Test	224	zeMWWB8T	TT0glB7y	0	0	2022-08-06T14:39:27.937Z	 jet engine 	astro-official	/users/icons/1659796544555-astro_logo.png	f	\N	\N	f	f		video
\.


--
-- Name: users_username_key; Type: CONSTRAINT; Schema: public; Owner: merlin; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

