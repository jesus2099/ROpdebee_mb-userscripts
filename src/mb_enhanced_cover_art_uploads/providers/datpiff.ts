import { LOGGER } from '@lib/logging/logger';
import { ArtworkTypeIDs } from '@lib/MB/CoverArt';
import { filterNonNull } from '@lib/util/array';
import { assertNonNull } from '@lib/util/assert';
import { blobToDigest } from '@lib/util/blob';
import { parseDOM, qs, qsMaybe } from '@lib/util/dom';

import type { FetchedImage } from '../fetch';
import type { CoverArt } from './base';
import { CoverArtProvider } from './base';

export class DatPiffProvider extends CoverArtProvider {
    supportedDomains = ['datpiff.com'];
    favicon = 'http://hw-static.datpiff.com/favicon.ico';
    name = 'DatPiff';
    // Case insensitive because DatPiff seems to add the "mixtape" if the title
    // doesn't end in "mixtape", but if the title does end in "mixtape", it
    // keeps the original capitalisaton.
    urlRegex = /mixtape\.(\d+)\.html/i;

    // Placeholders are just the DatPiff logo.
    static placeholderDigests = [
        '259b065660159922c881d242701aa64d4e02672deba437590a2014519e7caeec', // small
        'ef406a25c3ffd61150b0658f3fe4863898048b4e54b81289e0e53a0f00ad0ced', // medium
        'a2691bde8f4a5ced9e5b066d4fab0675b0ceb80f1f0ab3c4d453228549560048', // large
    ];

    async findImages(url: URL): Promise<CoverArt[]> {
        const respDocument = parseDOM(await this.fetchPage(url), url.href);

        // DatPiff does not return 404 on non-existent releases, but a 200 page
        // with an error banner.
        if (respDocument.title === 'Mixtape Not Found') {
            throw new Error(this.name + ' release does not exist');
        }

        const coverCont = qs<HTMLDivElement>('.tapeBG', respDocument);
        const frontCoverUrl = coverCont.getAttribute('data-front');
        const backCoverUrl = coverCont.getAttribute('data-back');
        // If there's no back cover, this element won't be present but the
        // data-back attribute would still be set with a bad URL.
        const hasBackCover = qsMaybe('#screenshot', coverCont) !== null;

        assertNonNull(frontCoverUrl, 'No front image found in DatPiff release');

        const covers = [{
            url: new URL(frontCoverUrl),
            types: [ArtworkTypeIDs.Front],
        }];
        if (hasBackCover) {
            assertNonNull(backCoverUrl, 'No back cover found in DatPiff release, even though there should be one');
            covers.push({
                url: new URL(backCoverUrl),
                types: [ArtworkTypeIDs.Back],
            });
        }

        return covers;
    }

    override async postprocessImages(images: FetchedImage[]): Promise<FetchedImage[]> {
        const withoutPlaceholders = await Promise.all(images.map(async (image) => {
            const digest = await blobToDigest(image.content);
            if (DatPiffProvider.placeholderDigests.includes(digest)) {
                LOGGER.warn(`Skipping "${image.content.name}" as it matches a placeholder cover`);
                return null;
            } else {
                return image;
            }
        }));

        return filterNonNull(withoutPlaceholders);
    }
}
