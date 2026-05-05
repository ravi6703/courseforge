-- ────────────────────────────────────────────────────────────────────────
-- ppt_slides.image_url
-- ────────────────────────────────────────────────────────────────────────
-- Round B: PPT editor lets the coach generate or paste an image per
-- slide. Stored as a URL on the slide row (could be a data: URL from
-- the image generator's b64_json fallback, or an https: URL).

ALTER TABLE ppt_slides
  ADD COLUMN IF NOT EXISTS image_url TEXT;
