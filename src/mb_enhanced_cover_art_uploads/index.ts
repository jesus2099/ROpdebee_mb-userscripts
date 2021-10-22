/* istanbul ignore file: Covered by E2E */

import { EditNote } from '@lib/MB/EditNote';
import { assertHasValue } from '@lib/util/assert';
import { LOGGER } from '@lib/logging/logger';
import { ConsoleSink } from '@lib/logging/consoleSink';
import { LogLevel } from '@lib/logging/levels';

import { getProvider, hasProvider } from './providers';
import type { ArtworkTypeIDs } from './providers/base';

import { StatusBanner } from './ui/status_banner';
import USERSCRIPT_NAME from 'consts:userscript-name';
import DEBUG_MODE from 'consts:debug-mode';
import { InputForm } from './ui/main';
import type { FetchedImages } from './fetch';
import { ImageFetcher } from './fetch';
import { SeedParameters } from './seeding/parameters';
import { seederFactory } from './seeding';
import { enqueueImages, fillEditNote } from './form';
import { getURLsForRelease } from '@lib/MB/URLs';

class App {
    #note: EditNote;
    #fetcher: ImageFetcher;
    #ui: InputForm;

    constructor() {
        this.#note = EditNote.withFooterFromGMInfo();
        this.#fetcher = new ImageFetcher();

        const banner = new StatusBanner();
        LOGGER.addSink(banner);
        this.#ui = new InputForm(banner.htmlElement, this.processURL.bind(this));
    }

    async processURL(url: URL, types: ArtworkTypeIDs[] = [], comment = '', origin = ''): Promise<void> {
        // eslint-disable-next-line init-declarations
        let fetchResult: FetchedImages;
        try {
            fetchResult = await this.#fetcher.fetchImages(url);
        } catch (err) {
            LOGGER.error('Failed to grab images', err);
            return;
        }

        try {
            await enqueueImages(fetchResult, types, comment);
        } catch (err) {
            LOGGER.error('Failed to enqueue images', err);
            return;
        }

        fillEditNote(fetchResult, origin, this.#note);
        this.#ui.clearOldInputValue(url.href);
        LOGGER.success(`Successfully added ${fetchResult.images.length} image(s)`);
    }

    processSeedingParameters(): void {
        const params = SeedParameters.decode(new URLSearchParams(document.location.search));
        params.images.forEach((image) => this.processURL(image.url, image.types, image.comment, params.origin));
    }

    async addImportButtons(): Promise<void> {
        const mbid = location.href.match(/musicbrainz\.org\/release\/([a-f0-9-]+)\//)?.[1];
        assertHasValue(mbid);
        const attachedURLs = await getURLsForRelease(mbid, {
            excludeEnded: true,
            excludeDuplicates: true,
        });
        const supportedURLs = attachedURLs.filter(hasProvider);

        if (!supportedURLs.length) return;

        supportedURLs.forEach((url) => {
            const provider = getProvider(url);
            assertHasValue(provider);
            this.#ui.addImportButton(this.processURL.bind(this, url), url.href, provider);
        });
    }
}

LOGGER.configure({
    logLevel: DEBUG_MODE ? LogLevel.DEBUG : LogLevel.INFO,
});
LOGGER.addSink(new ConsoleSink(USERSCRIPT_NAME));

function runOnMB(): void {
    // Initialise the app, which will start listening for pasted URLs.
    // The only reason we're using an app here is so we can easily access the
    // UI and fetcher instances without having to pass them around as
    // parameters.
    const app = new App();

    app.processSeedingParameters();
    app.addImportButtons();
}

function runOnSeederPage(): void {
    const seeder = seederFactory(document.location);
    if (seeder) {
        seeder.insertSeedLinks();
    } else {
        LOGGER.error('Somehow I am running on a page I do not support…');
    }
}

if (document.location.hostname === 'musicbrainz.org' || document.location.hostname.endsWith('.musicbrainz.org')) {
    runOnMB();
} else {
    runOnSeederPage();
}