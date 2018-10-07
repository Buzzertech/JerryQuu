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

    beforeEach(function () {
        const transport = Nodemailer.createTransport({
            host: '127.0.0.1',
            port: '587'
        });

        testEmailQueue = new EmailQueue({
            redis,
            subscriberRedis,
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
                maxRetries: 2,
                transport: Nodemailer.createTransport({
                    host: '127.0.0.1',
                    port: '587'
                })
            });
        } catch (err) {
            expect(err.message).to.equal('Subscriber Redis Client not provided');
        }
    });

    it('throw an error if namespace not provided', () => {
        expect(() => testEmailQueue.registerNamespace()).to.throw('Namespace cannot be undefined or null');
    });

    it('throws an error if an empty message is pushed', () => {
        expect(() => testEmailQueue.pushMessage()).to.throw('Message cannot be undefined or empty');
    });

    it('throw an error if multiple namespace are tried to be registered for one instance', () => {
        testEmailQueue.registerNamespace('mytestqueue');
        expect(() => testEmailQueue.registerNamespace(null)).to.throw('Cannot change namespace once initialized')
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

    it('should retry if failed', () => {
        testEmailQueue.registerNamespace('RetryTest');
        testEmailQueue.pushMessage({
            to: 'test@buzzertech.com',
            from: 'checkflow@buzzertech.com',
            subject: 'Test Mail',
            html: '<html>Hello world</html>',
            text: 'Hello world'
        });
        Nodemailer.mock.shouldFailOnce();
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');

        return new Promise((resolve) => {
            setTimeout(() => {
                expect(Nodemailer.mock.sentMail().length).to.equal(1);
                resolve();
            }, 0);
        });
    });

    it('set custom maxRetries', () => {
        const emailQueue = new EmailQueue({
            maxRetries: 5,
            subscriberRedis: subscriberRedis,
            redis: redis,
            transport: Nodemailer.createTransport({
                host: '127.0.0.1',
                port: '587'
            })
        });

        emailQueue.registerNamespace('CustomRetryTest');
        emailQueue.pushMessage({
            to: 'test@buzzertech.com',
            from: 'checkflow@buzzertech.com',
            subject: 'Test Mail',
            html: '<html>Hello world</html>',
            text: 'Hello world'
        });
        Nodemailer.mock.shouldFail(true);
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');

        setTimeout(() => {
            Nodemailer.mock.shouldFail(false);
            subscriberRedis.on.callArgWith(1, 'mychannel', 'rpush');
        }, 0);

        return new Promise((resolve) => {
            setTimeout(() => {
                expect(Nodemailer.mock.sentMail().length).to.equal(1);
                resolve();
            }, 10);
        });
    });

    afterEach(() => {
        Nodemailer.mock.reset();
        redis.flushall();
    });
});
