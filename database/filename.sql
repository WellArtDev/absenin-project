--
-- PostgreSQL database dump
--

\restrict aeHdIdYSI94FIWJUGGiQKCZbTNbhSEi9aU5MxRAcQZVENOtS66nWm7YFgopT7kG

-- Dumped from database version 15.17 (Ubuntu 15.17-1.pgdg24.04+1)
-- Dumped by pg_dump version 15.17 (Ubuntu 15.17-1.pgdg24.04+1)

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    employee_id integer,
    company_id integer,
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    date date DEFAULT CURRENT_DATE,
    status character varying(50) DEFAULT 'HADIR'::character varying,
    latitude numeric(10,8),
    longitude numeric(11,8),
    location_name character varying(500),
    location_detail jsonb,
    checkout_latitude numeric(10,8),
    checkout_longitude numeric(11,8),
    checkout_location_name character varying(500),
    selfie_checkin_url text,
    selfie_checkout_url text,
    selfie_verified boolean DEFAULT false,
    overtime_minutes integer DEFAULT 0,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    distance_meters integer,
    is_within_radius boolean,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['HADIR'::character varying, 'TERLAMBAT'::character varying, 'LEMBUR'::character varying, 'IZIN'::character varying, 'SAKIT'::character varying, 'ALPHA'::character varying])::text[])))
);


ALTER TABLE public.attendance OWNER TO absenin_user;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO absenin_user;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    bank_name character varying(100) NOT NULL,
    account_number character varying(50) NOT NULL,
    account_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bank_accounts_id_seq OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255),
    plan character varying(50) DEFAULT 'free'::character varying,
    max_employees integer DEFAULT 10,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logo_url text,
    address text,
    phone character varying(50),
    email character varying(255),
    plan_expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    trial_ends_at timestamp without time zone
);


ALTER TABLE public.companies OWNER TO absenin_user;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO absenin_user;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.company_settings (
    id integer NOT NULL,
    company_id integer,
    work_start time without time zone DEFAULT '08:00:00'::time without time zone,
    work_end time without time zone DEFAULT '17:00:00'::time without time zone,
    late_tolerance_minutes integer DEFAULT 15,
    allowed_latitude numeric(10,8),
    allowed_longitude numeric(11,8),
    allowed_radius_meters integer DEFAULT 500,
    require_location boolean DEFAULT false,
    require_selfie boolean DEFAULT true,
    overtime_enabled boolean DEFAULT true,
    overtime_min_minutes integer DEFAULT 30,
    overtime_rate_multiplier numeric(3,1) DEFAULT 1.5,
    overtime_max_hours integer DEFAULT 4,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    office_latitude numeric(10,8),
    office_longitude numeric(11,8),
    office_address text,
    radius_lock_enabled boolean DEFAULT false,
    wa_api_url character varying(500),
    wa_api_token character varying(500),
    wa_device_number character varying(20),
    timezone character varying(50) DEFAULT 'Asia/Jakarta'::character varying
);


ALTER TABLE public.company_settings OWNER TO absenin_user;

--
-- Name: company_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.company_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_settings_id_seq OWNER TO absenin_user;

--
-- Name: company_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.company_settings_id_seq OWNED BY public.company_settings.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.divisions (
    id integer NOT NULL,
    company_id integer,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.divisions OWNER TO postgres;

--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.divisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.divisions_id_seq OWNER TO postgres;

--
-- Name: divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.divisions_id_seq OWNED BY public.divisions.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone_number character varying(20) NOT NULL,
    "position" character varying(255),
    department character varying(255),
    company_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    employee_code character varying(50),
    email character varying(255),
    division_id integer,
    position_id integer,
    employment_status character varying(50) DEFAULT 'tetap'::character varying,
    start_date date,
    end_date date,
    base_salary numeric(15,2) DEFAULT 0,
    ktp_number character varying(20),
    npwp_number character varying(25),
    birth_date date,
    birth_place character varying(255),
    gender character varying(10),
    address text,
    emergency_contact character varying(255),
    emergency_phone character varying(20),
    photo_url text,
    leave_balance integer DEFAULT 12,
    radius_lock_enabled boolean DEFAULT true,
    phone character varying(20)
);


ALTER TABLE public.employees OWNER TO absenin_user;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employees_id_seq OWNER TO absenin_user;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: leaves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaves (
    id integer NOT NULL,
    employee_id integer,
    company_id integer,
    type character varying(50) DEFAULT 'cuti'::character varying,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer DEFAULT 1,
    reason text,
    status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leaves_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT leaves_type_check CHECK (((type)::text = ANY ((ARRAY['cuti'::character varying, 'sakit'::character varying, 'izin'::character varying, 'dinas'::character varying])::text[])))
);


ALTER TABLE public.leaves OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leaves_id_seq OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaves_id_seq OWNED BY public.leaves.id;


--
-- Name: overtime; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.overtime (
    id integer NOT NULL,
    employee_id integer,
    company_id integer,
    attendance_id integer,
    date date NOT NULL,
    type character varying(50) DEFAULT 'auto'::character varying,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration_minutes integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    reason text,
    approved_by integer,
    approved_at timestamp without time zone,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT overtime_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT overtime_type_check CHECK (((type)::text = ANY ((ARRAY['auto'::character varying, 'manual'::character varying, 'approved'::character varying])::text[])))
);


ALTER TABLE public.overtime OWNER TO absenin_user;

--
-- Name: overtime_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.overtime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.overtime_id_seq OWNER TO absenin_user;

--
-- Name: overtime_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.overtime_id_seq OWNED BY public.overtime.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    company_id integer,
    plan_id integer,
    amount numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    payment_method character varying(50) DEFAULT 'bank_transfer'::character varying,
    bank_name character varying(100),
    bank_account_number character varying(50),
    bank_account_name character varying(255),
    transfer_proof_url text,
    transfer_date timestamp without time zone,
    confirmed_by integer,
    confirmed_at timestamp without time zone,
    rejection_reason text,
    invoice_number character varying(100),
    period_start date,
    period_end date,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'waiting_confirmation'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    price numeric(12,2) DEFAULT 0,
    max_employees integer DEFAULT 10,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    duration_days integer DEFAULT 30,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    company_id integer,
    division_id integer,
    name character varying(255) NOT NULL,
    description text,
    base_salary numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.positions_id_seq OWNER TO postgres;

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.reminders (
    id integer NOT NULL,
    company_id integer,
    type character varying(50) DEFAULT 'checkin'::character varying,
    "time" time without time zone NOT NULL,
    message text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminders OWNER TO absenin_user;

--
-- Name: reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reminders_id_seq OWNER TO absenin_user;

--
-- Name: reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.reminders_id_seq OWNED BY public.reminders.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: absenin_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    name character varying(255),
    role character varying(50) DEFAULT 'admin'::character varying,
    company_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(50),
    last_login timestamp without time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'superadmin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO absenin_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: absenin_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO absenin_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: absenin_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_settings id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.company_settings ALTER COLUMN id SET DEFAULT nextval('public.company_settings_id_seq'::regclass);


--
-- Name: divisions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: leaves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves ALTER COLUMN id SET DEFAULT nextval('public.leaves_id_seq'::regclass);


--
-- Name: overtime id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime ALTER COLUMN id SET DEFAULT nextval('public.overtime_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.attendance (id, employee_id, company_id, check_in, check_out, date, status, latitude, longitude, location_name, location_detail, checkout_latitude, checkout_longitude, checkout_location_name, selfie_checkin_url, selfie_checkout_url, selfie_verified, overtime_minutes, note, created_at, distance_meters, is_within_radius) FROM stdin;
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, bank_name, account_number, account_name, is_active, sort_order, created_at) FROM stdin;
7	MANDIRI	1640003666122	Wella Priyadi	t	0	2026-02-26 20:09:27.184581
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.companies (id, name, slug, plan, max_employees, created_at, updated_at, logo_url, address, phone, email, plan_expires_at, is_active, trial_ends_at) FROM stdin;
1	Absenin HQ	absenin-hq	enterprise	999	2026-02-26 18:31:28.757048	2026-02-26 20:45:18.319037					\N	f	\N
2	WellArtDev	wellartdev-1772136674287	enterprise	10	2026-02-26 20:11:14.28708	2026-02-26 20:46:55.740717					\N	t	\N
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.company_settings (id, company_id, work_start, work_end, late_tolerance_minutes, allowed_latitude, allowed_longitude, allowed_radius_meters, require_location, require_selfie, overtime_enabled, overtime_min_minutes, overtime_rate_multiplier, overtime_max_hours, created_at, updated_at, office_latitude, office_longitude, office_address, radius_lock_enabled, wa_api_url, wa_api_token, wa_device_number, timezone) FROM stdin;
1	1	08:00:00	17:00:00	15	\N	\N	500	f	t	t	30	1.5	4	2026-02-26 18:31:28.767156	2026-02-26 18:31:28.767156	\N	\N	\N	f	\N	\N	\N	Asia/Jakarta
2	2	08:00:00	17:00:00	15	\N	\N	500	t	f	t	30	1.5	4	2026-02-26 20:11:14.28708	2026-02-27 05:49:53.822156	-6.33318500	106.76725860	pondok cabe ilir	f	https://api.fonnte.com/send	gYZUKMYMrUg77X1mqLeD	628175408484	Asia/Jakarta
\.


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.divisions (id, company_id, name, description, is_active, created_at, updated_at) FROM stdin;
1	2	IT	\N	t	2026-02-26 20:11:58.081426	2026-02-26 20:11:58.081426
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.employees (id, name, phone_number, "position", department, company_id, is_active, created_at, updated_at, employee_code, email, division_id, position_id, employment_status, start_date, end_date, base_salary, ktp_number, npwp_number, birth_date, birth_place, gender, address, emergency_contact, emergency_phone, photo_url, leave_balance, radius_lock_enabled, phone) FROM stdin;
3	Ratna	628174188080	\N	\N	2	t	2026-02-26 23:08:42.838367	2026-02-26 23:08:42.838367	EMP0002	\N	1	1	tetap	\N	\N	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	12	f	\N
2	Wella	62817892468		IT	2	t	2026-02-26 20:13:41.991724	2026-02-26 23:03:50.036576	EMP0001	aku@wella.cloud	1	1	tetap	2026-02-27	\N	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	12	f	\N
\.


--
-- Data for Name: leaves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leaves (id, employee_id, company_id, type, start_date, end_date, total_days, reason, status, approved_by, approved_at, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: overtime; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.overtime (id, employee_id, company_id, attendance_id, date, type, start_time, end_time, duration_minutes, status, reason, approved_by, approved_at, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, company_id, plan_id, amount, status, payment_method, bank_name, bank_account_number, bank_account_name, transfer_proof_url, transfer_date, confirmed_by, confirmed_at, rejection_reason, invoice_number, period_start, period_end, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, slug, price, max_employees, features, is_active, duration_days, description, sort_order, created_at, updated_at) FROM stdin;
1	Gratis	free	0.00	10	["attendance", "selfie", "gps", "dashboard", "export_csv"]	t	0	Cocok untuk UMKM kecil	1	2026-02-26 19:53:27.969809	2026-02-26 19:53:27.969809
2	Pro	pro	99000.00	50	["attendance", "selfie", "gps", "dashboard", "export_csv", "overtime", "leave_management", "auto_reminder", "radius_validation", "priority_support"]	t	30	Untuk bisnis berkembang	2	2026-02-26 19:53:27.969809	2026-02-26 19:53:27.969809
3	Enterprise	enterprise	299000.00	999	["attendance", "selfie", "gps", "dashboard", "export_csv", "overtime", "leave_management", "auto_reminder", "radius_validation", "priority_support", "multi_branch", "api_access", "custom_branding", "dedicated_support"]	t	30	Untuk perusahaan besar	3	2026-02-26 19:53:27.969809	2026-02-26 19:53:27.969809
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.positions (id, company_id, division_id, name, description, base_salary, is_active, created_at, updated_at) FROM stdin;
1	2	1	Staff	\N	0.00	t	2026-02-26 20:12:11.533242	2026-02-26 20:12:11.533242
\.


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.reminders (id, company_id, type, "time", message, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: absenin_user
--

COPY public.users (id, email, password, name, role, company_id, is_active, created_at, updated_at, phone, last_login) FROM stdin;
1	admin@absenin.com	$2a$12$WU2OnHKxATNb9gePcb0t1e/Cx1JOgfIwmAANLCTYBJoryj3zFE1gC	Super Admin	superadmin	1	t	2026-02-26 18:31:28.764568	2026-02-26 20:45:22.063403	\N	2026-02-27 00:16:52.86258
2	hello@wella.cloud	$2a$12$2OQl9zvEwTarvSk3iZT4kuCGiuty6pBdQ6j6eZN4Ch9bMTMC/R8I6	Wella	admin	2	t	2026-02-26 20:11:14.28708	2026-02-26 20:11:14.28708	62817892468	2026-02-27 05:39:08.250665
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.attendance_id_seq', 1, false);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 7, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.companies_id_seq', 2, true);


--
-- Name: company_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.company_settings_id_seq', 37, true);


--
-- Name: divisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.divisions_id_seq', 1, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.employees_id_seq', 3, true);


--
-- Name: leaves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leaves_id_seq', 1, false);


--
-- Name: overtime_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.overtime_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 6, true);


--
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.positions_id_seq', 1, true);


--
-- Name: reminders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.reminders_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: absenin_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: attendance attendance_employee_id_date_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: company_settings company_settings_company_id_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_company_id_key UNIQUE (company_id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_company_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_company_id_name_key UNIQUE (company_id, name);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: employees employees_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_phone_number_key UNIQUE (phone_number);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: leaves leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);


--
-- Name: overtime overtime_employee_id_date_type_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_employee_id_date_type_key UNIQUE (employee_id, date, type);


--
-- Name: overtime overtime_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_pkey PRIMARY KEY (id);


--
-- Name: payments payments_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_number_key UNIQUE (invoice_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: plans plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_key UNIQUE (slug);


--
-- Name: positions positions_company_id_division_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_company_id_division_id_name_key UNIQUE (company_id, division_id, name);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_company; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_attendance_company ON public.attendance USING btree (company_id);


--
-- Name: idx_attendance_coords; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_attendance_coords ON public.attendance USING btree (latitude, longitude) WHERE (latitude IS NOT NULL);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);


--
-- Name: idx_attendance_employee; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_attendance_employee ON public.attendance USING btree (employee_id);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_attendance_employee_date ON public.attendance USING btree (employee_id, date);


--
-- Name: idx_divisions_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_divisions_company ON public.divisions USING btree (company_id);


--
-- Name: idx_employees_code; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_employees_code ON public.employees USING btree (employee_code);


--
-- Name: idx_employees_company; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_employees_company ON public.employees USING btree (company_id);


--
-- Name: idx_employees_division; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_employees_division ON public.employees USING btree (division_id);


--
-- Name: idx_employees_phone; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_employees_phone ON public.employees USING btree (phone_number);


--
-- Name: idx_employees_position; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_employees_position ON public.employees USING btree (position_id);


--
-- Name: idx_leaves_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_company ON public.leaves USING btree (company_id);


--
-- Name: idx_leaves_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_dates ON public.leaves USING btree (start_date, end_date);


--
-- Name: idx_leaves_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_employee ON public.leaves USING btree (employee_id);


--
-- Name: idx_overtime_company; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_overtime_company ON public.overtime USING btree (company_id);


--
-- Name: idx_overtime_date; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_overtime_date ON public.overtime USING btree (date);


--
-- Name: idx_overtime_employee; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_overtime_employee ON public.overtime USING btree (employee_id);


--
-- Name: idx_overtime_employee_date; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_overtime_employee_date ON public.overtime USING btree (employee_id, date);


--
-- Name: idx_overtime_status; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_overtime_status ON public.overtime USING btree (status);


--
-- Name: idx_payments_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_company ON public.payments USING btree (company_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_positions_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_positions_company ON public.positions USING btree (company_id);


--
-- Name: idx_positions_division; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_positions_division ON public.positions USING btree (division_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: absenin_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: attendance attendance_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: company_settings company_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: divisions divisions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: employees employees_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- Name: leaves leaves_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: leaves leaves_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: leaves leaves_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: overtime overtime_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: overtime overtime_attendance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.attendance(id) ON DELETE SET NULL;


--
-- Name: overtime overtime_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: overtime overtime_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.overtime
    ADD CONSTRAINT overtime_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: payments payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: payments payments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: positions positions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: positions positions_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: reminders reminders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: absenin_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO absenin_user;


--
-- Name: TABLE bank_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_accounts TO absenin_user;


--
-- Name: SEQUENCE bank_accounts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.bank_accounts_id_seq TO absenin_user;


--
-- Name: TABLE divisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.divisions TO absenin_user;


--
-- Name: SEQUENCE divisions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.divisions_id_seq TO absenin_user;


--
-- Name: TABLE leaves; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leaves TO absenin_user;


--
-- Name: SEQUENCE leaves_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.leaves_id_seq TO absenin_user;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO absenin_user;


--
-- Name: SEQUENCE payments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.payments_id_seq TO absenin_user;


--
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.plans TO absenin_user;


--
-- Name: SEQUENCE plans_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.plans_id_seq TO absenin_user;


--
-- Name: TABLE positions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.positions TO absenin_user;


--
-- Name: SEQUENCE positions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.positions_id_seq TO absenin_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO absenin_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO absenin_user;


--
-- PostgreSQL database dump complete
--

\unrestrict aeHdIdYSI94FIWJUGGiQKCZbTNbhSEi9aU5MxRAcQZVENOtS66nWm7YFgopT7kG

