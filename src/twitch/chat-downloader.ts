import {EventEmitter}                                       from 'events';
import {ensureDirectoryExists, logger, Video, VideoComment, videosPath, writeFile} from '..';
import {instance}                                           from './twitch';

export declare interface ChatDownloader {
    on(event: 'page-downloaded', listener: () => void): this;
}

export class ChatDownloader extends EventEmitter {
    private video: Video;
    private readonly comments: VideoComment[];

    constructor(video: Video) {
        super();

        this.video = video;
        this.comments = [];

        ensureDirectoryExists(videosPath());
    }

    async download(): Promise<VideoComment[]> {
        let cursor = undefined;

        logger.info(`Started downloading chat data from video ${this.video.id}`);
        do {
            logger.verbose(`Requesting comments from video ${this.video.id} with cursor ${cursor}`);
            const promise = instance().api().videoComments(this.video.id, {cursor});
            const request = await promise;

            // this.comments = [...this.comments, ...request.data.comments];
            for (const comment of request.data.comments) {
                this.comments.push(comment);
            }
            this.emit('page-downloaded');

            cursor = request.data._next;
        } while (cursor);

        logger.info(`Finished chat download from video ${this.video.id}, storing to disk...`);
        await writeFile(videosPath(`${this.video.id}.chat`), JSON.stringify(this.comments));
        logger.info(`Chat data from video ${this.video.id} stored to disk`);

        return this.comments;
    }
}
