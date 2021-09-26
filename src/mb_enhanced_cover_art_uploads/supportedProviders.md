# Supported Cover Art Providers

The following table describes the types of links supported by MB: Upload to CAA From URL and its accompanying behaviour. For example, pasting a link to an Apple Music album will automatically extract the cover artwork from the album, fetch the largest possible version of the image, queue it for addition, and fill the types.

| Provider | Maximised images | Types filled | Notes |
|----------|------------------|--------------|-------|
| Direct links to JPG/PNG/GIF/PDF | Partial (see [maxurl sites.txt](https://github.com/qsniyg/maxurl/blob/master/sites.txt)) | ❌ |
| Amazon | ✔️ | Partial | For MP3/Streaming products, the image is set as the Front cover. For other products, the first image is assumed to be the Front cover, whereas the type of other images are not set. |
| Amazon Music | ✔️ | ✔️ | Converted into main Amazon MP3/Streaming product links, these tend to give larger images. |
| Apple Music/iTunes | ✔️ | ✔️ |
| Bandcamp | ✔️ | ✔️ | No custom domains |
| Deezer | ✔️ | ✔️ |
| Discogs | Partial | ❌ | Images are limited to 600x600, see [qsniyg/maxurl#689](https://github.com/qsniyg/maxurl/issues/689) |
| Qobuz | ✔️ | ✔️ | Goodies are grabbed whenever possible. Back covers might not be supported at this time, if you have a release with a back cover, please let me know. |
| Spotify | ✔️ | ✔️ |
| Tidal | ✔️ | ✔️ | listen.tidal.com/store.tidal.com are converted to tidal.com prior to fetching |
| VGMdb | ✔️ | ✔️ | Types are filled on a best-effort basis, make sure to double-check. Some images are not fetched, see issue [#62](https://github.com/ROpdebee/mb-userscripts/issues/62). |