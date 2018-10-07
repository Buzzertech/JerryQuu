let subscriber: any;
let publisher: any;

export default new class PubSub {
    init (Subscriber: any, Publisher: any) {
        if (typeof Subscriber === undefined) {
            throw new Error ('Please provide a new redis instance for subscribe')
        }

        if (typeof Publisher === undefined) {
            throw new Error ('Please provide a new redis instance for publisher')
        }

        subscriber = Subscriber;
        publisher = Publisher;
    }

    publish(channel: string, message: string) {
        if (typeof publisher.publish === undefined) {
            throw new Error('The provided redis client doesn\'t supports publishing messages');
        }
        publisher.publish(channel, message);
    }

    subscribe(channel: string) {
        if (typeof publisher.subscribe === undefined) {
            throw new Error('The provided redis client doesn\'t supports subscribing to messages');
        }

        subscriber.subscribe(channel);
    }

    on(event: string, callback: Function) {
        subscriber.on(event, (channel: string, message: string) => {
            callback(channel, message);
        });
    }
}();