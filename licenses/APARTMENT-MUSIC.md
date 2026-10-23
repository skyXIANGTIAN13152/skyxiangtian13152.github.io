# Identity V — installed apartment lobby music

The website lobby and its reading pages now use `public/assets/audio/identity-v-apartment.mp3`, at the user's explicit request. The visual room remains the existing classic detective study.

## Verified source and scene

The user's installed game is `E:/FeverApps/dwrg2`. The latest retained successful lobby session on 2026-10-22 entered scene **10048**, `scene/scene_battle/story_livingroom_l/story_livingroom_l.scn`. The current patched `city_scene_config.py` maps both default and happy music for that scene to `music/space/deluos_scenes/deluos_apartment`.

The patched Wwise bank resolves `P_music_space_deluos_scenes_deluos_apartment` (event ID 3648411599) to media **644481603**. This original recording was extracted read-only from `res/wwise3.wpk`, at offset 310077712, and its payload checksum was verified. No game executable or game scripts were executed. The recording has not been assigned an unverified commercial track title.

The logs identify the entered room, rather than directly recording a posted audio event. The scene configuration and Wwise resource mapping identify its current default music; this is not a claim of live audio capture or exclusion of every possible account override.

## Audio conversion

- Original: Wwise Vorbis, stereo, 44,100 Hz, 5,495,601 samples, 124.616802721 seconds.
- Web copy: MP3, 320 kbps, stereo, 44,100 Hz, 4,987,342 bytes.
- SHA-256: `9145efa663f92b17e2eb61ad081851cf9267ff296ea730af704990ca1cf24fd5`.
- Conversion: vgmstream PCM decode, followed by the official installed FFmpeg's MP3 encoder. No cuts, rearrangement, synthesis, resampling or volume normalization. A higher output bitrate does not restore detail removed in the game's compressed original.
- Whole recording loops. Website volume remains controlled by the visitor's sound switch and the owner's existing music-volume setting; the original engine's filters and event gain are documented, not claimed to be reproduced.
- Detailed checksums, source offsets and event metadata: [APARTMENT-MUSIC-PROVENANCE.json](APARTMENT-MUSIC-PROVENANCE.json).

## Login comparison

The installed login interface uses BGM ID 17, `P_music_main_character_options`, media 343281774. Its recording matches the website's existing official **《第五人格》** MP3, apart from codec differences, so that higher quality official copy is retained. The previous website lobby **《庄园》** is a different recording and is no longer selected by the application. Its file is retained so already-open older website versions can still finish playing.

Identity V / NetEase retains the rights to these assets. Use follows the user's stated authorization; this is not a royalty-free recording.
