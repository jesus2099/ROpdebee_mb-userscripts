import { assertHasValue } from '../../lib/util/assert';
import { gmxhr } from '../../lib/util/xhr';

import type { CoverArt, CoverArtProvider } from './base';
import { ArtworkTypeIDs } from './base';

// Splitting these regexps up for each domain. www.qobuz.com includes the album
// title in the URL, open.qobuz.com does not. Although we could make the album
// title part optional and match both domains with the same regexp, this could
// lead to issues with URLs like this:
// https://open.qobuz.com/album/1234567890/related
// Not sure if such URLs would ever occur, but using a single regexp could
// lead to `related` being matched as the ID and the actual ID as the title.
const WWW_ID_MATCH_REGEX = /\/album\/[^/]+\/([A-Za-z0-9]+)(?:\/|$)/;
const OPEN_ID_MATCH_REGEX = /\/album\/([A-Za-z0-9]+)(?:\/|$)/;
// Assuming this doesn't change often. If it does, we might have to extract it
// from the JS code loaded on open.qobuz.com, but for simplicity's sake, let's
// just use a constant app ID first.
const QOBUZ_APP_ID = 712109809;

interface Goodie {
    id: number
    file_format_id: number
    name: string
    description: string
    url: string
    original_url: string
}

// Incomplete, only what we need
interface AlbumMetadata {
    image: {
        large: string  // Note: Not the original
        small: string
        thumbnail: string
        // TODO: What's the format of these? I tried a bunch of well-known
        // albums where you'd expect that back covers were offered (Michael
        // Jackson etc) and it's always null.
        back: unknown
    }

    goodies?: Goodie[]
}

export class QobuzProvider implements CoverArtProvider {
    supportedDomains = ['qobuz.com', 'open.qobuz.com']
    favicon = 'https://www.qobuz.com/favicon.ico'
    name = 'Qobuz'

    supportsUrl(url: URL): boolean {
        if (url.hostname === 'open.qobuz.com') {
            return OPEN_ID_MATCH_REGEX.test(url.pathname);
        }

        return WWW_ID_MATCH_REGEX.test(url.pathname);
    }

    static idToCoverUrl(id: string): URL {
        const d1 = id.slice(-2);
        const d2 = id.slice(-4, -2);
        // Is this always .jpg?
        const imgUrl = `https://static.qobuz.com/images/covers/${d1}/${d2}/${id}_org.jpg`;
        return new URL(imgUrl);
    }

    static extractId(url: URL): string {
        // eslint-disable-next-line init-declarations
        let id: string | undefined;
        if (url.hostname === 'open.qobuz.com') {
            id = url.pathname.match(OPEN_ID_MATCH_REGEX)?.[1];
        } else {
            id = url.pathname.match(WWW_ID_MATCH_REGEX)?.[1];
        }

        assertHasValue(id);
        return id;
    }

    static async getMetadata(id: string): Promise<AlbumMetadata> {
        const resp = await gmxhr({
            url: `https://www.qobuz.com/api.json/0.2/album/get?album_id=${id}&offset=0&limit=20`,
            method: 'GET',
            headers: {
                'x-app-id': QOBUZ_APP_ID,
            },
        });

        return JSON.parse(resp.responseText);
    }

    static extractGoodies(goodie: Goodie): CoverArt {
        // Livret Numérique = Digital Booklet
        const isBooklet = goodie.name === 'Livret Numérique';
        return {
            url: new URL(goodie.original_url),
            type: isBooklet ? [ArtworkTypeIDs.Booklet] : [],
            comment: isBooklet ? 'Qobuz booklet' : goodie.name,
        };
    }

    async findImages(url: URL): Promise<CoverArt[]> {
        const id = QobuzProvider.extractId(url);

        // eslint-disable-next-line init-declarations
        let metadata: AlbumMetadata;
        try {
            metadata = await QobuzProvider.getMetadata(id);
        } catch (err) {
            // We could use the URL rewriting technique to still get the cover,
            // but if we do that, we'd have to swallow this error. It's better
            // to just throw here, IMO, so we could fix any error.
            console.error(err);
            throw new Error('Could not retrieve Qobuz metadata, app ID invalid?');
        }

        const goodies = (metadata.goodies ?? []).map(QobuzProvider.extractGoodies);
        const coverUrl = metadata.image.large.replace(/_\d+\.([a-zA-Z0-9]+)$/, '_org.$1');
        return [
            {
                url: new URL(coverUrl),
                type: [ArtworkTypeIDs.Front],
            },
            ...goodies,
        ];
    }
}