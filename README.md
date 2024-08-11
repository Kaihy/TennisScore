node package must be installed
Postresql DB


Tennis_App DB

SQL Statements:

/////////////////////
-- Table: public.tennis_match

-- DROP TABLE IF EXISTS public.tennis_match;

CREATE TABLE IF NOT EXISTS public.tennis_match
(
    id integer NOT NULL DEFAULT nextval('tennis_match_id_seq'::regclass),
    spieler1 character varying(100) COLLATE pg_catalog."default" NOT NULL,
    spieler2 character varying(100) COLLATE pg_catalog."default" NOT NULL,
    courtnumber integer NOT NULL,
    spielklasse character varying(50) COLLATE pg_catalog."default" NOT NULL,
    altersklasse character varying(50) COLLATE pg_catalog."default" NOT NULL,
    spieler1_verein character varying(100) COLLATE pg_catalog."default" NOT NULL,
    spieler2_verein character varying(100) COLLATE pg_catalog."default" NOT NULL,
    spieler1_satz integer DEFAULT 0,
    spieler2_satz integer DEFAULT 0,
    spieler1_spiel integer DEFAULT 0,
    spieler2_spiel integer DEFAULT 0,
    spieler1_punkte character varying(100) COLLATE pg_catalog."default" DEFAULT 0,
    spieler2_punkte character varying(100) COLLATE pg_catalog."default" DEFAULT 0,
    spielstatus character varying(50) COLLATE pg_catalog."default",
    delete boolean DEFAULT false,
    spieler1_spiel2 integer DEFAULT 0,
    spieler1_spiel3 integer DEFAULT 0,
    spieler2_spiel3 integer DEFAULT 0,
    spieler2_spiel2 integer DEFAULT 0,
    serve1 integer,
    serve2 integer,
    CONSTRAINT tennis_match_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tennis_match
    OWNER to postgres;




////////////////

