--
-- PostgreSQL database dump
--

\restrict YAVYVoUBXqkKGQ3x0lh0IaDYVSZMM1qfNvgl2LekbK2tzKg1Abg6BzIIGOK4ewV

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_row_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_row_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_row_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_idempotency_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_key text NOT NULL,
    idempotency_key_hash text NOT NULL,
    webinar_id uuid NOT NULL,
    email public.citext NOT NULL,
    response_status integer NOT NULL,
    response_body_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.api_idempotency_keys OWNER TO postgres;

--
-- Name: book_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.book_categories (
    book_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.book_categories OWNER TO postgres;

--
-- Name: book_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.book_images (
    id integer NOT NULL,
    book_id integer NOT NULL,
    image_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.book_images OWNER TO postgres;

--
-- Name: book_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.book_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.book_images_id_seq OWNER TO postgres;

--
-- Name: book_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.book_images_id_seq OWNED BY public.book_images.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.books (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    price_cents integer NOT NULL,
    currency character(3) DEFAULT 'PHP'::bpchar NOT NULL,
    cover_image_url text NOT NULL,
    short_description text,
    details text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    in_stock boolean DEFAULT true NOT NULL
);


ALTER TABLE public.books OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.books_id_seq OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id uuid NOT NULL,
    book_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price_cents integer NOT NULL,
    currency character(3) DEFAULT 'PHP'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cart_items_id_seq OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    expires_at timestamp with time zone
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: email_outbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_email public.citext NOT NULL,
    template_key text NOT NULL,
    payload_json jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_outbox_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])))
);


ALTER TABLE public.email_outbox OWNER TO postgres;

--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_registrations (
    id bigint NOT NULL,
    event_id integer NOT NULL,
    user_id integer,
    order_id uuid,
    attendee_email text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_registrations OWNER TO postgres;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_registrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.event_registrations_id_seq OWNER TO postgres;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_registrations_id_seq OWNED BY public.event_registrations.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    banner_image_url text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    event_date date,
    start_time time without time zone,
    end_time time without time zone,
    cta_label text,
    cta_url text,
    duration_hours numeric(4,1),
    timezone text DEFAULT 'Asia/Manila'::text,
    capacity integer,
    status text DEFAULT 'scheduled'::text,
    join_url text
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id uuid NOT NULL,
    book_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price_cents integer NOT NULL,
    currency character(3) DEFAULT 'PHP'::bpchar NOT NULL,
    item_type text DEFAULT 'book'::text,
    item_title text,
    snapshot jsonb,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal_cents integer NOT NULL,
    currency character(3) DEFAULT 'PHP'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    total_cents integer,
    tax_cents integer DEFAULT 0,
    discount_cents integer DEFAULT 0,
    payment_status text DEFAULT 'unpaid'::text,
    provider text,
    provider_checkout_id text,
    paid_at timestamp with time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_events (
    id bigint NOT NULL,
    provider_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_events OWNER TO postgres;

--
-- Name: payment_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payment_events_id_seq OWNER TO postgres;

--
-- Name: payment_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_events_id_seq OWNED BY public.payment_events.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text NOT NULL,
    provider_payment_id text,
    amount_cents integer NOT NULL,
    currency character(3) DEFAULT 'PHP'::bpchar NOT NULL,
    status text NOT NULL,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: related_books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.related_books (
    book_id integer NOT NULL,
    related_book_id integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.related_books OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    password_hash text,
    role text DEFAULT 'customer'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: webinar_rate_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webinar_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_key text NOT NULL,
    webinar_id uuid NOT NULL,
    email public.citext NOT NULL,
    window_start timestamp with time zone NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webinar_rate_limits OWNER TO postgres;

--
-- Name: webinar_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webinar_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webinar_id uuid NOT NULL,
    email public.citext NOT NULL,
    full_name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    verify_token_hash text,
    verify_token_expires_at timestamp with time zone,
    verified_at timestamp with time zone,
    zoom_registrant_join_url text,
    optional_fields_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_verification_email_sent_at timestamp with time zone,
    last_confirmation_email_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webinar_registrations_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'cancelled'::text])))
);


ALTER TABLE public.webinar_registrations OWNER TO postgres;

--
-- Name: webinars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webinars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    topic text DEFAULT 'General'::text NOT NULL,
    description text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    timezone text DEFAULT 'Asia/Manila'::text NOT NULL,
    capacity integer,
    is_published boolean DEFAULT false NOT NULL,
    registration_open boolean DEFAULT true NOT NULL,
    zoom_join_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webinars_capacity_non_negative CHECK (((capacity IS NULL) OR (capacity >= 0))),
    CONSTRAINT webinars_end_after_start CHECK ((end_at > start_at))
);


ALTER TABLE public.webinars OWNER TO postgres;

--
-- Name: book_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_images ALTER COLUMN id SET DEFAULT nextval('public.book_images_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: event_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations ALTER COLUMN id SET DEFAULT nextval('public.event_registrations_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: payment_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_events ALTER COLUMN id SET DEFAULT nextval('public.payment_events_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: api_idempotency_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_idempotency_keys (id, endpoint_key, idempotency_key_hash, webinar_id, email, response_status, response_body_json, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: book_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.book_categories (book_id, category_id) FROM stdin;
1	1
2	1
3	1
5	1
2	2
1	3
3	3
4	4
5	5
6	6
7	6
\.


--
-- Data for Name: book_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.book_images (id, book_id, image_url, sort_order) FROM stdin;
1	1	/images/bb_pathwaytoproficientreader.png	0
3	3	/images/bb_metacognitiv.png	0
4	4	/images/bb_beyondordea.png	0
5	5	/images/bb_thereflectiveteacherinclassroo.png	0
6	6	/images/book_red.png	0
7	7	/images/book_purple.png	0
2	2	/images/Kaleidoscope_2.png	0
\.


--
-- Data for Name: books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.books (id, slug, title, price_cents, currency, cover_image_url, short_description, details, is_active, created_at, in_stock) FROM stdin;
3	metacognitive-strategy-use-and-curriculum-design	Metacognitive Strategy Use and Curriculum Design	240000	PHP	/images/bb_metacognitiv.png	Curriculum design focused on metacognition and self-regulated learning.	Learn how to embed thinking routines, reflection cycles, and goal-setting to improve student performance across subjects.	t	2025-12-31 06:42:57.679358+08	t
2	facets-of-life-kaleidoscope	Facets of Life: Kaleidoscope	40000	PHP	/images/Kaleidoscope_1.png	An anthology of poems written largely during the pandemic, capturing resilience and reflection.	A lyrical collection shaped in the pandemic era, tracing grief, hope, and everyday survival through vivid, contemplative verse.	t	2025-12-31 06:42:57.679358+08	t
4	beyond-the-ordeal-book-of-poems	Beyond the Ordeal: Book of Poems	22500	PHP	/images/bb_beyondordea.png	A poetic collection exploring resilience, memory, and quiet triumphs.	An accessible set of poems for readers and classrooms, with themes suited for reflection and discussion.	t	2025-12-31 06:42:57.679358+08	t
1	pathways-to-proficient-readers	Pathways to Proficient Readers	20000	PHP	/images/bb_pathwaytoproficientreader.png	Strategies for building confident, independent readers in the classroom.	A practical guide for literacy instruction with classroom-ready routines, assessment tips, and reading interventions for diverse learners.	t	2025-12-31 06:42:57.679358+08	f
5	the-reflective-teacher-in-the-classroom	The Reflective Teacher in the Classroom	49900	PHP	/images/bb_thereflectiveteacherinclassroo.png	A guide to reflective practice for continual improvement in teaching.	Build habits of inquiry, feedback, and lesson analysis to refine instruction and support student growth.	t	2025-12-31 06:42:57.679358+08	f
7	tome-of-wisdom	Tome of Wisdom	49900	PHP	/images/book_purple.png	A companion volume focused on leadership, reflection, and practice.	A curated collection of insights for educators seeking to deepen their craft and professional growth.	t	2025-12-31 06:42:57.679358+08	f
6	tome-of-knowledge	Tome of Knowledge	100	PHP	/images/book_red.png	Reference material designed for professional learning and quick lookup.	A concise reference for educators covering classroom planning, assessment, and research-based best practices.	t	2025-12-31 06:42:57.679358+08	f
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, book_id, quantity, unit_price_cents, currency, created_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, status, created_at, updated_at, user_id, expires_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug) FROM stdin;
1	Teaching	teaching
2	ESL	esl
3	Curriculum	curriculum
4	Poetry	poetry
5	Professional Development	professional-development
6	Reference	reference
\.


--
-- Data for Name: email_outbox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_outbox (id, to_email, template_key, payload_json, status, attempts, last_error, created_at, sent_at, updated_at) FROM stdin;
2befd9a1-e445-4586-9daa-69aa9a2cc9de	efraim.gondraneos@gmail.com	webinar.verify	{"full_name": "Efraim Gondraneos", "queued_at": "2026-02-04T00:04:43.236Z", "verify_url": "http://localhost:5173/verify?token=7VsykqU64glmfWLShgSzLL1p019cHqV0qhA_x96NY_I", "webinar_slug": "flipped-model-in-an-online-platform", "webinar_title": "Flipped Model in an Online Platform", "token_expires_at": "2026-02-05T00:04:43.261Z", "webinar_start_at": "2026-03-22T00:00:00.000Z", "webinar_timezone": "Asia/Manila"}	sent	1	\N	2026-02-04 08:04:43.236177+08	2026-02-04 08:04:50.326355+08	2026-02-04 08:04:50.326355+08
fa33dd97-079c-4af6-8835-3fc2cd172402	efraim.gondraneos@gmail.com	webinar.confirmed	{"join_url": "https://zoom.us/j/9100100200?pwd=flipped", "full_name": "Efraim Gondraneos", "webinar_slug": "flipped-model-in-an-online-platform", "webinar_title": "Flipped Model in an Online Platform", "webinar_start_at": "2026-03-22T00:00:00.000Z", "webinar_timezone": "Asia/Manila"}	sent	1	\N	2026-02-04 08:05:31.410645+08	2026-02-04 08:05:35.2917+08	2026-02-04 08:05:35.2917+08
f5d1d0c8-4914-44e1-9772-363cce15a408	goliathdavid024@gmail.com	webinar.verify	{"full_name": "Efraim Gondraneos", "queued_at": "2026-02-04T03:07:55.393Z", "verify_url": "http://localhost:5173/verify?token=BwftjD2kFNDZW_8UZOO4z5dkU8jiTRwycSsbL0tf24M", "webinar_slug": "flipped-model-in-an-online-platform", "webinar_title": "Flipped Model in an Online Platform", "token_expires_at": "2026-02-05T03:07:55.510Z", "webinar_start_at": "2026-03-22T00:00:00.000Z", "webinar_timezone": "Asia/Manila"}	sent	1	\N	2026-02-04 11:07:55.367082+08	2026-02-04 11:08:03.525381+08	2026-02-04 11:08:03.525381+08
\.


--
-- Data for Name: event_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_registrations (id, event_id, user_id, order_id, attendee_email, status, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, banner_image_url, title, description, event_date, start_time, end_time, cta_label, cta_url, duration_hours, timezone, capacity, status, join_url) FROM stdin;
1	/images/research.png	Research Writing for Publication	Join our webinar on effective research writing for publication, where we cover strategies for crafting impactful manuscripts and navigating submission processes	2023-12-02	08:00:00	11:00:00	Read more	https://cequenatraining.com/	2.0	Asia/Manila	\N	scheduled	\N
2	/images/flipped.png	Flipped Model in an Online Platform	Explore how the Flipped Model revolutionizes learning through innovative approaches on an online platform, fostering enriched educational experiences.	2023-12-02	13:00:00	15:00:00	Read more	https://cequenatraining.com/	3.0	Asia/Manila	\N	scheduled	\N
3	/images/integrating-21.png	Integrating 21st Century Skills in a Digital Classroom	Learn how to integrate essential 21st-century skills into your digital classroom for enhanced student engagement and learning outcomes.	2023-12-02	09:00:00	12:00:00	Read more	https://example.com/events/metacognitive-strategy	2.0	Asia/Manila	\N	scheduled	\N
4	/images/tips-and-tricks.png	Tips and Tricks for Writing High-quiality Research Worthy of Publication	Discover invaluable tips and tricks for crafting high-quality research worthy of publication, ensuring academic success and recognition.	2023-12-02	09:00:00	12:00:00	Read more	https://example.com/events/metacognitive-strategy	2.0	Asia/Manila	\N	scheduled	\N
5	/images/integrating-social.png	Integrating Social Emotional Learning into the Classroom	Incorporate social-emotional learning seamlessly into your classroom environment, fostering holistic student development and creating a supportive educational community.	2023-12-02	09:00:00	12:00:00	Read more	https://example.com/events/metacognitive-strategy	2.0	Asia/Manila	\N	scheduled	\N
6	/images/metacognitive.png	Metacognitive Strategy Use and Curiculum Desgin	Explore the intersection of metacognitive strategy use and curriculum design, optimizing learning experiences for enhanced student comprehension and academic success.	2023-12-02	09:00:00	12:00:00	Read more	https://example.com/events/metacognitive-strategy	3.0	Asia/Manila	\N	scheduled	\N
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, book_id, quantity, unit_price_cents, currency, item_type, item_title, snapshot) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, cart_id, status, subtotal_cents, currency, created_at, updated_at, user_id, total_cents, tax_cents, discount_cents, payment_status, provider, provider_checkout_id, paid_at) FROM stdin;
\.


--
-- Data for Name: payment_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_events (id, provider_event_id, event_type, payload, received_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, provider, provider_payment_id, amount_cents, currency, status, raw_payload, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: related_books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.related_books (book_id, related_book_id, sort_order) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, created_at) FROM stdin;
1	Ada Lovelace	\N	\N	customer	2026-01-20 15:21:03.335223+08
2	Alan Turing	\N	\N	customer	2026-01-20 15:21:03.335223+08
3	Grace Hopper	\N	\N	customer	2026-01-20 15:21:03.335223+08
\.


--
-- Data for Name: webinar_rate_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webinar_rate_limits (id, action_key, webinar_id, email, window_start, request_count, created_at, updated_at) FROM stdin;
3d8d3322-6ece-4379-8f9a-97d3a360c3ba	register	934406b0-fee8-4112-8b95-b282d09cea48	efraim.gondraneos@gmail.com	2026-02-04 08:00:00+08	1	2026-02-04 08:04:43.236177+08	2026-02-04 08:04:43.236177+08
1f83e49f-8787-4eae-b07f-17390b08d6ce	register	934406b0-fee8-4112-8b95-b282d09cea48	goliathdavid024@gmail.com	2026-02-04 11:00:00+08	1	2026-02-04 11:07:55.367082+08	2026-02-04 11:07:55.367082+08
\.


--
-- Data for Name: webinar_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webinar_registrations (id, webinar_id, email, full_name, status, verify_token_hash, verify_token_expires_at, verified_at, zoom_registrant_join_url, optional_fields_json, last_verification_email_sent_at, last_confirmation_email_sent_at, created_at, updated_at) FROM stdin;
47729e03-bd49-4021-a9b7-a8602bc07195	934406b0-fee8-4112-8b95-b282d09cea48	efraim.gondraneos@gmail.com	Efraim Gondraneos	verified	d251093ce070c3034a7e35f8062ad1a4afa37d2685f6322841d485934bc94c33	2026-02-05 08:04:43.261+08	2026-02-04 08:05:31.410645+08	\N	{"role": "", "organization": ""}	2026-02-04 08:04:43.236177+08	2026-02-04 08:05:31.410645+08	2026-02-04 08:04:43.236177+08	2026-02-04 08:05:31.410645+08
857bf13a-a599-45a2-8a31-d07d6ec84891	934406b0-fee8-4112-8b95-b282d09cea48	goliathdavid024@gmail.com	Efraim Gondraneos	pending	ab31a0df61ed448dfd71f2ba7a5a2b5c384faee949ab8d70d98c3c57b31ef5d3	2026-02-05 11:07:55.51+08	\N	\N	{"role": "", "organization": ""}	2026-02-04 11:07:55.367082+08	\N	2026-02-04 11:07:55.367082+08	2026-02-04 11:07:55.367082+08
\.


--
-- Data for Name: webinars; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webinars (id, slug, title, topic, description, start_at, end_at, timezone, capacity, is_published, registration_open, zoom_join_url, created_at, updated_at) FROM stdin;
d3af1fea-a43f-42b5-b9ff-14d36623439d	research-writing-for-publication	Research Writing for Publication	Research & Publication	Learn practical strategies for developing publication-ready manuscripts and navigating peer review.	2026-03-15 08:30:00+08	2026-03-15 10:30:00+08	Asia/Manila	300	t	t	https://zoom.us/j/9100100100?pwd=research	2026-02-04 07:36:37.329097+08	2026-02-04 07:36:37.329097+08
934406b0-fee8-4112-8b95-b282d09cea48	flipped-model-in-an-online-platform	Flipped Model in an Online Platform	Digital Learning	Explore flipped learning frameworks that improve engagement in synchronous and asynchronous classes.	2026-03-22 08:00:00+08	2026-03-22 11:00:00+08	Asia/Manila	250	t	t	https://zoom.us/j/9100100200?pwd=flipped	2026-02-04 07:36:37.329097+08	2026-02-04 07:36:37.329097+08
63a7437d-6761-4768-9860-de449f6790bf	integrating-21st-century-skills-in-a-digital-classroom	Integrating 21st Century Skills in a Digital Classroom	Classroom Strategies	A practical workshop on embedding communication, collaboration, and critical thinking in digital instruction.	2026-03-29 08:00:00+08	2026-03-29 10:00:00+08	Asia/Manila	200	t	t	https://zoom.us/j/9100100300?pwd=skills	2026-02-04 07:36:37.329097+08	2026-02-04 07:36:37.329097+08
\.


--
-- Name: book_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.book_images_id_seq', 7, true);


--
-- Name: books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.books_id_seq', 7, true);


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 6, true);


--
-- Name: event_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_registrations_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 6, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: payment_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_events_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: api_idempotency_keys api_idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_idempotency_keys
    ADD CONSTRAINT api_idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: api_idempotency_keys api_idempotency_unique_endpoint_hash; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_idempotency_keys
    ADD CONSTRAINT api_idempotency_unique_endpoint_hash UNIQUE (endpoint_key, idempotency_key_hash);


--
-- Name: book_categories book_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_categories
    ADD CONSTRAINT book_categories_pkey PRIMARY KEY (book_id, category_id);


--
-- Name: book_images book_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_images
    ADD CONSTRAINT book_images_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: books books_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_slug_key UNIQUE (slug);


--
-- Name: cart_items cart_items_cart_id_book_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_book_id_key UNIQUE (cart_id, book_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: related_books related_books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.related_books
    ADD CONSTRAINT related_books_pkey PRIMARY KEY (book_id, related_book_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webinar_rate_limits webinar_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_rate_limits
    ADD CONSTRAINT webinar_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: webinar_rate_limits webinar_rate_limits_unique_window; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_rate_limits
    ADD CONSTRAINT webinar_rate_limits_unique_window UNIQUE (action_key, webinar_id, email, window_start);


--
-- Name: webinar_registrations webinar_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_registrations
    ADD CONSTRAINT webinar_registrations_pkey PRIMARY KEY (id);


--
-- Name: webinar_registrations webinar_registrations_unique_email_per_webinar; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_registrations
    ADD CONSTRAINT webinar_registrations_unique_email_per_webinar UNIQUE (webinar_id, email);


--
-- Name: webinars webinars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinars
    ADD CONSTRAINT webinars_pkey PRIMARY KEY (id);


--
-- Name: webinars webinars_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinars
    ADD CONSTRAINT webinars_slug_key UNIQUE (slug);


--
-- Name: api_idempotency_keys_expiry_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_idempotency_keys_expiry_idx ON public.api_idempotency_keys USING btree (expires_at);


--
-- Name: cart_items_cart_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cart_items_cart_id_idx ON public.cart_items USING btree (cart_id);


--
-- Name: carts_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carts_user_id_idx ON public.carts USING btree (user_id);


--
-- Name: email_outbox_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_outbox_status_created_at_idx ON public.email_outbox USING btree (status, created_at);


--
-- Name: event_registrations_event_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX event_registrations_event_id_idx ON public.event_registrations USING btree (event_id);


--
-- Name: event_registrations_event_user_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX event_registrations_event_user_unique ON public.event_registrations USING btree (event_id, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: event_registrations_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX event_registrations_user_id_idx ON public.event_registrations USING btree (user_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: orders_provider_checkout_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_provider_checkout_id_unique ON public.orders USING btree (provider_checkout_id) WHERE (provider_checkout_id IS NOT NULL);


--
-- Name: orders_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_user_id_idx ON public.orders USING btree (user_id);


--
-- Name: payment_events_provider_event_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payment_events_provider_event_id_unique ON public.payment_events USING btree (provider_event_id);


--
-- Name: payments_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);


--
-- Name: payments_provider_payment_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payments_provider_payment_id_unique ON public.payments USING btree (provider, provider_payment_id) WHERE (provider_payment_id IS NOT NULL);


--
-- Name: users_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: webinar_rate_limits_lookup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinar_rate_limits_lookup_idx ON public.webinar_rate_limits USING btree (action_key, webinar_id, email, window_start DESC);


--
-- Name: webinar_registrations_verify_token_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinar_registrations_verify_token_hash_idx ON public.webinar_registrations USING btree (verify_token_hash) WHERE (verify_token_hash IS NOT NULL);


--
-- Name: webinar_registrations_webinar_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinar_registrations_webinar_status_idx ON public.webinar_registrations USING btree (webinar_id, status);


--
-- Name: webinars_public_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinars_public_idx ON public.webinars USING btree (is_published, registration_open, start_at);


--
-- Name: webinars_start_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinars_start_at_idx ON public.webinars USING btree (start_at);


--
-- Name: webinars_topic_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webinars_topic_idx ON public.webinars USING btree (topic);


--
-- Name: email_outbox email_outbox_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER email_outbox_set_updated_at BEFORE UPDATE ON public.email_outbox FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();


--
-- Name: webinar_rate_limits webinar_rate_limits_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER webinar_rate_limits_set_updated_at BEFORE UPDATE ON public.webinar_rate_limits FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();


--
-- Name: webinar_registrations webinar_registrations_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER webinar_registrations_set_updated_at BEFORE UPDATE ON public.webinar_registrations FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();


--
-- Name: webinars webinars_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER webinars_set_updated_at BEFORE UPDATE ON public.webinars FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();


--
-- Name: api_idempotency_keys api_idempotency_keys_webinar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_idempotency_keys
    ADD CONSTRAINT api_idempotency_keys_webinar_id_fkey FOREIGN KEY (webinar_id) REFERENCES public.webinars(id) ON DELETE CASCADE;


--
-- Name: book_categories book_categories_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_categories
    ADD CONSTRAINT book_categories_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: book_categories book_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_categories
    ADD CONSTRAINT book_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: book_images book_images_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_images
    ADD CONSTRAINT book_images_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: related_books related_books_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.related_books
    ADD CONSTRAINT related_books_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: related_books related_books_related_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.related_books
    ADD CONSTRAINT related_books_related_book_id_fkey FOREIGN KEY (related_book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: webinar_rate_limits webinar_rate_limits_webinar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_rate_limits
    ADD CONSTRAINT webinar_rate_limits_webinar_id_fkey FOREIGN KEY (webinar_id) REFERENCES public.webinars(id) ON DELETE CASCADE;


--
-- Name: webinar_registrations webinar_registrations_webinar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webinar_registrations
    ADD CONSTRAINT webinar_registrations_webinar_id_fkey FOREIGN KEY (webinar_id) REFERENCES public.webinars(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict YAVYVoUBXqkKGQ3x0lh0IaDYVSZMM1qfNvgl2LekbK2tzKg1Abg6BzIIGOK4ewV

