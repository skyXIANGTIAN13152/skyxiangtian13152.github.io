# Original Muse loading sequence

The 50 decoded website images match the original PC resource pixels exactly. The symbol frames are **434 × 296**, and the broken-glass frames are **934 × 525**. No lossy recompression, AI upscaling or replacement animation has been introduced. `provenance.json` records the source assets.

The original `loading.csb` composition scales these sprites by approximately 1.43 in a 1334 × 750 layout. Consequently, their original pixels are enlarged on a full-HD display. The resource review did not locate a verified higher-resolution original sequence; changing the container or enlarging an image file would not add original detail.

Canvas rendering restores high-quality interpolation after resizing, supports native device pixel ratios up to 3 and caps the bitmap at 8 megapixels. This avoids unnecessary downsampling on high-DPR phones while bounding rendering cost. The original frame sequence, layout, wipe/shatter audio and the start of lobby music after completion are unchanged.

On October 26, the owner's installed PC client was checked again using both its base and current update resource indices. All 50 sequence images from each index decode to exactly the website's current pixels (100 image comparisons). The current `loading.csb` has the same eight animation tracks, duration and speed as the base composition. No verified higher-resolution equivalent was found in this client. The website images and timeline were therefore retained.
