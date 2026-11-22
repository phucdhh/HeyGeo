-- Migration: reclassify authored HTML pages that were uploaded through the
-- Geometry Expressions box.  Until /models/new offered a plain-HTML option, an
-- authored .html page could only be accepted as __type 'gx', which gave it the
-- Geometry Expressions label and placeholder thumbnail even though it was not a
-- GE export.
--
-- Only the usernames in the target list are touched: there is no reliable
-- in-file marker that proves a page came from Geometry Expressions, so this
-- stays a human call.  Safe to run twice — a row is either 'gx' (to convert)
-- or 'html' (done).
--
-- Checked by hand: none of these accounts' pages mention Geometry Expressions,
-- and each one is a self-written page (three.js / canvas / Web Sketchpad host).

BEGIN;

-- Run this on its own first to see which models would change:
--
-- SELECT m.id, m.title, u.username
-- FROM "Model" m JOIN "User" u ON u.id = m."userId"
-- WHERE u.username = ANY(ARRAY['lethingoclinh258', 'phucnguyen04112005'])
--   AND m."jsonData"->>'__type' = 'gx';

WITH targets AS (
  SELECT m.id
  FROM "Model" m JOIN "User" u ON u.id = m."userId"
  WHERE u.username = ANY(ARRAY['lethingoclinh258', 'phucnguyen04112005'])
    AND m."jsonData"->>'__type' = 'gx'
)
UPDATE "Model" m
SET "jsonData" = jsonb_set(m."jsonData", '{__type}', '"html"'),
    -- The Gallery carries the tool name alongside the subject tags.
    categories = array_append(
      ARRAY(SELECT c FROM unnest(categories) c
            EXCEPT SELECT unnest(ARRAY['Geometry Expressions', 'HTML'])),
      'HTML'),
    -- Drop the stored Geometry Expressions placeholder so the cards fall back
    -- to the HTML placeholder for this type.  A captured screenshot (data: URI)
    -- is real evidence of the model, so it is kept.
    "thumbnailSvg" = CASE
      WHEN m."thumbnailSvg" LIKE 'data:%' THEN m."thumbnailSvg"
      WHEN m."thumbnailSvg" LIKE '%>Geometry Expressions</text>%' THEN NULL
      ELSE m."thumbnailSvg"
    END
FROM targets t
WHERE m.id = t.id;

COMMIT;
