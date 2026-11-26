# CALCOPY — Architectural reconstruction protocol

Specification, not an implementation or verified production capability.

## Processing and dependency order
0. Estimate raster scale (pixels/metre), deskew if justified, preserve source and confidence.
1. Semantic segmentation of walls and columns at variable thickness. Paint only structural pixels black on white, excluding furniture and closets. Reconstruct complete WALL geometry with square ends, real thicknesses, L/T/X joins and perimeter returns. Preserve observed openings and their hosts; no unsupported bridging.
2. Insert native parametric doors and windows on verified host walls. Use existing CAD opening operations to cut the wall automatically. Do not simulate an opening by drawing a block over an uncut wall.
3. Recognize toilets, bidets, washbasins, baths and showers; insert corresponding editable library objects.
4. Recognize four-burner cooktops, kitchen sinks and refrigerators.
5. Recognize closets, beds, sofas, tables and chairs, then vegetation.
6. Add associative dimensions and text last; dimensions must reflect actual geometry.

## Layers
Proposed canonical names, subject to mapping onto existing CAD2D3D layer conventions:
WALLS, COLUMNS, DOORS, WINDOWS, SANITARY, KITCHEN, APPLIANCES, CLOSETS, FURNITURE, PLANTS, DIMENSIONS, TEXT.
Reuse native WALL, door/window and block APIs; do not replace existing CAD tools.

## Scale
Prefer a confirmed drawing dimension or manual two-point calibration. If unavailable, recognize the complete toilet outline as a provisional scale reference before drawing walls; nominal length 0.65 m and width 0.36 m are initial assumptions, not universal dimensions. Estimate px/m independently along length and width, considering orientation; cross-check other fixtures and use robust consensus when available. Never use a partial bowl as the full fixture. If estimates disagree materially or no reliable object exists, request calibration before claiming precise dimensions. Keep original ratios and label estimated scale. Calibrating from a toilet does not mean inserting its block before walls.

## Acceptance gate
Use the user's November 25 typical apartment plan as a reference; preserve the original raster where available. First pass must show all wall surfaces, variable widths, completed endpoints, no closets or furniture in the wall mask, and no invented walls. Compare with manually annotated truth on multiple plans, including filled, hollow and hatched walls. Do not proceed to automatic openings/furniture as a substitute for passing the wall gate. Keep a review stage and avoid silently inserting low-confidence objects. Report mask overlap, missed walls, false positives, endpoint errors, scale error and native CAD integration results separately. Verify actual Cloudflare deployment and browser execution before declaring complete.
