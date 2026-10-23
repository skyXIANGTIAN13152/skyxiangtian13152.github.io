# Toy Merchant original game assets

The cover interactions use Identity V / 第五人格 original Toy Merchant meshes,
skinning, bone hierarchies, texture artwork and sparse animation keys. They replace
the previous hand-drawn SVG glider. The owner requested this use and stated that
permission had been arranged with the rights holder; this file is provenance,
not an independent license grant. Copyright remains with the original owner.

Official character reference and downloads:

- https://id5.163.com/nrzx/role.html
- https://id5.res.netease.com/pc/gw/20220408094220/data/role/wanjushang/h55_survivor_w_shangren_idle.gltf?1
- https://id5.res.netease.com/pc/gw/20220408094220/data/moxingzip/wanjushang-pmx.zip

The native character / skill assets were located using the official game asset
index and fetched from NetEase's `h55.gsf.netease.com` CDN. Source size and MD5 were
verified against that index before conversion. Exact game paths, CDN object URLs,
source hashes, texture references and output SHA-256 hashes are in `sources.json`.
No client game executable was run to obtain these files.

## Included conversions

- `annie.glb`: original Toy Merchant character (69 bones), idle, springboard
  placement, launch phases, glider preparation and gliding clips.
- `tiaoban.glb`: original Toy Merchant springboard (5 bones), including matched
  placement and launch animations.
- `plane.glb`: original Toy Merchant wooden flying craft (11 bones), including
  preparation, gliding and end clips.

Main body, head and prop diffuse maps retain their official 1024 × 1024 native
resolution. The additional craft basket map comes from the official PMX archive
at its native 256 × 256 resolution. It was converted from TGA to PNG without
upscaling or repainting. Main PNGs were losslessly re-encoded. Meshes were not
simplified. Animation conversion preserves the original sparse position, scale
and rotation keys and decodes the game's compressed quaternion representation.

## Web adaptation boundary

The joint poses and the character / prop artwork are original game data. Three.js
lighting, cover composition, screen-space travel, fade and the transition between
animation segments are website adaptations. They do not reproduce the proprietary
game renderer or gameplay physics. At the launch boundary, the web motion keeps
the original movement segment continuous instead of playing the game's final
root reset. The website always plays the complete skill animation.

The renderer and models load only after a skill button is pressed. Animation
frames run only during that interaction. Scene departure, tab hiding, entrance
transitions and page exit cancel playback and restore the cover figure.

Reproducible conversion tooling is kept in the development workspace at
`work/3d-research/toy-merchant/export_toys.py`; it is not part of the public UI.
