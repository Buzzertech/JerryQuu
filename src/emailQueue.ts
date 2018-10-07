import {  Transporter } from 'nodemailer';
import { IQueueOpts, Queue, IInternalComposedMessage } from './queue';

export interface IEmailQueueOpts extends IQueueOpts {
    transport: Transporter;
}

export class EmailQueue extends Queue {
    constructor(opts: IEmailQueueOpts) {
        super(opts);
    }

    private emailHandler(namespace: string, ctx: any): void {
        ctx.opts.redis.lrange(namespace, 0, -1, (error: any, messages: any) => {
            if (error) {
                throw error;
            }

            if (messages) {
                messages.forEach((composedMessage: string) => {
                    const composedMsg: IInternalComposedMessage = JSON.parse(composedMessage);
                    ctx.opts.transport.sendMail(composedMsg.message, (err: any, info: any) => {
                        if (err) {
                            if (composedMsg.maxRetries > 0) {
                                composedMsg.maxRetries--;
                                ctx.opts.redis.lpop(namespace);
                                ctx.opts.redis.rpush(namespace, JSON.stringify(composedMsg));
                            } else {
                                ctx.opts.redis.lpop(namespace);
                            }

                            return;
                        }
                        ctx.opts.redis.lpop(namespace);
                    });
                });
            }
        });
    }

    public registerNamespace(namespace: string, handler?: (namespace, ctx) => any): EmailQueue {
        let queueHandler = handler || this.emailHandler;
        return super.registerNamespace(namespace, queueHandler);
    }

}