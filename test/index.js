const EmailQueue = require('../dist/emailQueue').EmailQueue;
const Nodemailer = require('nodemailer-mock');
const expect = require('chai').expect;
const Redis = require('redis-mock');
const sinon = require('sinon');

describe('JerryQuu', () => {
    /**
     * @type {EmailQueue}
     */
    let testEmailQueue;
    const redis = Redis.createClient();
    const subscriberRedis = sinon.stub(Redis.createClient());
    const publisherRedis = Redis.createClient();


    beforeEach(function () {
        const transport = Nodemailer.createTransport({
            host: '127.0.0.1',
            port: '587'
        });

        testEmailQueue = new EmailQueue({
            redis,
            subscriberRedis,
            publisherRedis,
            maxRetries: 2,
            transport: transport
        });
    });

    it('throws an error if redis instance not passed during initialization', () => {
        try {
            new EmailQueue({
                maxRetries: 2,
                transport: Nodemailer.createTransport({
                    host: '127.0.0.1',
                    port: '587'
                })
            });
        } catch (err) {
            expect(err.message).to.equal('Redis client not provided');
        }
    });

    it('throws an error if subscriber redis instance not passed', () => {
        try {
            new EmailQueue({
                redis: redis,
                publisherRedis: Redis.createClient(),
                maxRetries: 2,
                transport: Nodemailer.createTransport({
                    host: '127.0.0.1',
                    port: '587'
                })
            });
        } catch (err) {
            expect(err.message).to.equal('Subscriber Redis Client Not Provided');
        }
    });

    it('throws an error if publisher redis instance not passed', () => {
        try {
            new EmailQueue({
                redis: redis,
                subscriberRedis: Redis.createClient(),
                maxRetries: 2,
                transport: Nodemailer.createTransport({
                    host: '127.0.0.1',
                    port: '587'
                })
            });
        } catch (err) {
            expect(err.message).to.equal('Publisher Redis Client Not Provided');
        }
    });

    it('throw an error if namespace not provided', () => {
        try {
            testEmailQueue.registerNamespace();
        } catch (err) {
            expect(err.message).to.equal('Namespace cannot be undefined or null');
        }
    });

    it('throws an error if an empty message is pushed', () => {
        try {
            testEmailQueue.pushMessage();
        } catch (err) {
            expect(err.message).to.equal('Message cannot be undefined or empty');
        }
    });

    it('can push a message', () => {
        testEmailQueue.registerNamespace('MYCOOLTEST');

        testEmailQueue.pushMessage({
            to: 'test@buzzertech.com',
            from: 'checkflow@buzzertech.com',
            subject: 'Test Mail',
            html: '<html>Hello world</html>',
            text: 'Hello world'
        });
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');

        return new Promise((resolve) => {
            setTimeout(() => {
                expect(Nodemailer.mock.sentMail().length).to.equal(1);
                resolve();
            }, 0);
        });
    });

    it('use a custom handler', () => {
        const handler = sinon.fake();

        testEmailQueue.registerNamespace('MYCOOLTEST', handler);

        testEmailQueue.pushMessage({
            to: 'test@buzzertech.com',
            from: 'checkflow@buzzertech.com',
            subject: 'Test Mail',
            html: '<html>Hello world</html>',
            text: 'Hello world'
        });

        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        return new Promise((resolve) => {
            setTimeout(() => {
                expect(handler.calledOnce).to.be.true;
                resolve();
            }, 0);
        });
    });

    afterEach(() => {
        Nodemailer.mock.reset();
        redis.flushall();
    });
});
