-- Migration: Backfill tool categories for existing models from jsonData.__type
-- Safe to run multiple times (idempotent: strips any stale tool category then adds the correct one)

UPDATE "Model"
SET categories = array_cat(
  -- Keep all non-tool categories
  ARRAY(
    SELECT unnest(categories)
    EXCEPT
    SELECT unnest(ARRAY['HeyGeo','JSXGraph','CindyJS','MathBox','GeoGebra','Sketchpad','Web Sketchpad','Geometry Expressions','HTML'])
  ),
  -- Append the correct tool category based on __type
  CASE ("jsonData"->>'__type')
    WHEN 'jsxgraph'  THEN ARRAY['JSXGraph']
    WHEN 'heygeo'    THEN ARRAY['HeyGeo']
    WHEN 'heygeoweb' THEN ARRAY['HeyGeo']
    WHEN 'sketchpad' THEN ARRAY['Sketchpad']
    WHEN 'gsp'       THEN ARRAY['Sketchpad']
    WHEN 'wsp'       THEN ARRAY['Web Sketchpad']
    WHEN 'geogebra'  THEN ARRAY['GeoGebra']
    WHEN 'cindyjs'   THEN ARRAY['CindyJS']
    WHEN 'cindy'     THEN ARRAY['CindyJS']
    WHEN 'mathbox'   THEN ARRAY['MathBox']
    WHEN 'gx'        THEN ARRAY['Geometry Expressions']
    WHEN 'html'      THEN ARRAY['HTML']
    ELSE ARRAY[]::TEXT[]
  END
)
WHERE "jsonData"->>'__type' IS NOT NULL;

-- Backfill HeyGeo native models (no __type field at all)
UPDATE "Model"
SET categories = array_cat(
  ARRAY(
    SELECT unnest(categories)
    EXCEPT
    SELECT unnest(ARRAY['HeyGeo','JSXGraph','CindyJS','MathBox','GeoGebra','Sketchpad','Web Sketchpad','Geometry Expressions','HTML'])
  ),
  ARRAY['HeyGeo']
)
WHERE "jsonData"->>'__type' IS NULL
  AND ("jsonData"->>'codeMode')::boolean IS NOT TRUE;

-- Backfill JSXGraph coding models (codeMode:true, no __type)
UPDATE "Model"
SET categories = array_cat(
  ARRAY(
    SELECT unnest(categories)
    EXCEPT
    SELECT unnest(ARRAY['HeyGeo','JSXGraph','CindyJS','MathBox','GeoGebra','Sketchpad','Web Sketchpad','Geometry Expressions','HTML'])
  ),
  ARRAY['JSXGraph']
)
WHERE "jsonData"->>'__type' IS NULL
  AND ("jsonData"->>'codeMode')::boolean IS TRUE;
