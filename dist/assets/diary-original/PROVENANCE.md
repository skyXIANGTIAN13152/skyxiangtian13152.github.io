# 2022 original diary sub-entry animation

These original visual assets belong to Identity V / NetEase and their respective rights holders, and are used under the collaboration authorization stated by the site owner.

Original 2022 Android package archive:
https://dl.appsanny.com/apk/com.netease.idv.googleplay1.0.1032449.xapk

Selected resources were read from its OBB res/ui.mini.npk using HTTP byte ranges. Neither the installer nor game scripts were executed.

Source CSB: ui/dm65ui/res/hall_ei_entrance.csb, MD5 0b0cfbe48c73e54a7c33bd3e0f9fb7e9. Entrance frames 0-15, exit 35-50, speed 0.5. The Cocos 1/60-second timeline interval gives 30 source frames per second, or 500 milliseconds per clip. The shipped original-entrance-track.json retains the extracted timeline fields.

Original atlas system/hall_ei_0.pkm MD5 a7ba64f06d1eb628eb58503d4afce971, alpha atlas MD5 9f3f270f80c6cebddc7fe3b136c08e2f. Both are 1024 x 1024 ETC1 KTX images despite their extension. Original plist metadata determines sprite cropping and rotation. diary-fog.png is 114 x 66; diary-side.png is 42 x 82. No image enlargement, repainting or generative replacement was applied.

Transferred nodes: ani_fog_1, ani_fog_2, ani_fog_3, img_side_1, img_side_2, title-opacity track img_text_ei, and parent btn_ei scale/opacity. Linear source easing, positions, mirroring and opacity values are preserved within the original 200 x 90 widget. DOM coordinates convert Cocos Y-up into Y-down.

The personal title, responsive overall scale, viewport-centred placement, black page mask and joining the two source clips around a page change are website adaptations. The separate looping ProjectNode ani_fog and other original game menu controls are not transferred. This is the verified original sub-entry effect, not the complete old diary main menu or a claim of its original camera movement. The page-opening audio mapping is also a website adaptation; the original initial Bookshelf hotspot audio event has not been conclusively verified.

Format and timing references:
- https://raw.githubusercontent.com/cocos2d/cocos2d-x/v3/cocos/editor-support/cocostudio/fbs-files/CSParseBinary.fbs
- https://raw.githubusercontent.com/cocos2d/cocos2d-x/v3/cocos/editor-support/cocostudio/ActionTimeline/CCActionTimeline.cpp
