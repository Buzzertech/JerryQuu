import { Transporter } from 'nodemailer';
import { IQueueOpts, Queue, IInternalComposedMessage, QueueHandler } from './queue';

export interface IEmailQueueOpts extends IQueueOpts {
    transport: Transporter;
}

export class EmailQueue extends Queue<IEmailQueueOpts> {
    constructor(opts: IEmailQueueOpts) {
        super(opts);
    }

    private emailHandler(namespace: string) {
        this.opts.redis.lrange(namespace, 0, -1, (error: Error, messages: string[]) => {
            if (error) {
                throw error;
            }

            if (messages) {
                messages.forEach(async (composedMessage: string) => {
                    const composedMsg: IInternalComposedMessage = JSON.parse(composedMessage);

                    try {
                        await this.opts.transport.sendMail(composedMsg.message);
                        await this.opts.redis.lpop(namespace);
                    } catch (err) {
                        if (err) {
                            this.opts.redis.lpop(namespace);

                            if (composedMsg.maxRetries > 0) {
                                composedMsg.maxRetries--;
                                await this.opts.redis.rpush(namespace, JSON.stringify(composedMsg));
                            }
                        }
                    }
                });
            }
        });
    }

    registerNamespace = (namespace: string, handler: QueueHandler<IEmailQueueOpts>) => {
        const queueHandler = handler || this.emailHandler;
        return super.registerNamespace(namespace, queueHandler);
    }
}