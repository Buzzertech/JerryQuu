import { MailOptions } from 'nodemailer/lib/smtp-transport';
import Pubsub from './Pubsub';
import { Redis } from 'ioredis';

export interface IQueueOpts {
    /** A separate instance of redis to work with the queue */
    redis: Redis;
    /** A separate instance of redis to subscribe to events internally */
    subscriberRedis: any;
    /** Default retries is set to 4 */
    maxRetries?: number;
}

export type IQueueParam = MailOptions;

export interface IInternalComposedMessage {
    message: IQueueParam
    maxRetries: number;
}

export type QueueHandler<AdditionalOpts extends IQueueOpts> = (this: AdditionalOpts, namespace: string) => void;

export class Queue<Opts extends IQueueOpts = any> {
    protected opts: Opts;
    private namespace: string | null = null;

    constructor(opts: Opts) {
        this.opts = opts;

        if (typeof this.opts.redis === 'undefined') {
            throw new Error('Redis client not provided');
        }

        if (typeof this.opts.subscriberRedis === 'undefined') {
            throw new Error('Subscriber Redis Client not provided');
        }

        Pubsub.init(this.opts.subscriberRedis);
    }

    public async registerNamespace(namespace: string, handler: QueueHandler<any>): Promise<typeof Queue.prototype> {
        if (this.namespace && this.namespace.length > 0) {
            throw new Error('Cannot change namespace once initialized');
        }

        if (typeof namespace === 'undefined' || typeof namespace === null) {
            throw new Error('Namespace cannot be undefined or null');
        }

        if ((await this.opts.redis.exists(namespace)) > 0) {
            throw new Error(`Namespace - '${namespace}' is already declared`);
        }

        this.namespace = namespace;
        this.registerPollingBooth(this.namespace, handler);
        return this;
    }

    public pushMessage(message: IQueueParam): void {
        if (typeof message === 'undefined') {
            throw new Error('Message cannot be undefined or empty');
        }

        // Adds headers to this message
        const composedMessage: IInternalComposedMessage = {
            maxRetries: this.opts.maxRetries || 4,
            message
        }

        if (this.namespace !== null) {
            this.opts.redis.rpush(this.namespace, JSON.stringify(composedMessage));
        }
    }

    private registerPollingBooth(namespace: string, handler: QueueHandler<any>): void {
        Pubsub.subscribe(`__keyspace@0__:${namespace}`);

        Pubsub.on('message', (_channel: string, message: string) => {
            if (message === 'rpush') {
                handler(namespace);
            }
        });
    }
}