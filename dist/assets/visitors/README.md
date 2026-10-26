# Original Identity V visitor assets

These assets depict Detective Orpheus — **别样魅力 / Villain Charm** and Alice de Ross — **未至之人 / On the Way**. They are original NetEase game resources converted for this website, used under the site owner's stated cooperation/authorization. No open-source asset licence is implied. The costumes are identified in the [official game announcement](https://www.identityvgame.com/en/news/announcement/20250327/35288_1222823.html).

## Models and textures

| Website file | Original model | Vertices / triangles / bones |
| --- | --- | --- |
| `male/avatar.glb` | `detective_melanism.mesh` | 6,625 / 8,959 / 75 |
| `female/avatar.glb` | `deluosi_baipao_hat.mesh` — hood up | 7,050 / 11,002 / 176 |
| `female/avatar-hoodless.glb` | `deluosi_baipao.mesh` — hood down | 8,305 / 12,341 / 176 |

The original geometry, UVs, skin weights, skeleton hierarchy and bind poses are preserved. The male head and coat diffuse textures are natively 512×512; inner clothing and lantern textures are 256×256. Both female diffuse textures are natively 512×512. Original compressed pixels were decoded without resizing, repainting or AI upscaling. These are the source textures' actual resolutions, not a claim of 2K/4K textures. Portraits are renders of these same original models.

The GLBs now retain the original mesh tangents, normal detail and material masks. The original NeoX shader uses normal RG as XY slopes with Z=1; normal B is a separate effect mask. These slopes are deterministically encoded as normalized glTF XYZ normals, at the original dimensions. Original mask channels R=metallic, G=AO, B=roughness are reordered to glTF ORM=(G,B,R). Original tangent direction and the handedness encoded by tangent length are preserved; no tangents are regenerated and no mesh is subdivided. `material-report.json` records original source paths, decoded MD5s, native dimensions and preserved-data digests. The complete per-accessor checks are kept in the repository's test fixture.

The original 256×256 `shader/env/dm65_main_env01_d` environment is coordinate-converted by pixel permutation only. Its linear colour interpretation and the original material's specular gain are retained. This is a Three.js PBR adaptation, not a complete reproduction of NeoX's toon, anisotropic hair and scene-lighting shaders. Only the male model has its original lantern socket; no lantern is added to Alice.

The October 25 quality review did not locate a **verified** higher-polygon original model or 1K/2K/4K replacement texture for these costumes. Current geometry and texture resolutions are unchanged. Public resource-index probes are not proof that no other original resource exists. The improvement restores previously omitted material data rather than claiming artificially enlarged textures as original HD.

### Installed PC resources — October 26

The current diffuse, normal and mask images were decoded from the owner's installed PC client (`dwrg2`). Resolution uses the current `Documents/thd` resource index, then locates its exact content MD5 in `Documents/res` or the base `res` packages. Every extracted payload is checked for decoded size and MD5. The game installation was read without modification.

These PC textures use native DDS / BC3 compression rather than the previously used mobile ASTC pixels. Their dimensions remain 512×512 or 256×256. Side-by-side rendering with the same camera, pose, lights and material parameters shows modest improvements in clothing patterns and embroidery; this is not a higher-resolution model upgrade. The PC mesh files are byte-identical to the original meshes listed below. All browser geometry, normals, tangents, UVs, skinning and animation accessor payloads remain byte-identical to the preceding website version, as do node, skin, mesh and animation declarations.

The files contain only the images actually used by the materials; identical images are shared. This reduces the three GLBs' combined download size by approximately 1.28 MB without reducing geometry or texture resolution. DDS pixels are converted losslessly to PNG for browser use; only the documented normal and mask channel conversion changes their encoding. No resizing, sharpening or generated details are applied. This installed client did not yield a verified additional high-polygon or higher-resolution variant; bounded resource-name searches cannot prove that no other original variant exists.

Original model data came from the public NetEase resource CDN, resolved through the official game resource index and checked against its decoded content MD5:

- [Male original mesh](https://h55.gsf.netease.com/nx3_release_ios_ad/dynamic/11/50291532a9553caf5d4c412332e14a100cbf5f) — MD5 `1150291532a9553caf5d4c412332e14a`.
- [Female hooded original mesh](https://h55.gsf.netease.com/nx3_release_ios_ad/dynamic/1d/a3dd55c60e58c80e7838e1419b9805672f02dd) — MD5 `1da3dd55c60e58c80e7838e1419b9805`.
- [Female hoodless original mesh](https://h55.gsf.netease.com/nx3_release_ios_ad/dynamic/d5/cf6f3fdbe533c30271d101fa0b3e93bf8ee22b) — MD5 `d5cf6f3fdbe533c30271d101fa0b3e93`.

## Original motions and hood options

Both costumes retain their own authored `hall_idle_2` and `hall_walk_2` clips. The male clips last approximately 6.3333 and 3.6 seconds; the female clips last 11.5 and 7.2 seconds. Idle remains animated. The female idle includes looking to either side; both visitors have the same forward axis, so those looks are not a permanent model-facing correction.

Hood up and hood down are two distinct original female meshes sharing the original skeleton and movements. The removable hood is also documented in this [2023 in-game recording](https://www.bilibili.com/video/BV1xa4y1P7hu/) and the [costume gallery](https://id5.fandom.com/wiki/On_the_Way). No authored hood-removal transition was located, so the website switches the original appearances directly rather than fabricating a transformation animation.

## Original female footsteps

`female/footsteps/sourceDefault-01.wav` through `sourceDefault-05.wav` are the five original samples selected by Alice's `derose_run` sound object. They come from the original `wwise/survivor_01.bnk` bank (ID `470574751`, decoded MD5 `8c84bd2229c3a9d6419b9f17813ba3ef`) and event `P_survivor_01_survivor_1p_guanjia_derose_derose_run` (ID `3206242083`). Their original media IDs are `602528972`, `991797274`, `734105284`, `397840226`, and `165889593`.

WEM audio was decoded to native stereo PCM16 WAV at 28,000 Hz without synthesis, trimming, resampling, pitch changes or baked gain. The original random group gives the samples equal probability, avoids immediate repeats, and applies −13 dB gain. These are Alice's own samples, distinct from the detective's footsteps. The source bank's default material switch is retained; no unverified room-floor mapping is claimed.

The female walk's 12 authored sound notifications occur at approximately `0.1000, 0.6998, 1.3003, 1.9000, 2.4998, 3.1003, 3.7000, 4.2998, 4.9003, 5.5000, 6.0998, 6.7003` seconds in the 7.2-second cycle. The website synchronizes its playback to these animation times. The game's complete spatial attenuation and audio-bus processing are not baked into these files.
