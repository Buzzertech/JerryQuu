import { MailOptions } from 'nodemailer/lib/smtp-transport';
import Pubsub from './Pubsub';

export interface IQueueOpts {
    /** A separate instance of redis to work with the queue */
    redis: any;
    /** A separate instance of redis to subscribe to events internally */
    subscriberRedis: any;
    /** Default retries is set to 4 */
    maxRetries?: number;
}

export type IQueueParam = string | MailOptions;

export interface IInternalComposedMessage {
    message: IQueueParam
    maxRetries: number;
}

export class Queue {
    private opts: IQueueOpts;
    private namespace: string;

    constructor(opts: IQueueOpts) {
        this.opts = opts;

        if (typeof this.opts.redis === undefined) {
            throw new Error('Redis client not provided');
        }

        if (typeof this.opts.subscriberRedis === undefined) {
            throw new Error('Subscriber Redis Client Not provided');
        }

        Pubsub.init(this.opts.subscriberRedis);
    }

    public registerNamespace(namespace: string, handler: (namespace:string, ctx: any) => any): any {
        if (typeof namespace === undefined) {
            throw new Error('Namespace cannot be undefined or null');
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

        this.opts.redis.rpush(this.namespace, JSON.stringify(composedMessage));
    }

    private registerPollingBooth(namespace: string, handler: (namespace: string, ctx: Queue) => any): void {
        Pubsub.subscribe(`__keyspace@0__:${namespace}`);

        Pubsub.on('message', (channel: string, message: string) => {
            if (message === 'rpush') {
                handler(namespace, this);
            }
        });
    }
}