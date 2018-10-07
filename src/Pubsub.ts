let subscriber: any;

export default new class PubSub {
    init (Subscriber: any) {
        if (typeof Subscriber === undefined) {
            throw new Error ('Please provide a new redis instance for subscribe')
        }

        subscriber = Subscriber;
    }

    subscribe(channel: string) {
        if (typeof subscriber.subscribe === undefined) {
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